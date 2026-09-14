import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Serviço para o "Raio-X do Portal" — documento técnico completo,
 * restrito a Admin Painel (ver AdminRoute + backend requireAdmin).
 */
export const raioxService = {
  /**
   * Busca o HTML completo do Raio-X, já autenticado via Bearer.
   * @returns {Promise<string>} HTML completo do documento
   */
  async getHtml() {
    const response = await api.get(API_ENDPOINTS.RAIOX.GET, {
      responseType: "text",
    });
    return response.data;
  },
};
