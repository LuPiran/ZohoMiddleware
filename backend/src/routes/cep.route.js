import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * Rota para buscar CEP na API ViaCEP
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

    console.log("[CEP API] Buscando CEP na ViaCEP:", cepLimpo);

    // Busca CEP na API ViaCEP
    const response = await axios.get(
      `https://viacep.com.br/ws/${cepLimpo}/json/`,
      {
        timeout: 10000, // Timeout de 10 segundos
        headers: {
          Accept: "application/json",
        },
      },
    );

    const data = response.data;

    // Verifica se o CEP foi encontrado
    if (data.erro) {
      console.log("[CEP API] ✗ CEP não encontrado:", cepLimpo);
      return res.status(404).json({
        erro: true,
        message: "CEP não encontrado",
      });
    }

    console.log("[CEP API] ✓ CEP encontrado:", cepLimpo);

    // Retorna os dados do endereço
    res.json({
      cep: data.cep,
      logradouro: data.logradouro || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      localidade: data.localidade || "",
      uf: data.uf || "",
      ibge: data.ibge || "",
      gia: data.gia || "",
      ddd: data.ddd || "",
      siafi: data.siafi || "",
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

    // Se for erro 404 da API ViaCEP
    if (error.response?.status === 404) {
      return res.status(404).json({
        erro: true,
        message: "CEP não encontrado",
      });
    }

    // Se a resposta da API indicar erro (CEP não encontrado)
    if (error.response?.data?.erro) {
      return res.status(404).json({
        erro: true,
        message: "CEP não encontrado",
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
