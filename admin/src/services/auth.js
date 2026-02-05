import api from "./api";
import { STORAGE_KEYS, API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço de autenticação
 */
export const authService = {
  /**
   * Faz login com email e senha
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
      // Preserva o objeto de erro completo para tratamento no componente
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
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
   * Obtém o storage correto baseado em "Manter conectado"
   * @returns {Storage} localStorage ou sessionStorage
   */
  getStorage() {
    const rememberMe =
      localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";
    return rememberMe ? localStorage : sessionStorage;
  },

  /**
   * Salva o usuário e token no storage apropriado
   * @param {Object} usuario
   * @param {string} token - Token JWT
   * @param {boolean} rememberMe - Se true, usa localStorage; se false, usa sessionStorage
   */
  saveUser(usuario, token, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;

    // Salva a preferência de "Manter conectado" no localStorage para persistir
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());

    // Salva os dados de autenticação no storage apropriado
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(usuario));
    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");

    // Se não for "Manter conectado", limpa o localStorage para evitar dados duplicados
    if (!rememberMe) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    }
  },

  /**
   * Remove o usuário e token de ambos os storages
   */
  logout() {
    // Limpa localStorage
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    // Limpa sessionStorage
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
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
    const storage = this.getStorage();
    return storage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true";
  },
};
