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

function getRefreshToken() {
  return ENV.ZOHO_WORKDRIVE_REFRESH_TOKEN || ENV.ZOHO_REFRESH_TOKEN || null;
}

export function isWorkDriveConfigured() {
  return Boolean(
    ENV.ZOHO_WORKDRIVE_CLIENT_ID &&
      ENV.ZOHO_WORKDRIVE_CLIENT_SECRET &&
      getRefreshToken() &&
      ENV.ZOHO_WORKDRIVE_FOLDER_ID,
  );
}

export async function getWorkDriveAccessToken() {
  if (!isWorkDriveConfigured()) {
    const err = new Error(
      "WorkDrive não configurado. Defina ZOHO_WORKDRIVE_CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN e FOLDER_ID.",
    );
    err.status = 503;
    err.code = "WORKDRIVE_NOT_CONFIGURED";
    throw err;
  }

  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const url = `${accountsUrl()}/oauth/v2/token`;

  try {
    const response = await axios.post(url, null, {
      params: {
        refresh_token: getRefreshToken(),
        client_id: ENV.ZOHO_WORKDRIVE_CLIENT_ID,
        client_secret: ENV.ZOHO_WORKDRIVE_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
      timeout: 20000,
    });

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
      "[WORKDRIVE AUTH] Falha ao obter token (refresh_token):",
      error.response?.data || error.message,
    );
    const err = new Error(
      "Não foi possível autenticar no Zoho WorkDrive. Confira client, secret e refresh token com escopos WorkDrive.",
    );
    err.status = 503;
    err.code = "WORKDRIVE_AUTH_FAILED";
    throw err;
  }
}
