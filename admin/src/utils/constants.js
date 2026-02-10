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
    LOGIN: "/v1/auth/login",
    CHECK_EMAIL: "/v1/auth/check-email",
  },
  UPLOAD: {
    INVOICE: "/v1/upload",
  },
  USERS: {
    LIST: "/v1/users",
    TOGGLE_STATUS: "/v1/users/:id/toggle-status",
  },
  COMPRA: {
    CRIAR: "/v1/compra",
  },
  OCORRENCIA: {
    CRIAR: "/v1/ocorrencia",
  },
  PROPOSTA: {
    CRIAR: "/v1/proposta",
  },
  PRODUCTS: {
    LIST: "/v1/products",
    LIST_ALL: "/v1/products/all",
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
