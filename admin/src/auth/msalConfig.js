import {
  BrowserCacheLocation,
  PublicClientApplication,
  LogLevel,
} from "@azure/msal-browser";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
const redirectUri =
  typeof window !== "undefined"
    ? window.location.origin
    : import.meta.env.VITE_ENTRA_REDIRECT_URI;

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) {
          console.error("[MSAL]", message);
        }
      },
    },
  },
};

const graphOboScope = (import.meta.env.VITE_GRAPH_OBO_SCOPE || "").trim();
export const graphTokenRequest = {
  scopes: graphOboScope
    ? [graphOboScope]
    : ["Files.Read.All", "Sites.Read.All"],
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", ...graphTokenRequest.scopes],
};

let msalInstance = null;
let initPromise = null;
let redirectResultPromise = null;

function migrateSessionMsalCache() {
  if (typeof window === "undefined") return;
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.toLowerCase().includes("msal")) continue;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, sessionStorage.getItem(key) || "");
      }
    }
  } catch {
    /* storage indisponível */
  }
}

export function getMsalInstance() {
  if (!msalInstance) {
    if (!clientId || !tenantId) {
      throw new Error(
        "Microsoft Entra ID não configurado no frontend (VITE_ENTRA_CLIENT_ID / VITE_ENTRA_TENANT_ID).",
      );
    }
    migrateSessionMsalCache();
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

function activateAccount(instance, preferred) {
  const account =
    preferred || instance.getActiveAccount() || instance.getAllAccounts()[0] || null;
  if (account) instance.setActiveAccount(account);
  return account;
}

export async function ensureMsalInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      const instance = getMsalInstance();
      await instance.initialize();
      if (!redirectResultPromise) {
        redirectResultPromise = instance.handleRedirectPromise().catch((error) => {
          console.warn("[MSAL] redirect:", error?.message || error);
          return null;
        });
      }
      const redirect = await redirectResultPromise;
      activateAccount(instance, redirect?.account || null);
      return instance;
    })();
  }
  return initPromise;
}

export async function getMsalRedirectResult() {
  await ensureMsalInitialized();
  return redirectResultPromise;
}

export function getActiveMsalAccount(instance) {
  return (
    instance?.getActiveAccount() || instance?.getAllAccounts()?.[0] || null
  );
}
