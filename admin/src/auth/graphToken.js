import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { ensureMsalInitialized, graphTokenRequest, loginRequest } from "./msalConfig";

let memory = {
  token: null,
  expiresAt: 0,
};

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

/**
 * Obtém access token delegado do Graph (Sites.Read.All).
 * Não chama o Graph no browser — só o token, enviado ao backend.
 */
export async function acquireGraphAccessToken({ interactive = false } = {}) {
  const cached = getCachedGraphToken();
  if (cached) return cached;

  const msal = await ensureMsalInitialized();
  const account = msal.getAllAccounts()[0] || null;

  if (!account) {
    if (!interactive) return null;
    const result = await msal.loginPopup({
      ...loginRequest,
      scopes: [...loginRequest.scopes, ...graphTokenRequest.scopes],
    });
    const followUp = await msal.acquireTokenSilent({
      ...graphTokenRequest,
      account: result.account,
    });
    return cacheToken(followUp);
  }

  try {
    const result = await msal.acquireTokenSilent({
      ...graphTokenRequest,
      account,
    });
    return cacheToken(result);
  } catch (error) {
    if (!interactive) return null;
    if (
      error instanceof InteractionRequiredAuthError ||
      error?.errorCode === "interaction_required" ||
      error?.name === "InteractionRequiredAuthError"
    ) {
      const result = await msal.acquireTokenPopup({
        ...graphTokenRequest,
        account,
      });
      return cacheToken(result);
    }
    throw error;
  }
}
