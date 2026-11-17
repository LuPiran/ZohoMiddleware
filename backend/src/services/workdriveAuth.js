import axios from "axios";
import { ENV } from "../config/env.js";

const tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

// Evita várias renovações simultâneas e respeita o bloqueio do Zoho
// ("too many requests") por um tempo, em vez de insistir e piorar o pico.
let refreshInFlight = null;
let cooldownUntil = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

export function invalidateWorkDriveToken() {
  tokenCache.accessToken = null;
  tokenCache.expiresAt = 0;
}

function isRateLimitError(data) {
  const text = JSON.stringify(data || "").toLowerCase();
  return text.includes("too many requests") || text.includes("access denied");
}

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

  if (Date.now() < cooldownUntil) {
    const err = new Error(
      "Zoho WorkDrive limitou as renovações de token; tente novamente em instantes.",
    );
    err.status = 503;
    err.code = "WORKDRIVE_RATE_LIMITED";
    throw err;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshWorkDriveToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function refreshWorkDriveToken() {
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
    if (isRateLimitError(error.response?.data)) {
      cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    }
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
