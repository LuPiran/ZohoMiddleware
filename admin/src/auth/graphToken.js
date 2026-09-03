import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { STORAGE_KEYS } from "../utils/constants";
import {
  ensureMsalInitialized,
  getActiveMsalAccount,
  graphTokenRequest,
  loginRequest,
} from "./msalConfig";

let memory = {
  token: null,
  expiresAt: 0,
};
let inFlight = null;

function cacheToken(result) {
  if (!result?.accessToken) return null;
  const expiresAt =
    result.expiresOn instanceof Date
      ? result.expiresOn.getTime()
      : Date.now() + 50 * 60 * 1000;
  memory = { token: result.accessToken, expiresAt };
  return result.accessToken;
}

export function getCachedGraphToken() {
  if (memory.token && memory.expiresAt - 60_000 > Date.now()) {
    return memory.token;
  }
  return null;
}

export function clearCachedGraphToken() {
  memory = { token: null, expiresAt: 0 };
}

function portalLoginHint() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEYS.USER) ||
      sessionStorage.getItem(STORAGE_KEYS.USER);
    const user = raw ? JSON.parse(raw) : null;
    return (
      user?.email ||
      user?.Email ||
      user?.mail ||
      user?.userPrincipalName ||
      ""
    );
  } catch {
    return "";
  }
}

function isInteractionRequired(error) {
  return (
    error instanceof InteractionRequiredAuthError ||
    error?.errorCode === "interaction_required" ||
    error?.errorCode === "login_required" ||
    error?.errorCode === "consent_required" ||
    error?.name === "InteractionRequiredAuthError"
  );
}

async function trySilent(msal, account) {
  if (account) {
    try {
      const result = await msal.acquireTokenSilent({
        ...graphTokenRequest,
        account,
      });
      msal.setActiveAccount(result.account || account);
      return cacheToken(result);
    } catch (error) {
      if (!isInteractionRequired(error)) {
        console.warn("[CENTRAL] acquireTokenSilent:", error?.message || error);
      }
    }
  }

  const hint = portalLoginHint();
  try {
    const result = await msal.ssoSilent({
      ...graphTokenRequest,
      ...(hint ? { loginHint: hint } : {}),
    });
    if (result?.account) msal.setActiveAccount(result.account);
    return cacheToken(result);
  } catch {
    return null;
  }
}

async function acquireUncached({ interactive = false } = {}) {
  const cached = getCachedGraphToken();
  if (cached) return cached;

  const msal = await ensureMsalInitialized();
  const account = getActiveMsalAccount(msal);
  const silent = await trySilent(msal, account);
  if (silent) return silent;
  if (!interactive) return null;

  if (account) {
    const result = await msal.acquireTokenPopup({
      ...graphTokenRequest,
      account,
    });
    msal.setActiveAccount(result.account || account);
    return cacheToken(result);
  }

  const result = await msal.loginPopup({
    ...loginRequest,
    scopes: [...loginRequest.scopes, ...graphTokenRequest.scopes],
  });
  if (result?.account) msal.setActiveAccount(result.account);
  const followUp = await msal.acquireTokenSilent({
    ...graphTokenRequest,
    account: result.account,
  });
  return cacheToken(followUp);
}

/**
 * Access token delegado do Graph. Nunca chama o Graph no browser.
 */
export async function acquireGraphAccessToken(options = {}) {
  const cached = getCachedGraphToken();
  if (cached && !options.interactive) return cached;
  if (inFlight) return inFlight;
  inFlight = acquireUncached(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
