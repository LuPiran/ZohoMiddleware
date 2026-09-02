import axios from "axios";
import { ENV } from "../config/env.js";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

let cached = {
  token: null,
  expiresAt: 0,
};

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
  const { tenantId, clientId, clientSecret } = getGraphFilesConfig();
  return Boolean(tenantId && clientId && clientSecret);
}

export async function getGraphAccessToken() {
  if (!isGraphFilesConfigured()) {
    const err = new Error(
      "Microsoft Graph não configurado. Defina GRAPH_FILES_CLIENT_ID e GRAPH_FILES_CLIENT_SECRET (app confidencial com Sites.Read.All).",
    );
    err.status = 503;
    err.code = "GRAPH_NOT_CONFIGURED";
    throw err;
  }

  const now = Date.now();
  if (cached.token && cached.expiresAt - 60_000 > now) {
    return cached.token;
  }

  const { tenantId, clientId, clientSecret } = getGraphFilesConfig();

  try {
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
    const expiresIn = Number(response.data?.expires_in || 3600);
    if (!token) {
      throw new Error("Graph não retornou access_token");
    }

    cached = {
      token,
      expiresAt: now + expiresIn * 1000,
    };
    console.info("[GRAPH] token obtido", {
      tenantId,
      clientId: `${clientId.slice(0, 8)}…`,
      expiresIn,
    });
    return token;
  } catch (error) {
    if (error.status === 503) throw error;
    const description =
      error.response?.data?.error_description || error.message;
    const aad = String(description).match(/AADSTS\d+/)?.[0] || null;
    console.error("[GRAPH] Falha ao obter token", {
      http: error.response?.status || null,
      aad,
      error: error.response?.data?.error || null,
      description: description?.slice(0, 400),
      tenantId,
      clientId: `${clientId.slice(0, 8)}…`,
    });
    const err = new Error(
      "Não foi possível autenticar no Microsoft Graph. Verifique o app confidencial e as permissões Sites.Read.All.",
    );
    err.status = 503;
    err.code = "GRAPH_AUTH_FAILED";
    throw err;
  }
}
