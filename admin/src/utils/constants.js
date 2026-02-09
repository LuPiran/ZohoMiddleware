/**
 * Constantes da aplicação
 */

export const ROUTES = {
  LOGIN: "/",
  DASHBOARD: "/dashboard",
  USUARIOS: "/usuarios",
  RECOMPRA: "/recompra",
  COMPRA: "/compra",
  OCORRENCIA: "/ocorrencia",
  PROPOSTA: "/proposta",
  AGRADECIMENTO: "/agradecimento",
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    CHECK_EMAIL: "/api/auth/check-email",
  },
  UPLOAD: {
    INVOICE: "/api/upload",
  },
  USERS: {
    LIST: "/api/users",
    TOGGLE_STATUS: "/api/users/:id/toggle-status",
  },
  COMPRA: {
    CRIAR: "/api/compra",
  },
  OCORRENCIA: {
    CRIAR: "/api/ocorrencia",
  },
  PROPOSTA: {
    CRIAR: "/api/proposta",
  },
  PRODUCTS: {
    LIST: "/api/products",
    LIST_ALL: "/api/products/all",
  },
};

export const STORAGE_KEYS = {
  USER: "user",
  TOKEN: "token",
  IS_AUTHENTICATED: "isAuthenticated",
  REMEMBER_ME: "rememberMe",
  LOGOUT_SUCCESS: "logoutSuccess",
  ACCOUNT_INACTIVE: "accountInactive",
  LOGIN_SUCCESS: "loginSuccess",
};
