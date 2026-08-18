import axios from "axios";
import { ENV } from "../config/env.js";

const tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

function accountsUrl() {
  return (
    String(ENV.ZOHO_WORKDRIVE_ACCOUNTS_URL || ENV.ZOHO_ACCOUNTS_URL || "")
      .replace(/\/$/, "") || "https://accounts.zoho.com"
  );
}

export function isWorkDriveConfigured() {
  return Boolean(
    ENV.ZOHO_WORKDRIVE_CLIENT_ID &&
      ENV.ZOHO_WORKDRIVE_CLIENT_SECRET &&
      ENV.ZOHO_WORKDRIVE_FOLDER_ID,
  );
}

export async function getWorkDriveAccessToken() {
  if (!isWorkDriveConfigured()) {
    const err = new Error(
      "WorkDrive não configurado. Defina ZOHO_WORKDRIVE_CLIENT_ID, CLIENT_SECRET e FOLDER_ID.",
    );
    err.status = 503;
    err.code = "WORKDRIVE_NOT_CONFIGURED";
    throw err;
  }

  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const url = `${accountsUrl()}/oauth/v2/token`;
  const params = {
    client_id: ENV.ZOHO_WORKDRIVE_CLIENT_ID,
    client_secret: ENV.ZOHO_WORKDRIVE_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope:
      ENV.ZOHO_WORKDRIVE_SCOPE ||
      "WorkDrive.files.ALL,WorkDrive.organization.READ",
  };

  if (ENV.ZOHO_WORKDRIVE_SOID) {
    params.soid = ENV.ZOHO_WORKDRIVE_SOID;
  }

  try {
    const response = await axios.post(url, null, { params, timeout: 20000 });
    const accessToken = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in || 3600);
    if (!accessToken) {
      throw new Error("WorkDrive não retornou access_token");
    }
    tokenCache.accessToken = accessToken;
    tokenCache.expiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000;
    return accessToken;
  } catch (error) {
    console.error(
      "[WORKDRIVE AUTH] Falha ao obter token (client_credentials):",
      error.response?.data || error.message,
    );
    const zohoError = error.response?.data?.error;
    const hint =
      zohoError === "missing_org_info" || zohoError === "invalid_soid"
        ? " Defina ZOHO_WORKDRIVE_SOID no formato ZohoWorkDrive.{zsoid}."
        : "";
    const err = new Error(
      `Não foi possível autenticar no Zoho WorkDrive com client credentials.${hint}`,
    );
    err.status = 503;
    err.code = "WORKDRIVE_AUTH_FAILED";
    throw err;
  }
}
