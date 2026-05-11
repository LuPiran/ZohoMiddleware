import axios from "axios";
import { STORAGE_KEYS, ROUTES } from "../utils/constants";
import { supabase } from "./supabaseClient";

const envApiBaseUrl = (import.meta.env.VITE_API_URL || "").trim();
const appHost = typeof window !== "undefined" ? window.location.hostname : "";
const isAppOnLocalhost = appHost === "localhost" || appHost === "127.0.0.1";
const isEnvPointingToLocalhost = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
  envApiBaseUrl,
);

// If the app is opened from LAN IP on mobile, ignore localhost API URL and use same-origin.
const API_BASE_URL = !isAppOnLocalhost && isEnvPointingToLocalhost ? "" : envApiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Função auxiliar para obter o token do storage correto
function getToken() {
  const sessionToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  if (sessionToken) {
    return sessionToken;
  }

  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

// Interceptor para adicionar token JWT em todas as requisições
async function getAccessToken() {
  // Preferimos o token atual da sessão do Supabase, pois o client pode
  // fazer refresh automático e o token salvo em STORAGE_KEYS.TOKEN pode ficar desatualizado.
  try {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data?.session?.access_token;
    return sessionToken || getToken();
  } catch {
    // Fallback caso a sessão não esteja disponível ainda.
    return getToken();
  }
}

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Não redireciona se o erro for da rota de login (permite tratamento no componente)
    const isLoginRoute = error.config?.url?.includes("/v1/auth/login");
    const isInactiveAccount =
      error.response?.status === 403 &&
      isLoginRoute &&
      (error.response?.data?.error?.includes("inativo") ||
        error.response?.data?.error?.includes("inativa"));

    // Para erro 403 de conta inativa, marca como silencioso para evitar logs
    if (isInactiveAccount) {
      // Adiciona flag para indicar que é um erro tratado e não deve ser logado
      error.silent = true;
      error._suppressConsoleLog = true;
    }

    const method = error.config?.method?.toLowerCase() || "";
    const url = error.config?.url || "";
    const isUsersMutateRequest =
      (method === "post" || method === "patch") &&
      (url.includes("/v1/users") || url.includes("v1/users"));

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !isLoginRoute
    ) {
      // Em criar/editar usuário, não forçamos logout/redirect em 401/403 (ex.: permissão).
      if (!isUsersMutateRequest) {
        // Token inválido ou expirado - limpa ambos os storages e redireciona
        // Apenas se NÃO for uma tentativa de login
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
        window.location.href = ROUTES.LOGIN;
      }
    }
    return Promise.reject(error);
  },
);

// Este arquivo contém apenas a configuração base do axios
// Os serviços específicos estão em:
// - services/auth.js - Serviços de autenticação
// - services/upload.js - Serviços de upload

export default api;
