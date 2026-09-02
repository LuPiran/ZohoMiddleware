import { AsyncLocalStorage } from "node:async_hooks";
import axios from "axios";
import { ENV } from "../config/env.js";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_DELEGATED_SCOPE =
  ENV.GRAPH_DELEGATED_SCOPE ||
  "https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Sites.Read.All";
const GRAPH_APP_ID = "00000003-0000-0000-c000-000000000000";
const OBO_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";

const graphContext = new AsyncLocalStorage();
const oboCache = new Map();

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

function claimList(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function tokenClaims(payload) {
  if (!payload) return { aud: null, iss: null, tid: null, scp: null, oid: null };
  return {
    aud: claimList(payload.aud).join(",") || null,
    iss: payload.iss || null,
    tid: payload.tid || null,
    scp: payload.scp || payload.scope || null,
    oid: payload.oid || payload.sub || null,
    exp: payload.exp || null,
    appid: payload.appid || payload.azp || null,
  };
}

function isGraphAudience(aud) {
  return claimList(aud).some(
    (item) =>
      item === GRAPH_APP_ID ||
      item === "https://graph.microsoft.com" ||
      item === "https://graph.microsoft.com/",
  );
}

function isMicrosoftIssuer(iss) {
  const value = String(iss || "");
  return (
    value.includes("login.microsoftonline.com") ||
    value.includes("sts.windows.net")
  );
}

function typedError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function logTokenDecision(step, payload, extra = {}) {
  const failed = extra.ok === false;
  const line = ["[GRAPH]", step, { ...tokenClaims(payload), ...extra }];
  if (failed) console.error(...line);
  else console.info(...line);
}

async function exchangeOnBehalfOf(assertion, peeked) {
  const { tenantId, clientId, clientSecret } = getGraphFilesConfig();
  if (!clientId || !clientSecret) {
    throw typedError(
      "Este token não é do Graph. Para OBO configure GRAPH_FILES_CLIENT_ID e GRAPH_FILES_CLIENT_SECRET, ou reconecte a Microsoft pedindo Files.Read.All e Sites.Read.All.",
      401,
      "GRAPH_OBO_NOT_CONFIGURED",
    );
  }

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
    logTokenDecision("token OBO obtido", peeked, { expiresIn });
    return resolved;
  } catch (error) {
    if (error.status === 503 || error.code === "GRAPH_OBO_NOT_CONFIGURED") {
      throw error;
    }
    const description =
      error.response?.data?.error_description || error.message;
    const aad = String(description).match(/AADSTS\d+/)?.[0] || null;
    logTokenDecision("falha no OBO", peeked, {
      ok: false,
      http: error.response?.status || null,
      aad,
      error: error.response?.data?.error || null,
      description: String(description).slice(0, 400),
    });
    throw typedError(
      "Não foi possível obter acesso delegado ao SharePoint. Confira Files.Read.All e Sites.Read.All (delegadas) e o consentimento.",
      401,
      "GRAPH_OBO_FAILED",
    );
  }
}

function acceptGraphToken(token, payload) {
  const configuredTid =
    getGraphFilesConfig().tenantId || ENV.ENTRA_TENANT_ID || "";
  if (payload.tid && configuredTid && payload.tid !== configuredTid) {
    logTokenDecision("tid diferente do .env — Graph decide", payload, {
      configuredTid,
    });
  }
  logTokenDecision("token delegado encaminhado ao Graph", payload);
  return {
    accessToken: token,
    oid: payload.oid || payload.sub || "user",
    payload,
  };
}

/**
 * Não valida assinatura aqui: o Graph aceita ou recusa.
 * Só filtra JWT vazio, expirado ou que claramente não é Microsoft.
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
    console.error("[GRAPH] token delegado recusado", {
      ok: false,
      motivo: "não é JWT",
    });
    throw typedError(
      "Token Microsoft inválido.",
      401,
      "GRAPH_TOKEN_INVALID",
    );
  }

  const expMs = Number(peeked.exp || 0) * 1000;
  if (expMs && expMs + 60_000 < Date.now()) {
    logTokenDecision("token expirado", peeked, { ok: false });
    throw typedError(
      "Sessão Microsoft expirada. Conecte a conta novamente.",
      401,
      "GRAPH_TOKEN_EXPIRED",
    );
  }

  const { clientId } = getGraphFilesConfig();
  const spaId = ENV.ENTRA_CLIENT_ID;
  const middleAudiences = [clientId, spaId, clientId && `api://${clientId}`].filter(
    Boolean,
  );
  const auds = claimList(peeked.aud);
  const isMiddleTier = middleAudiences.some((id) => auds.includes(id));

  if (isMiddleTier && !isGraphAudience(peeked.aud)) {
    return exchangeOnBehalfOf(token, peeked);
  }

  if (isGraphAudience(peeked.aud) || isMicrosoftIssuer(peeked.iss)) {
    return acceptGraphToken(token, peeked);
  }

  logTokenDecision("audiência desconhecida", peeked, { ok: false });
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
