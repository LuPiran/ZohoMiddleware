import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço para gerenciar ocorrências
 */
export const ocorrenciaService = {
  /**
   * Cria uma nova ocorrência no Zoho
   * @param {Object} dadosOcorrencia - Dados da ocorrência
   * @returns {Promise<Object>}
   */
  async criarOcorrencia(dadosOcorrencia) {
    try {
      const response = await api.post(API_ENDPOINTS.OCORRENCIA.CRIAR, dadosOcorrencia);
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
