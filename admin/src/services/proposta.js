import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço para gerenciar propostas
 */
export const propostaService = {
  /**
   * Cria uma nova proposta no Zoho
   * @param {Object} dadosProposta - Dados da proposta
   * @returns {Promise<Object>}
   */
  async criarProposta(dadosProposta) {
    try {
      const response = await api.post(API_ENDPOINTS.PROPOSTA.CRIAR, dadosProposta);
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
