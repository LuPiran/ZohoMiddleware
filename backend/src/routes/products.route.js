import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";

const router = express.Router();

/**
 * Rota para buscar produtos ativos do módulo Products do Zoho
 * GET /api/products
 * Retorna apenas produtos com Product_Active = true
 */
router.get("/", async (req, res) => {
  try {
    // Busca produtos do módulo Products
    const endpoint = "/Products";
    const response = await chamarZohoApi("GET", endpoint);

    const produtos = response.data || [];

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

    res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao buscar produtos",
      details: error.response?.data,
    });
  }
});

/**
 * Rota para buscar TODOS os produtos do módulo Products do Zoho (sem filtrar por ativo)
 * GET /api/products/all
 * Retorna todos os produtos, independente do status Product_Active
 */
router.get("/all", async (req, res) => {
  try {
    // Busca produtos do módulo Products
    const endpoint = "/Products";
    const response = await chamarZohoApi("GET", endpoint);

    const produtos = response.data || [];

    // Formata os produtos para o frontend (sem filtrar por ativo)
    const produtosFormatados = produtos.map((produto) => ({
      id: produto.id,
      nome: produto.Product_Name || produto.product_name || produto.Name || "",
      active: produto.Product_Active === true || produto.Product_Active === "true" || produto.product_active === true || produto.product_active === "true" || false,
      unitPrice: produto.Unit_Price || produto.unit_price || produto.UnitPrice || produto.unitPrice || 0,
    }));

    res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao buscar produtos",
      details: error.response?.data,
    });
  }
});

export default router;
