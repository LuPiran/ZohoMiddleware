import express from "express";
import {
  checkinLead,
  createLeadFromZoho,
  getLeadForUser,
  listLeadsForUser,
  markLeadSemInteresse,
  registerFirstAttempt,
} from "../services/leadsMedicos.js";
import { authenticateLeadsWebhook } from "../middleware/leadsWebhookAuth.js";
import { authenticateToken } from "../services/jwtService.js";
import { requireSafeResourceId } from "../middleware/authz.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

function dynamoErrorResponse(res, error) {
  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    return res.status(400).json({
      success: false,
      error: error.message || "Dados inválidos",
    });
  }

  if (error.status === 403 || error.code === "FORBIDDEN") {
    return res.status(403).json({
      success: false,
      error: error.message || "Acesso negado",
    });
  }

  if (error.status === 404 || error.code === "NOT_FOUND") {
    return res.status(404).json({
      success: false,
      error: error.message || "Não encontrado",
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
 * Detalhe de um lead.
 * GET /v1/leads-medicos/:id
 */
router.get(
  "/:id",
  authenticateToken,
  requireSafeResourceId("id"),
  async (req, res) => {
    try {
      const result = await getLeadForUser(req.params.id, req.user);
      return res.json({
        success: true,
        role: result.role,
        viewer: result.viewer,
        data: result.lead,
      });
    } catch (error) {
      console.error("[LEADS] Erro ao buscar lead:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao buscar lead médico",
      });
    }
  },
);

/**
 * Registra primeira tentativa de contato.
 * POST /v1/leads-medicos/:id/primeira-tentativa
 */
router.post(
  "/:id/primeira-tentativa",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      const lead = await registerFirstAttempt(req.params.id, req.user, {
        observacao: req.body?.observacao || req.body?.descricao,
      });
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro na 1ª tentativa:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao registrar primeira tentativa",
      });
    }
  },
);

/**
 * Marca lead como sem interesse.
 * POST /v1/leads-medicos/:id/sem-interesse
 */
router.post(
  "/:id/sem-interesse",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      const lead = await markLeadSemInteresse(req.params.id, req.user, {
        observacao: req.body?.observacao || req.body?.descricao,
      });
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro sem interesse:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao marcar lead sem interesse",
      });
    }
  },
);

/**
 * Confirma check-in do consultor dentro do prazo SLA.
 * POST /v1/leads-medicos/:id/checkin
 */
router.post(
  "/:id/checkin",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      const lead = await checkinLead(req.params.id, req.user);
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro no check-in:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao registrar check-in",
      });
    }
  },
);

/**
 * Cria lead médico no DynamoDB a partir do Zoho CRM.
 * POST /v1/leads-medicos/from-zoho
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
