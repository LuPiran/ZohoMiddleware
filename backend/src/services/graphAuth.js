import { AsyncLocalStorage } from "node:async_hooks";
import axios from "axios";
import * as jose from "jose";
import { ENV } from "../config/env.js";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_DELEGATED_SCOPE =
  ENV.GRAPH_DELEGATED_SCOPE || "https://graph.microsoft.com/Sites.Read.All";
const GRAPH_APP_ID = "00000003-0000-0000-c000-000000000000";
const OBO_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";

const graphContext = new AsyncLocalStorage();
const oboCache = new Map();
let graphJwks = null;

export function getGraphFilesConfig() {
  const tenantId =
    ENV.GRAPH_FILES_TENANT_ID ||
    ENV.GRAPH_MAIL_TENANT_ID ||
    ENV.ENTRA_TENANT_ID ||
    "";
  const clientId = ENV.GRAPH_FILES_CLIENT_ID || ENV.GRAPH_MAIL_CLIENT_ID || "";
  const clientSecret =
    ENV.GRAPH_FILES_CLIENT_SECRET || ENV.GRAPH_MAIL_CLIENT_SECRET || "";

  return { tenantId, clientId, clientSecret };
}

export function isGraphFilesConfigured() {
  const { tenantId } = getGraphFilesConfig();
  return Boolean(tenantId || ENV.ENTRA_TENANT_ID);
}

export function enterGraphContext(store) {
  graphContext.enterWith(store);
}

export function runWithGraphContext(store, next) {
  return graphContext.run(store, next);
}

export function getGraphSubject() {
  return graphContext.getStore()?.oid || "anon";
}

function getGraphJwks(tenantId) {
  if (!graphJwks) {
    graphJwks = jose.createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      ),
    );
  }
  return graphJwks;
}

function peekPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function hasDelegatedSharePoint(payload) {
  const scp = String(payload?.scp || payload?.scope || "");
  return /\b(Sites\.Read\.All|Sites\.ReadWrite\.All|Files\.Read\.All|Files\.ReadWrite\.All|Sites\.Selected)\b/.test(
    scp,
  );
}

function isGraphAudience(aud) {
  const values = Array.isArray(aud) ? aud : [aud];
  return values.some(
    (item) =>
      item === GRAPH_APP_ID ||
      item === "https://graph.microsoft.com" ||
      item === "https://graph.microsoft.com/",
  );
}

function typedError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function verifyEntraJwt(token, audience) {
  const { tenantId } = getGraphFilesConfig();
  const tid = tenantId || ENV.ENTRA_TENANT_ID;
  if (!tid) {
    throw typedError(
      "Tenant Microsoft não configurado.",
      503,
      "GRAPH_NOT_CONFIGURED",
    );
  }

  const issuers = [
    `https://login.microsoftonline.com/${tid}/v2.0`,
    `https://sts.windows.net/${tid}/`,
  ];

  try {
    const { payload } = await jose.jwtVerify(token, getGraphJwks(tid), {
      issuer: issuers,
      audience,
      clockTolerance: 60,
    });
    if (payload.tid && payload.tid !== tid) {
      throw typedError(
        "Token Microsoft não pertence ao tenant da Central.",
        401,
        "GRAPH_TENANT_MISMATCH",
      );
    }
    return payload;
  } catch (error) {
    if (error.code && error.status) throw error;
    throw typedError(
      "Token Microsoft inválido ou expirado. Conecte a conta novamente.",
      401,
      "GRAPH_TOKEN_INVALID",
    );
  }
}

async function verifyGraphDelegatedToken(token) {
  const payload = await verifyEntraJwt(token, [
    GRAPH_APP_ID,
    "https://graph.microsoft.com",
    "https://graph.microsoft.com/",
  ]);
  if (!hasDelegatedSharePoint(payload)) {
    throw typedError(
      "Sua conta Microsoft não concedeu Sites.Read.All. Conecte de novo e aceite a permissão.",
      403,
      "GRAPH_SCOPE_MISSING",
    );
  }
  return {
    accessToken: token,
    oid: payload.oid || payload.sub || "user",
    payload,
  };
}

