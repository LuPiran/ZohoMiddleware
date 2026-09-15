import { PRODUCTS } from "../data/products";

/**
 * Serviço para gerenciar produtos.
 *
 * Servido a partir do catálogo estático em `data/products.js` em vez de
 * chamar `/v1/products` no backend a cada montagem de tela — reduz o volume
 * de requisições geradas pelas telas de Compra/Recompra/Proposta/Ocorrência.
 * Veja o comentário em `data/products.js` para saber como atualizar o catálogo.
 */
export const productsService = {
  /**
   * Retorna a lista de produtos ativos
   * @returns {Promise<Object>}
   */
  async getProducts() {
    const data = PRODUCTS.filter((produto) => produto.active).map(
      ({ id, nome, active }) => ({ id, nome, active }),
    );
    return { success: true, data, total: data.length, hasMore: false };
  },

  /**
   * Retorna TODOS os produtos (sem filtrar por ativo)
   * @returns {Promise<Object>}
   */
  async getAllProducts() {
    const data = PRODUCTS;
    return { success: true, data, total: data.length, hasMore: false };
  },
};
