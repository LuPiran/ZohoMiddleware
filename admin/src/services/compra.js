import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço para gerenciar compras
 */
export const compraService = {
  /**
   * Busca cliente por nome (Nome_Cliente) no módulo Contacts do Zoho
   * @param {string} nomeCliente - Nome do cliente
   * @returns {Promise<Object>} - Resposta da API
   */
  async buscarClientePorNome(nomeCliente) {
    try {
      const nome = String(nomeCliente || "").trim();
      const response = await api.get(
        `/v1/compra/cliente-nome/${encodeURIComponent(nome)}`
      );
      return {
        success: true,
        data: response.data.data || null,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: "Cliente não encontrado",
        };
      }
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Erro ao buscar cliente",
      };
    }
  },

  /**
   * Busca cliente por CPF no módulo Contacts do Zoho
   * @param {string} cpf - CPF do cliente (com ou sem formatação)
   * @returns {Promise<Object>} - Resposta da API
   */
  async buscarClientePorCpf(cpf) {
    try {
      const cpfLimpo = String(cpf || "").replace(/\D/g, "");
      const response = await api.get(`/v1/compra/cliente/${cpfLimpo}`);
      return {
        success: true,
        data: response.data.data || null,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: "Cliente não encontrado",
        };
      }
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Erro ao buscar cliente",
      };
    }
  },

  /**
   * Cria uma nova compra no Zoho
   * @param {Object} dadosCompra - Dados da compra
   * @returns {Promise<Object>}
   */
  async criarCompra(dadosCompra) {
    try {
      const response = await api.post(API_ENDPOINTS.COMPRA.CRIAR, dadosCompra);
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
