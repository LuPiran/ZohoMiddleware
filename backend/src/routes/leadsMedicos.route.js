import express from "express";
import {
  createLeadFromZoho,
  listLeadsForUser,
} from "../services/leadsMedicos.js";
import { authenticateLeadsWebhook } from "../middleware/leadsWebhookAuth.js";
import { authenticateToken } from "../services/jwtService.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

function dynamoErrorResponse(res, error) {
  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    return res.status(400).json({
      success: false,
      error: error.message || "Dados inválidos",
    });
  }

  if (
    error.code === "DYNAMO_GSI_MISSING" ||
    error.code === "DYNAMO_CONSULTOR_GSI_MISSING" ||
    error.status === 503
  ) {
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
    error.message?.includes("Could not load credentials") ||
    error.name === "AccessDeniedException"
  ) {
    return res.status(503).json({
      success: false,
      error:
        "Credenciais AWS inválidas ou ausentes. Configure AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY ou IAM role.",
    });
  }

  return null;
}

/**
 * Lista leads médicos conforme perfil do usuário logado.
 * GET /v1/leads-medicos
 *
 * Regras:
 * - admin: todos
 * - gerente: gerência + próprios
 * - consultor: apenas os seus
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await listLeadsForUser(req.user);

    return res.json({
      success: true,
      role: result.role,
      viewer: result.viewer,
      total: result.leads.length,
      data: result.leads,
    });
  } catch (error) {
    console.error("[LEADS] Erro ao listar leads:", error);
    const handled = dynamoErrorResponse(res, error);
    if (handled) return handled;

    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao listar leads médicos",
    });
  }
});

/**
 * Cria lead médico no DynamoDB a partir do Zoho CRM.
 * POST /v1/leads-medicos/from-zoho
 *
 * Auth: X-Webhook-Secret / X-Api-Key / Bearer (ZOHO_LEADS_WEBHOOK_SECRET)
 *
 * Body (campos aceitos; aliases PT/EN):
 * Id / idZoho, Nome, E-mail, Telefone, Celular, Numero de Registro (CRM/CRO),
 * uf do crm, evento, consultor / emailConsultor / consultorId, tipo lead, gerencia,
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
    const handled = dynamoErrorResponse(res, error);
    if (handled) return handled;

    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao criar lead médico",
    });
  }
});

export default router;
