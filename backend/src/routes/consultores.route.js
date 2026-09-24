import express from "express";
import {
  listConsultoresForAdmin,
  setConsultorRecebeLeads,
} from "../services/consultores.js";
import { requireSafeResourceId } from "../middleware/authz.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * Lista consultores (nome, e-mail, região, etc.) para o admin escolher
 * destinatário na atribuição manual de lead ou gerenciar quem recebe leads.
 * GET /v1/consultores?q=busca
 */
router.get("/", async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim().toLowerCase();
    const all = await listConsultoresForAdmin();
    const data = q
      ? all.filter(
          (c) =>
            (c.nome || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q),
        )
      : all;
    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error("[CONSULTORES] Erro ao listar:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao listar consultores",
    });
  }
});

/**
 * Liga/desliga se o consultor participa da distribuição de leads (fila
 * automática e seletor de atribuição manual).
 * PATCH /v1/consultores/:id/recebe-leads
 */
router.patch(
  "/:id/recebe-leads",
  requireSafeResourceId("id"),
  writeRateLimiter,
  async (req, res) => {
    try {
      const recebeLeads = Boolean(req.body?.recebeLeads);
      const updated = await setConsultorRecebeLeads(req.params.id, recebeLeads);
      return res.json({
        success: true,
        data: { id: updated.id, recebeLeads: updated.recebeLeads !== false },
      });
    } catch (error) {
      console.error("[CONSULTORES] Erro ao atualizar recebe-leads:", error);
      return res.status(error.status || 500).json({
        success: false,
        error: error.message || "Erro ao atualizar consultor",
      });
    }
  },
);

export default router;
