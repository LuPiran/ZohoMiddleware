/**
 * Constantes da aplicação
 */

export const ROUTES = {
  LOGIN: "/",
  MFA: "/2fa",
  DASHBOARD: "/dashboard",
  PLATFORM_UPDATES: "/atualizacoes-plataforma",
  USUARIOS: "/usuarios",
  EQUIPES: "/equipes",
  RECOMPRA: "/recompra",
  COMPRA: "/compra",
  OCORRENCIA: "/ocorrencia",
  PROPOSTA: "/proposta",
  FAQ: "/faq",
  MANUAL: "/manual",
  AGRADECIMENTO: "/agradecimento",
  SAVED_FORMS: "/formularios-salvos",
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/v1/auth/login",
  },
  UPLOAD: {
    INVOICE: "/v1/upload",
  },
  USERS: {
    LIST: "/v1/users",
    CREATE: "/v1/users",
    TOGGLE_STATUS: "/v1/users/:id/toggle-status",
  },
  TEAMS: {
    LIST: "/v1/teams",
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
  MFA_PENDING: "mfaPending",
  MFA_PENDING_EMAIL: "mfaPendingEmail",
  MFA_PENDING_USER: "mfaPendingUser",
  MFA_PENDING_REMEMBER: "mfaPendingRemember",
  // Controle local para evitar reenviar OTP em excesso (rate limit)
  MFA_LAST_OTP_SENT_AT: "mfaLastOtpSentAt",
  MFA_LAST_OTP_EMAIL: "mfaLastOtpEmail",
  LOGOUT_SUCCESS: "logoutSuccess",
  ACCOUNT_INACTIVE: "accountInactive",
  LOGIN_SUCCESS: "loginSuccess",
  PLATFORM_UPDATE_SEEN: "platformUpdateSeen",
};

export const PLATFORM_UPDATE_VERSION = "2026-03-25.4";

// Parceiro: usuários que veem a seção e opções por usuário
export const PARCEIRO = {
  USUARIOS_PERMITIDOS: ["Marcelli Silva", "Diego Betti"],
  OPCOES_MARCELLI_SILVA: [
    { value: "Equilibra", label: "Equilibra" },
    { value: "TonTon", label: "TonTon" },
    { value: "Gravital", label: "Gravital" },
    { value: "Natural Science", label: "Natural Science" },
  ],
  OPCOES_DIEGO_BETTI: [
    { value: "Cannabis em Foco", label: "Cannabis em Foco" },
  ],
};

/**
 * Retorna o nome do usuário logado (qualquer variação de campo).
 */
export function getNomeUsuario(user) {
  return (
    user?.nome ||
    user?.Nome ||
    user?.Name ||
    user?.nome_completo ||
    user?.Nome_Completo ||
    ""
  ).trim();
}

export function getPlatformUpdateStorageKey(user) {
  const rawIdentifier =
    user?.email ||
    user?.Email ||
    user?.id ||
    user?.ID ||
    getNomeUsuario(user) ||
    "global";

  const normalizedIdentifier = String(rawIdentifier)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return `${STORAGE_KEYS.PLATFORM_UPDATE_SEEN}:${PLATFORM_UPDATE_VERSION}:${normalizedIdentifier}`;
}

/**
 * Retorna true se o usuário pode ver a seção Parceiro.
 */
export function podeVerSecaoParceiro(user) {
  const nome = getNomeUsuario(user);
  return PARCEIRO.USUARIOS_PERMITIDOS.includes(nome);
}

/**
 * Retorna as opções do select Parceiro para o usuário logado.
 */
export function getOpcoesParceiro(user) {
  const nome = getNomeUsuario(user);
  if (nome === "Marcelli Silva") return PARCEIRO.OPCOES_MARCELLI_SILVA;
  if (nome === "Diego Betti") return PARCEIRO.OPCOES_DIEGO_BETTI;
  return [];
}
