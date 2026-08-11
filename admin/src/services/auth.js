import api from "./api";
import { STORAGE_KEYS, API_ENDPOINTS } from "../utils/constants";
import {
  ensureMsalInitialized,
  loginRequest,
} from "../auth/msalConfig";

/** Evita trocar o mesmo idToken duas vezes (React Strict Mode / double mount). */
const microsoftExchangeInFlight = new Map();
/** Uma única execução de handleRedirectPromise por carga da página. */
let microsoftRedirectPromise = null;

/**
 * Serviço de autenticação
 */
export const authService = {
  /**
   * Retorna o storage que possui sessão de autenticação válida.
   * Prioriza sessionStorage para sessão atual; cai para localStorage.
   * @returns {Storage}
   */
  resolveAuthStorage() {
    const sessionHasAuth =
      sessionStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true" &&
      !!sessionStorage.getItem(STORAGE_KEYS.TOKEN) &&
      !!sessionStorage.getItem(STORAGE_KEYS.USER);

    if (sessionHasAuth) {
      return sessionStorage;
    }

    return localStorage;
  },

  /**
   * Faz login com email e senha (Zoho)
   * @param {string} email
   * @param {string} senha
   * @returns {Promise<Object>}
   */
  async login(email, senha) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        senha,
      });
      return response.data;
    } catch (error) {
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        silent: error.silent,
      };
      throw errorData;
    }
  },

  /**
   * Verifica se um email existe
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkEmail(email) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.CHECK_EMAIL, {
        email,
      });
      return response.data.exists;
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      return false;
    }
  },

  /**
   * Troca o ID token Microsoft pelo JWT + usuário Zoho do portal.
   * Deduplica chamadas paralelas com o mesmo token.
   * @param {string} idToken
   * @returns {Promise<Object>}
   */
  async exchangeMicrosoftToken(idToken) {
    const key = String(idToken || "").slice(0, 80);
    if (key && microsoftExchangeInFlight.has(key)) {
      return microsoftExchangeInFlight.get(key);
    }

    const tarefa = (async () => {
      try {
        const response = await api.post(API_ENDPOINTS.AUTH.MICROSOFT, {
          idToken,
        });
        return response.data;
      } catch (error) {
        const errorData = {
          error: error.response?.data?.error || error.message,
          message: error.message,
          response: error.response,
          status: error.response?.status,
          silent: error.silent,
        };
        throw errorData;
      }
    })();

    if (key) {
      microsoftExchangeInFlight.set(key, tarefa);
    }

    try {
      return await tarefa;
    } finally {
      if (key) {
        microsoftExchangeInFlight.delete(key);
      }
    }
  },

  /**
   * Extrai o ID token de um resultado MSAL.
   * @param {import("@azure/msal-browser").AuthenticationResult|null} result
   * @returns {string|null}
   */
  extractIdToken(result) {
    if (!result) return null;
    return result.idToken || null;
  },

  /**
   * Inicia login Microsoft via redirect (PKCE).
   * @returns {Promise<void>}
   */
  async loginWithMicrosoftRedirect() {
    const msal = await ensureMsalInitialized();
    await msal.loginRedirect(loginRequest);
  },

  /**
   * Processa retorno do redirect Microsoft, se houver.
   * Single-flight: chamadas paralelas compartilham a mesma Promise.
   * @returns {Promise<Object|null>} resposta do backend ou null se não houve callback
   */
  async handleMicrosoftRedirect() {
    if (!microsoftRedirectPromise) {
      microsoftRedirectPromise = (async () => {
        const msal = await ensureMsalInitialized();
        const result = await msal.handleRedirectPromise();
        const idToken = this.extractIdToken(result);
        if (!idToken) {
          return null;
        }
        return this.exchangeMicrosoftToken(idToken);
      })().finally(() => {
        // Mantém o resultado em cache curto; libera para novos logins depois
        setTimeout(() => {
          microsoftRedirectPromise = null;
        }, 5000);
      });
    }

    return microsoftRedirectPromise;
  },

  /**
   * Login Microsoft via popup (fallback).
   * @returns {Promise<Object>}
   */
  async loginWithMicrosoftPopup() {
    const msal = await ensureMsalInitialized();
    const result = await msal.loginPopup(loginRequest);
    const idToken = this.extractIdToken(result);
    if (!idToken) {
      throw {
        error: "Microsoft não retornou ID token",
        status: 401,
      };
    }
    return this.exchangeMicrosoftToken(idToken);
  },

  /**
   * Obtém o storage correto baseado em "Manter conectado"
   * @returns {Storage} localStorage ou sessionStorage
   */
  getStorage() {
    return this.resolveAuthStorage();
  },

  /**
   * Salva o usuário e token no storage apropriado
   * @param {Object} usuario
   * @param {string} token - Token JWT
   * @param {boolean} rememberMe - Se true, usa localStorage; se false, usa sessionStorage
   */
  saveUser(usuario, token, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;

    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());

    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(usuario));
    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");

    if (!rememberMe) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    }
  },

  /**
   * Remove o usuário e token de ambos os storages e encerra sessão MSAL do app.
   */
  async logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);

    try {
      const msal = await ensureMsalInitialized();
      await msal.clearCache();
    } catch (error) {
      console.warn("[AUTH] Logout Microsoft ignorado:", error?.message || error);
    }
  },

  /**
   * Obtém o usuário do storage apropriado
   * @returns {Object|null}
   */
  getUser() {
    const storage = this.getStorage();
    const user = storage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const localStorageAuth =
      localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true";
    const sessionStorageAuth =
      sessionStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true";

    const hasToken =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const hasUser =
      localStorage.getItem(STORAGE_KEYS.USER) ||
      sessionStorage.getItem(STORAGE_KEYS.USER);

    return (localStorageAuth || sessionStorageAuth) && hasToken && hasUser;
  },
};
