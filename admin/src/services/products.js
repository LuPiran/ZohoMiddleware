import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço do catálogo de produtos (API backend / Supabase)
 */
export const productsService = {
  /**
   * Lista produtos ativos do catálogo (formulários do portal)
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

  /**
   * Lista todos os produtos do catálogo (ativos e inativos)
   * @returns {Promise<Object>}
   */
  async getAllProducts() {
    try {
      const response = await api.get(API_ENDPOINTS.PRODUCTS.LIST_ALL);
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
   * Catálogo Supabase (admin): paginação, busca e filtros.
   * @param {Object} params
   */
  async getCatalog(params = {}) {
    try {
      const response = await api.get(API_ENDPOINTS.PRODUCTS.CATALOG, {
        params: {
          page: params.page ?? 1,
          per_page: params.perPage ?? 10,
          search: params.search ?? "",
          fabricante: params.fabricante ?? "",
          marca: params.marca ?? "",
          preco_min: params.precoMin ?? "",
          preco_max: params.precoMax ?? "",
        },
      });
      return response.data;
    } catch (error) {
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        code: error.response?.data?.code,
      };
      throw errorData;
    }
  },

  /**
   * Cria produto no catálogo Supabase (admin).
   */
  async createCatalogProduct(payload) {
    try {
      const response = await api.post(API_ENDPOINTS.PRODUCTS.CATALOG, payload);
      return response.data;
    } catch (error) {
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        code: error.response?.data?.code,
      };
      throw errorData;
    }
  },

  /**
   * Atualiza produto no catálogo Supabase (admin).
   */
  async updateCatalogProduct(id, payload) {
    try {
      const response = await api.patch(
        `${API_ENDPOINTS.PRODUCTS.CATALOG}/${id}`,
        payload,
      );
      return response.data;
    } catch (error) {
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        code: error.response?.data?.code,
      };
      throw errorData;
    }
  },

  /**
   * Alterna ativo/inativo do produto (admin).
   */
  async toggleCatalogProductStatus(id) {
    try {
      const response = await api.put(
        `${API_ENDPOINTS.PRODUCTS.CATALOG}/${id}/toggle-status`,
      );
      return response.data;
    } catch (error) {
      const errorData = {
        error: error.response?.data?.error || error.message,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        code: error.response?.data?.code,
      };
      throw errorData;
    }
  },
};
