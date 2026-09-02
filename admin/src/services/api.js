import axios from "axios";
import { STORAGE_KEYS, ROUTES } from "../utils/constants";
import { acquireGraphAccessToken } from "../auth/graphToken";

const envApiBaseUrl = (import.meta.env.VITE_API_URL || "").trim();
const appHost = typeof window !== "undefined" ? window.location.hostname : "";
const isAppOnLocalhost = appHost === "localhost" || appHost === "127.0.0.1";
const isEnvPointingToLocalhost = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
  envApiBaseUrl,
);

const API_BASE_URL = !isAppOnLocalhost && isEnvPointingToLocalhost ? "" : envApiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function getToken() {
  const sessionToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  if (sessionToken) {
    return sessionToken;
  }

  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function isCentralComercialRequest(config) {
  const url = `${config?.baseURL || ""}${config?.url || ""}`;
  return url.includes("/v1/central-comercial");
}

api.interceptors.request.use(
  async (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (isCentralComercialRequest(config)) {
      try {
        const graphToken = await acquireGraphAccessToken({ interactive: false });
        if (graphToken) {
          config.headers["X-Graph-Token"] = graphToken;
        }
      } catch (error) {
        console.warn("[CENTRAL] token Graph silencioso indisponível:", error?.message || error);
      }
    }
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRoute =
      error.config?.url?.includes("/v1/auth/login") ||
      error.config?.url?.includes("/v1/auth/microsoft");
    const isCentralRoute = isCentralComercialRequest(error.config || {});
    const isInactiveAccount =
      error.response?.status === 403 &&
      isLoginRoute &&
      (error.response?.data?.error?.includes("inativo") ||
        error.response?.data?.error?.includes("inativa"));

    if (isInactiveAccount) {
      error.silent = true;
      error._suppressConsoleLog = true;
    }

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !isLoginRoute &&
      !isCentralRoute
    ) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
      window.location.href = ROUTES.LOGIN;
    }
    return Promise.reject(error);
  },
);

export default api;
