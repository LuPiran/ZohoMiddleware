import express from "express";
import axios from "axios";
import { ENV } from "../config/env.js";

const router = express.Router();

/**
 * Rota para buscar CEP na API de CEP configurada no ambiente
 * GET /api/cep/:cep
 * Retorna os dados do endereço baseado no CEP
 */
router.get("/:cep", async (req, res) => {
  try {
    const { cep } = req.params;
    const cepLimpo = cep.replace(/\D/g, "");

    console.log(
      "[CEP API] Requisição recebida - CEP original:",
      cep,
      "CEP limpo:",
      cepLimpo,
    );

    // Valida se o CEP tem 8 dígitos
    if (!cepLimpo || cepLimpo.length !== 8) {
      console.log("[CEP API] ✗ CEP inválido:", cepLimpo);
      return res.status(400).json({
        erro: true,
        message: "CEP deve conter 8 dígitos",
      });
    }

    const cepApiUrl = (ENV.CEP_API_URL || "").trim();
    const cepApiPassword = (ENV.CEP_API_PASSWORD || "").trim();
    const timeoutMs = Number.parseInt(ENV.CEP_API_TIMEOUT_MS || "10000", 10);

    if (!cepApiUrl || !cepApiPassword) {
      console.error("[CEP API] ✗ Configuração ausente: CEP_API_URL/CEP_API_PASSWORD");
      return res.status(500).json({
        erro: true,
        message: "Serviço de CEP não configurado no servidor",
      });
    }

    console.log("[CEP API] Buscando CEP no provedor externo:", cepApiUrl);

    // Busca CEP na API contratada (CEP + password por query string)
    const response = await axios.get(cepApiUrl, {
      timeout: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
      headers: {
        Accept: "application/json",
      },
      params: {
        cep: cepLimpo,
        password: cepApiPassword,
      },
    });

    const data = response.data;
    const address = data?.data?.address;

    // Verifica se o CEP foi encontrado
    if (!data?.success || !address) {
      console.log("[CEP API] ✗ CEP não encontrado:", cepLimpo);
      return res.status(404).json({
        erro: true,
        message: data?.error || "CEP não encontrado",
      });
    }

    console.log("[CEP API] ✓ CEP encontrado:", cepLimpo);

    // Retorna os dados do endereço
    res.json({
      cep: address.cep || cepLimpo,
      logradouro: address.logradouro || "",
      complemento: address.complemento || "",
      bairro: address.bairro || "",
      localidade: address.localidade || "",
      // Alguns provedores retornam estado em vez de uf.
      uf: address.uf || address.estado || "",
      ibge: address.ibge || "",
      gia: address.gia || "",
      ddd: address.ddd || "",
      siafi: address.siafi || "",
    });
  } catch (error) {
    console.error("[CEP API] ✗ Erro ao buscar CEP:", error.message);
    console.error("[CEP API] Detalhes do erro:", {
      code: error.code,
      response: error.response?.status,
      message: error.message,
    });

    // Se for erro de timeout ou conexão
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED"
    ) {
      return res.status(503).json({
        erro: true,
        message: "Erro ao conectar com o serviço de CEP. Tente novamente.",
      });
    }

    // Se for erro 404 da API de CEP
    if (error.response?.status === 404) {
      return res.status(404).json({
        erro: true,
        message: "CEP não encontrado",
      });
    }

    // Se a resposta da API indicar erro de busca
    if (error.response?.data?.erro || error.response?.data?.success === false) {
      return res.status(404).json({
        erro: true,
        message: error.response?.data?.error || "CEP não encontrado",
      });
    }

    // Outros erros
    res.status(500).json({
      erro: true,
      message: error.response?.data?.message || "Erro ao buscar CEP",
    });
  }
});

export default router;
