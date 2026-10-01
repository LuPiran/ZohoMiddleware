import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço para gerenciar usuários
 */
export const usersService = {
  /**
   * Busca lista de usuários com paginação e busca
   * @param {Object} params - Parâmetros de busca
   * @param {number} params.page - Página atual (padrão: 1)
   * @param {number} params.perPage - Itens por página (padrão: 10)
   * @param {string} params.search - Termo de busca (opcional)
   * @returns {Promise<Object>}
   */
  async getUsers({ page = 1, perPage = 10, search = "", all = false } = {}) {
    try {
      const params = new URLSearchParams();
      if (all) params.append("all", "1");
      if (page) params.append("page", page);
      if (perPage) params.append("per_page", perPage);
      if (search) params.append("search", search);

      const response = await api.get(
        `${API_ENDPOINTS.USERS.LIST}?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
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
   * Alterna o status do usuário (ativo/inativo)
   * @param {string} userId - ID do usuário
   * @param {boolean} currentStatus - Status atual do usuário
   * @returns {Promise<Object>}
   */
  async createUser(dados) {
    try {
      const response = await api.post("/v1/users", dados);
      return response.data;
    } catch (error) {
      throw {
        error: error.response?.data?.error || error.message,
        message: error.message,
        status: error.response?.status,
      };
    }
  },

  async updateUser(userId, dados) {
    try {
      const response = await api.put(`/v1/users/${userId}`, dados);
      return response.data;
    } catch (error) {
      throw {
        error: error.response?.data?.error || error.message,
        message: error.message,
        status: error.response?.status,
      };
    }
  },

  async toggleUserStatus(userId, currentStatus) {
    try {
      const newStatus = !currentStatus; // Inverte o status
      const response = await api.put(`/v1/users/${userId}/toggle-status`, {
        status: newStatus,
      });
      return response.data;
    } catch (error) {
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
      };
      throw errorData;
    }
  },
};