async function exchangeOnBehalfOf(assertion) {
  const { tenantId, clientId, clientSecret } = getGraphFilesConfig();
  if (!clientId || !clientSecret) {
    throw typedError(
      "OBO exige GRAPH_FILES_CLIENT_ID e GRAPH_FILES_CLIENT_SECRET no backend.",
      503,
      "GRAPH_OBO_NOT_CONFIGURED",
    );
  }

  const peeked = peekPayload(assertion) || {};
  const cacheKey = `${peeked.oid || peeked.sub || "user"}:${clientId}`;
  const cached = oboCache.get(cacheKey);
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return cached;
  }

  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: OBO_GRANT,
        requested_token_use: "on_behalf_of",
        assertion,
        scope: GRAPH_DELEGATED_SCOPE,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      },
    );

    const accessToken = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in || 3600);
    if (!accessToken) {
      throw new Error("Graph não retornou access_token no OBO");
    }

    const resolved = {
      accessToken,
      oid: peeked.oid || peeked.sub || "user",
      expiresAt: Date.now() + expiresIn * 1000,
    };
    oboCache.set(cacheKey, resolved);
    console.info("[GRAPH] token OBO obtido", {
      tenantId,
      clientId: `${clientId.slice(0, 8)}…`,
      oid: String(resolved.oid).slice(0, 8),
      expiresIn,
    });
    return resolved;
  } catch (error) {
    if (error.status === 503) throw error;
    const description =
      error.response?.data?.error_description || error.message;
    const aad = String(description).match(/AADSTS\d+/)?.[0] || null;
    console.error("[GRAPH] Falha no OBO", {
      http: error.response?.status || null,
      aad,
      error: error.response?.data?.error || null,
      description: description?.slice(0, 400),
    });
    throw typedError(
      "Não foi possível obter acesso delegado ao SharePoint. Confira Sites.Read.All (delegada) e o consentimento.",
      401,
      "GRAPH_OBO_FAILED",
    );
  }
}

/**
 * Aceita token Graph delegado (SPA) ou access token do app confidencial para OBO.
 */
export async function resolveDelegatedGraphToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) {
    throw typedError(
      "Conecte sua conta Microsoft para abrir a Central Comercial.",
      401,
      "GRAPH_DELEGATED_TOKEN_MISSING",
    );
  }

  const peeked = peekPayload(token);
  if (!peeked) {
    throw typedError(
      "Token Microsoft inválido.",
      401,
      "GRAPH_TOKEN_INVALID",
    );
  }

  if (isGraphAudience(peeked.aud)) {
    return verifyGraphDelegatedToken(token);
  }

  const { clientId } = getGraphFilesConfig();
  const spaId = ENV.ENTRA_CLIENT_ID;
  const middleAudiences = [clientId, spaId, `api://${clientId}`].filter(Boolean);

  if (middleAudiences.some((id) => peeked.aud === id || peeked.aud === `api://${id}`)) {
    const resolved = await exchangeOnBehalfOf(token);
    return resolved;
  }

  console.warn("[GRAPH] token sem audiência Graph/API conhecida", {
    aud: peeked.aud,
    appid: peeked.appid || peeked.azp || null,
  });
  throw typedError(
    "Este token Microsoft não serve para o SharePoint. Conecte a conta de novo na Central.",
    401,
    "GRAPH_TOKEN_WRONG_AUDIENCE",
  );
}

export async function getGraphAccessToken() {
  const store = graphContext.getStore();
  if (store?.accessToken) {
    return store.accessToken;
  }
  throw typedError(
    "Conecte sua conta Microsoft para abrir a Central Comercial.",
    401,
    "GRAPH_DELEGATED_TOKEN_MISSING",
  );
}

/** Mantido para o e-mail transacional (client credentials). Não usar na Central. */
export async function getGraphAppOnlyToken() {
  const { tenantId, clientId, clientSecret } = getGraphFilesConfig();
  if (!tenantId || !clientId || !clientSecret) {
    throw typedError(
      "Microsoft Graph (aplicativo) não configurado.",
      503,
      "GRAPH_NOT_CONFIGURED",
    );
  }

  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: GRAPH_SCOPE,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    },
  );
  const token = response.data?.access_token;
  if (!token) throw new Error("Graph não retornou access_token");
  return token;
}
