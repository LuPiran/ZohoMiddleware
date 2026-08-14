import express from "express";
import { createLeadFromZoho } from "../services/leadsMedicos.js";
import { authenticateLeadsWebhook } from "../middleware/leadsWebhookAuth.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * Cria lead médico no DynamoDB a partir do Zoho CRM.
 * POST /v1/leads-medicos/from-zoho
 *
 * Auth: X-Webhook-Secret / X-Api-Key / Bearer (ZOHO_LEADS_WEBHOOK_SECRET)
 *
 * Body (campos aceitos; aliases PT/EN):
 * Id / idZoho, Nome, E-mail, Telefone, Celular, Numero de Registro (CRM/CRO),
 * uf do crm, evento, consultor / consultorId, tipo lead, gerencia,
 * status, data novo lead / entradaEm, data qualificado
 */
router.post("/from-zoho", authenticateLeadsWebhook, writeRateLimiter, async (req, res) => {
  try {
    console.log("[LEADS] Recebendo lead do Zoho");

    const result = await createLeadFromZoho(req.body);

    return res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      alreadyExists: result.alreadyExists,
      data: result.lead,
    });
  } catch (error) {
    console.error("[LEADS] Erro ao criar lead:", error);

    if (error.status === 400 || error.code === "VALIDATION_ERROR") {
      return res.status(400).json({
        success: false,
        error: error.message || "Dados inválidos",
      });
    }

    if (error.code === "DYNAMO_GSI_MISSING" || error.status === 503) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }

    if (
      error.name === "ResourceNotFoundException" ||
      error.message?.includes("Requested resource not found")
    ) {
      return res.status(503).json({
        success: false,
        error:
          "Tabela DynamoDB não encontrada. Verifique DYNAMODB_LEADS_TABLE e a região AWS.",
      });
    }

    if (
      error.name === "UnrecognizedClientException" ||
      error.name === "InvalidSignatureException" ||
      error.name === "CredentialsProviderError" ||
      error.message?.includes("Could not load credentials")
    ) {
      return res.status(503).json({
        success: false,
        error:
          "Credenciais AWS inválidas ou ausentes. Configure AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY ou IAM role.",
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao criar lead médico",
    });
  }
});

export default router;
