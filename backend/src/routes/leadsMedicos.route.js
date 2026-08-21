import express from "express";
import {
  checkinLead,
  createLeadFromZoho,
  getLeadForUser,
  listLeadsForUser,
  listPendingOffersForUser,
  markAttemptSemRetorno,
  markLeadConvertedFromZoho,
  markLeadSemContato,
  markLeadSemInteresse,
  recusarLead,
  registerContactAttempt,
  registerFirstAttempt,
  requestFourthAttempt,
  getEvidenceFileForUser,
} from "../services/leadsMedicos.js";
import { authenticateLeadsWebhook } from "../middleware/leadsWebhookAuth.js";
import { authenticateToken } from "../services/jwtService.js";
import { requireSafeResourceId } from "../middleware/authz.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";
import { evidenceUploadMiddleware } from "../middleware/leadEvidenceUpload.js";

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

  if (error.status === 409 || error.code === "OFFER_GONE") {
    return res.status(409).json({
      success: false,
      error: error.message || "Oferta não está mais disponível",
    });
  }

  if (
    error.code === "WORKDRIVE_ERROR" ||
    error.code === "WORKDRIVE_AUTH_FAILED" ||
    error.code === "WORKDRIVE_NOT_CONFIGURED" ||
    error.code === "ZOHO_ATTACHMENT_ERROR" ||
    error.status === 502
  ) {
    return res.status(error.status || 502).json({
      success: false,
      error:
        error.message ||
        "Falha ao enviar evidência para WorkDrive/Zoho CRM",
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
 * Ofertas SLA pendentes do consultor logado.
 * GET /v1/leads-medicos/ofertas-pendentes
 */
router.get("/ofertas-pendentes", authenticateToken, async (req, res) => {
  try {
    const result = await listPendingOffersForUser(req.user);
    return res.json({
      success: true,
      role: result.role,
      viewer: result.viewer,
      total: result.offers.length,
      data: result.offers,
    });
  } catch (error) {
    console.error("[LEADS] Erro ao listar ofertas:", error);
    const handled = dynamoErrorResponse(res, error);
    if (handled) return handled;

    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao listar ofertas pendentes",
    });
  }
});

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

/**
 * Zoho informa conversão do lead.
 * POST /v1/leads-medicos/convertido
 */
router.post("/convertido", authenticateLeadsWebhook, writeRateLimiter, async (req, res) => {
  try {
    const result = await markLeadConvertedFromZoho(req.body);
    return res.json({
      success: true,
      updated: result.updated,
      alreadyConverted: result.alreadyConverted,
      data: result.lead,
    });
  } catch (error) {
    console.error("[LEADS] Erro ao converter lead:", error);
    const handled = dynamoErrorResponse(res, error);
    if (handled) return handled;

    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao marcar lead convertido",
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
 * Stream autenticado da evidência armazenada no WorkDrive.
 * GET /v1/leads-medicos/:id/evidencias/:evidenciaId/arquivo
 */
router.get(
  "/:id/evidencias/:evidenciaId/arquivo",
  authenticateToken,
  requireSafeResourceId("id"),
  async (req, res) => {
    try {
      const file = await getEvidenceFileForUser(
        req.params.id,
        req.params.evidenciaId,
        req.user,
      );
      res.setHeader("Content-Type", file.mimeType || "image/jpeg");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.fileName || "evidencia.jpg")}"`,
      );
      res.setHeader("Cache-Control", "private, max-age=300");
      return res.send(file.buffer);
    } catch (error) {
      console.error("[LEADS] Erro ao baixar evidência:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao carregar evidência",
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
  evidenceUploadMiddleware,
  async (req, res) => {
    try {
      const lead = await registerFirstAttempt(req.params.id, req.user, {
        observacao: req.body?.observacao || req.body?.descricao,
        files: req.files,
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
 * Registra 1ª, 2ª, 3ª ou 4ª tentativa como tratado pelo consultor.
 * POST /v1/leads-medicos/:id/tentativas/:round
 */
router.post(
  "/:id/tentativas/:round",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  evidenceUploadMiddleware,
  async (req, res) => {
    try {
      const lead = await registerContactAttempt(
        req.params.id,
        req.user,
        req.params.round,
        {
          observacao: req.body?.observacao || req.body?.descricao,
          files: req.files,
        },
      );
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro na tentativa:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao registrar tentativa",
      });
    }
  },
);

/**
 * Consultor solicita a 4ª tentativa durante a janela da 3ª — sem aprovação.
 * Exige data-alvo (até 1 mês), motivo e ao menos 1 imagem de evidência.
 * POST /v1/leads-medicos/:id/tentativas/4/solicitar
 */
router.post(
  "/:id/tentativas/4/solicitar",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  evidenceUploadMiddleware,
  async (req, res) => {
    try {
      const lead = await requestFourthAttempt(req.params.id, req.user, {
        dataQuartaTentativa: req.body?.dataQuartaTentativa,
        motivo: req.body?.motivo,
        files: req.files,
      });
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro ao solicitar 4ª tentativa:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao solicitar a 4ª tentativa",
      });
    }
  },
);

/**
 * Sem retorno é automático ao vencer o prazo. Consultor não dispara esta ação.
 * POST /v1/leads-medicos/:id/tentativas/:round/sem-retorno
 */
router.post(
  "/:id/tentativas/:round/sem-retorno",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      await markAttemptSemRetorno();
      return res.json({ success: true });
    } catch (error) {
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao marcar tentativa sem retorno",
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
  evidenceUploadMiddleware,
  async (req, res) => {
    try {
      const lead = await markLeadSemInteresse(req.params.id, req.user, {
        observacao: req.body?.observacao || req.body?.descricao,
        files: req.files,
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
 * Marca lead como sem contato.
 * POST /v1/leads-medicos/:id/sem-contato
 */
router.post(
  "/:id/sem-contato",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  evidenceUploadMiddleware,
  async (req, res) => {
    try {
      const lead = await markLeadSemContato(req.params.id, req.user, {
        files: req.files,
      });
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro sem contato:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao marcar lead sem contato",
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
 * Aceita a oferta SLA (alias de check-in).
 * POST /v1/leads-medicos/:id/aceitar
 */
router.post(
  "/:id/aceitar",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      const lead = await checkinLead(req.params.id, req.user);
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro ao aceitar oferta:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao aceitar o lead",
      });
    }
  },
);

/**
 * Recusa a oferta SLA e envia ao próximo consultor da região.
 * POST /v1/leads-medicos/:id/recusar
 */
router.post(
  "/:id/recusar",
  authenticateToken,
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      const lead = await recusarLead(req.params.id, req.user);
      return res.json({ success: true, data: lead });
    } catch (error) {
      console.error("[LEADS] Erro ao recusar oferta:", error);
      const handled = dynamoErrorResponse(res, error);
      if (handled) return handled;

      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao recusar o lead",
      });
    }
  },
);

export default router;
