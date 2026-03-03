import api from "./api";

/**
 * Serviço para buscar pedidos (Sales Orders) no Zoho
 */
export const salesOrderService = {
  /**
   * Busca pedidos pelo número do pedido no módulo Sales_Orders
   * @param {string} numeroPedido - valor de N_mero_Pedido no Zoho
   * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
   */
  async getSalesOrderByNumber(numeroPedido) {
    try {
      const numeroLimpo = String(numeroPedido).trim();
      const response = await api.get(`/v1/sales-orders/${numeroLimpo}`);

      // Espera-se que o backend normalize os campos:
      // Contact_Name, CPF, Celular, E_mail, N_mero_Pedido, AWB, Data
      // e o subform Informa_es_do_Produtos (array)
      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error) {
      // 404: nenhum pedido encontrado
      if (error.response?.status === 404) {
        return {
          success: false,
          error: "Pedido não encontrado",
        };
      }

      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Erro ao buscar pedido",
      };
    }
  },
};

