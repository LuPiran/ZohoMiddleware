import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço de upload de arquivos
 */
export const uploadService = {
  /**
   * Faz upload de invoice (PDF) para o Zoho CRM
   * @param {string} clientId - ID do cliente no Zoho CRM
   * @param {string} base64 - Base64 do arquivo PDF
   * @returns {Promise<Object>}
   */
  async uploadInvoice(clientId, base64) {
    try {
      const response = await api.post(API_ENDPOINTS.UPLOAD.INVOICE, {
        clientId,
        base64,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};
