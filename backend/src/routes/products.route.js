import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";

const router = express.Router();

// Wrapper para capturar erros assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Rota para buscar produtos ativos do módulo Products do Zoho
 * GET /api/products
 * Retorna apenas produtos com Product_Active = true
 */
router.get("/", asyncHandler(async (req, res, next) => {
  try {
    console.log("[PRODUCTS API] Buscando produtos do Zoho...");
    
    // Busca produtos do módulo Products com paginação para evitar timeout
    // Limita a 200 produtos por página (limite padrão do Zoho)
    const page = parseInt(req.query.page) || 1;
    const perPage = 200;
    const endpoint = `/Products?page=${page}&per_page=${perPage}`;
    
    console.log("[PRODUCTS API] Endpoint:", endpoint);
    
    const response = await chamarZohoApi("GET", endpoint);

    const produtos = response.data || [];

    console.log(`[PRODUCTS API] Produtos recebidos: ${produtos.length}`);

    // Filtra apenas produtos ativos (Product_Active = true)
    // Se não houver campo Product_Active, retorna todos os produtos
    const produtosAtivos = produtos.filter((produto) => {
      // Verifica se o campo Product_Active existe
      const hasActiveField =
        produto.Product_Active !== undefined ||
        produto.product_active !== undefined;

      if (!hasActiveField) {
        // Se não tem campo de ativo, assume que todos estão ativos
        return true;
      }

      const isActive =
        produto.Product_Active === true ||
        produto.Product_Active === "true" ||
        produto.product_active === true ||
        produto.product_active === "true";

      return isActive;
    });

    // Formata os produtos para o frontend
    const produtosFormatados = produtosAtivos.map((produto) => ({
      id: produto.id,
      nome: produto.Product_Name || produto.product_name || produto.Name || "",
      active: true, // Já filtrado, então sempre true
    }));

    console.log(`[PRODUCTS API] Produtos ativos formatados: ${produtosFormatados.length}`);

    res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
      hasMore: response.info?.more_records || false,
    });
  } catch (error) {
    console.error("[PRODUCTS API] ✗ Erro ao buscar produtos:", error);
    console.error("[PRODUCTS API] Código do erro:", error.code);
    console.error("[PRODUCTS API] Status:", error.response?.status);
    
    // Trata erros de timeout ou conexão com 503
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      error.message?.includes("timeout")
    ) {
      // Cria um erro customizado com status 503
      const serviceUnavailableError = new Error("Serviço temporariamente indisponível. Tente novamente em alguns instantes.");
      serviceUnavailableError.status = 503;
      serviceUnavailableError.code = error.code || "ETIMEDOUT";
      return next(serviceUnavailableError);
    }

    // Outros erros são passados para o próximo middleware
    error.status = error.status || 500;
    next(error);
  }
}));

/**
 * Rota para buscar TODOS os produtos do módulo Products do Zoho (sem filtrar por ativo)
 * GET /api/products/all
 * Retorna todos os produtos, independente do status Product_Active
 */
router.get("/all", asyncHandler(async (req, res, next) => {
  try {
    console.log("[PRODUCTS API] Buscando todos os produtos do Zoho...");
    
    // Busca produtos do módulo Products com paginação
    const page = parseInt(req.query.page) || 1;
    const perPage = 200;
    const endpoint = `/Products?page=${page}&per_page=${perPage}`;
    
    console.log("[PRODUCTS API] Endpoint:", endpoint);
    
    const response = await chamarZohoApi("GET", endpoint);

    const produtos = response.data || [];

    console.log(`[PRODUCTS API] Produtos recebidos: ${produtos.length}`);

    // Formata os produtos para o frontend (sem filtrar por ativo)
    const produtosFormatados = produtos.map((produto) => ({
      id: produto.id,
      nome: produto.Product_Name || produto.product_name || produto.Name || "",
      active: produto.Product_Active === true || produto.Product_Active === "true" || produto.product_active === true || produto.product_active === "true" || false,
      unitPrice: produto.Unit_Price || produto.unit_price || produto.UnitPrice || produto.unitPrice || 0,
    }));

    console.log(`[PRODUCTS API] Produtos formatados: ${produtosFormatados.length}`);

    res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
      hasMore: response.info?.more_records || false,
    });
  } catch (error) {
    console.error("[PRODUCTS API] ✗ Erro ao buscar todos os produtos:", error);
    console.error("[PRODUCTS API] Código do erro:", error.code);
    console.error("[PRODUCTS API] Status:", error.response?.status);
    
    // Trata erros de timeout ou conexão com 503
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      error.message?.includes("timeout")
    ) {
      // Cria um erro customizado com status 503
      const serviceUnavailableError = new Error("Serviço temporariamente indisponível. Tente novamente em alguns instantes.");
      serviceUnavailableError.status = 503;
      serviceUnavailableError.code = error.code || "ETIMEDOUT";
      return next(serviceUnavailableError);
    }

    // Outros erros são passados para o próximo middleware
    error.status = error.status || 500;
    next(error);
  }
}));

export default router;
