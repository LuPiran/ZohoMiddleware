import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço para gerenciar produtos do Zoho
 */
export const productsService = {
  /**
   * Busca lista de produtos ativos do Zoho
   * @returns {Promise<Object>}
   */
  async getProducts() {
    try {
      const response = await api.get(API_ENDPOINTS.PRODUCTS.LIST);
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
