import axios from "axios";
import { STORAGE_KEYS, ROUTES } from "../utils/constants";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Função auxiliar para obter o token do storage correto
function getToken() {
  const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";
  const storage = rememberMe ? localStorage : sessionStorage;
  return storage.getItem(STORAGE_KEYS.TOKEN);
}

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
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

    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !isLoginRoute
    ) {
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
    return Promise.reject(error);
  },
);

// Este arquivo contém apenas a configuração base do axios
// Os serviços específicos estão em:
// - services/auth.js - Serviços de autenticação
// - services/upload.js - Serviços de upload

export default api;
