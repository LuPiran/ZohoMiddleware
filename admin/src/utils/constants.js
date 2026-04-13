/**
 * Constantes da aplicação
 */

export const ROUTES = {
  LOGIN: "/",
  DASHBOARD: "/dashboard",
  PLATFORM_UPDATES: "/atualizacoes-plataforma",
  USUARIOS: "/usuarios",
  RECOMPRA: "/recompra",
  COMPRA: "/compra",
  OCORRENCIA: "/ocorrencia",
  PROPOSTA: "/proposta",
  FAQ: "/faq",
  MANUAL: "/manual",
  AGRADECIMENTO: "/agradecimento",
  SAVED_FORMS: "/formularios-salvos",
};

export const EXTERNAL_LINKS = {
  TRACKING_PEDIDO: "https://rastreamentodepedido.tegrapharma.com/login",
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
  PLATFORM_UPDATE_SEEN: "platformUpdateSeen",
};

export const PLATFORM_UPDATE_VERSION = "2026-04-13.1";

function getCampoUsuarioPorChaves(user, chavesPreferenciais = []) {
  if (!user || typeof user !== "object") return null;

  for (const chave of chavesPreferenciais) {
    if (user[chave] !== undefined && user[chave] !== null) {
      return user[chave];
    }
  }

  const entries = Object.entries(user);

  // Tenta achar chaves equivalentes ignorando caixa e caracteres não alfanuméricos
  const normalizarChave = (chave) =>
    String(chave || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const normalizadasPreferenciais = chavesPreferenciais.map(normalizarChave);

  for (const [chave, valor] of entries) {
    const chaveNormalizada = normalizarChave(chave);
    if (normalizadasPreferenciais.includes(chaveNormalizada)) {
      return valor;
    }
  }

  return null;
}

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

export function podeVerTrackingPedido(user) {
  const emailNormalizado = String(user?.email || user?.Email || "")
    .toLowerCase()
    .trim();

  return [
    "luis.otavio@tegrapharma.com",
    "marcelli.nascimento@tegrapharma.com",
    "ricardo.depaula@tegrapharma.com",
  ].includes(emailNormalizado);
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
 * Normaliza o campo booleano Parceria do usuário vindo do CRM.
 */
function temParceriaHabilitada(user) {
  const bruto = getCampoUsuarioPorChaves(user, [
    "Parceria",
    "parceria",
    "Tem_Parceria",
    "tem_parceria",
    "Possui_Parceria",
    "possui_parceria",
  ]);

  if (typeof bruto === "boolean") return bruto;
  if (typeof bruto === "number") return bruto === 1;

  if (typeof bruto === "object" && bruto !== null) {
    const valorObj =
      bruto.value ?? bruto.label ?? bruto.name ?? bruto.nome ?? "";
    const normalizadoObj = String(valorObj).trim().toLowerCase();
    return ["true", "1", "sim", "yes", "y", "on", "checked", "✓", "✔", "☑"].includes(
      normalizadoObj
    );
  }

  const valor = String(bruto || "")
    .trim()
    .toLowerCase();

  return ["true", "1", "sim", "yes", "y", "on", "checked", "✓", "✔", "☑"].includes(valor);
}

/**
 * Normaliza o campo Parcerias do usuário vindo do CRM.
 * Aceita string (separada por ; ou ,), array de strings/objetos ou lookup único.
 */
function extrairParcerias(user) {
  const bruto = getCampoUsuarioPorChaves(user, [
    "Parcerias",
    "parcerias",
    "Parceiro",
    "parceiro",
    "Parceiros",
    "parceiros",
    "Lista_Parcerias",
    "lista_parcerias",
  ]);
  if (!bruto) return [];

  if (Array.isArray(bruto)) {
    return bruto
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item.trim();
        if (typeof item === "object") {
          return String(item.name || item.nome || item.value || item.label || "").trim();
        }
        return String(item).trim();
      })
      .filter(Boolean);
  }

  if (typeof bruto === "object") {
    const unico = String(
      bruto.name || bruto.nome || bruto.value || bruto.label || ""
    ).trim();
    return unico ? [unico] : [];
  }

  return String(bruto)
    .split(/[;,\n]/)
    .map((valor) => valor.trim())
    .filter(Boolean);
}

/**
 * Retorna as opções do select Parceiro para o usuário logado.
 */
export function getOpcoesParceiro(user) {
  const parcerias = extrairParcerias(user);
  if (!temParceriaHabilitada(user) || parcerias.length === 0) {
    return [];
  }

  const unicas = [...new Set(parcerias)];
  return unicas.map((parceria) => ({
    value: parceria,
    label: parceria,
  }));
}

/**
 * Retorna true se o usuário pode ver a seção Parceiro.
 */
export function podeVerSecaoParceiro(user) {
  return temParceriaHabilitada(user) && getOpcoesParceiro(user).length > 0;
}
