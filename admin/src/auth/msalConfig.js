import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
// Sempre usa a origem atual para o redirect bater com a porta do Vite (5173/5174/…).
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
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
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

export function getMsalInstance() {
  if (!msalInstance) {
    if (!clientId || !tenantId) {
      throw new Error(
        "Microsoft Entra ID não configurado no frontend (VITE_ENTRA_CLIENT_ID / VITE_ENTRA_TENANT_ID).",
      );
    }
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

export async function ensureMsalInitialized() {
  const instance = getMsalInstance();
  await instance.initialize();
  return instance;
}
