import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token inválido ou expirado - limpa localStorage e redireciona
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

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
      const response = await api.post("/api/auth/login", {
        email,
        senha,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Verifica se um email existe
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkEmail(email) {
    try {
      const response = await api.post("/api/auth/check-email", { email });
      return response.data.exists;
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      return false;
    }
  },

  /**
   * Salva o usuário e token no localStorage
   * @param {Object} usuario
   * @param {string} token - Token JWT
   */
  saveUser(usuario, token) {
    localStorage.setItem("user", JSON.stringify(usuario));
    localStorage.setItem("token", token);
    localStorage.setItem("isAuthenticated", "true");
  },

  /**
   * Remove o usuário e token do localStorage
   */
  logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("isAuthenticated");
  },

  /**
   * Obtém o usuário do localStorage
   * @returns {Object|null}
   */
  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return localStorage.getItem("isAuthenticated") === "true";
  },
};

export default api;
