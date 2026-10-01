import express from "express";
import { listUsuariosPortal } from "../services/consultores.js";
import {
  atualizarUsuarioPortal,
  criarUsuarioPortal,
  definirUsuarioAtivo,
} from "../services/portalUsuarios.js";
import { requireSafeResourceId } from "../middleware/authz.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * Lista os usuários gravados no MySQL.
 * GET /v1/users
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page, 10) || 10));
    const search = req.query.search?.trim() || "";
    const resultado = await listUsuariosPortal({ page, perPage, search });

    res.json({
      success: true,
      data: resultado.data,
      pagination: resultado.pagination,
    });
  } catch (error) {
    console.error("[USERS API] Erro ao buscar usuários:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erro ao buscar usuários",
    });
  }
});

function responderErroUsuario(res, error, fallback) {
  const status = error.status || error.response?.status || 500;
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: error.message || fallback,
  });
}

/**
 * Cadastra usuário no Zoho e no banco. A senha fica só no Zoho.
 * POST /v1/users
 */
router.post("/", writeRateLimiter, async (req, res) => {
  try {
    const data = await criarUsuarioPortal(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Usuário cadastrado no Zoho e no banco",
      data,
    });
  } catch (error) {
    console.error("[USERS API] Erro ao cadastrar usuário:", error.message);
    return responderErroUsuario(res, error, "Erro ao cadastrar usuário");
  }
});

/**
 * Atualiza usuário no Zoho e no banco.
 * PUT /v1/users/:id
 */
router.put("/:id", requireSafeResourceId("id"), writeRateLimiter, async (req, res) => {
  try {
    const data = await atualizarUsuarioPortal(req.params.id, req.body || {});
    return res.json({
      success: true,
      message: "Usuário atualizado no Zoho e no banco",
      data,
    });
  } catch (error) {
    console.error("[USERS API] Erro ao atualizar usuário:", error.message);
    return responderErroUsuario(res, error, "Erro ao atualizar usuário");
  }
});

/**
 * Alterna ativo/inativo no Zoho e no banco.
 * PUT /v1/users/:id/toggle-status
 */
router.put("/:id/toggle-status", requireSafeResourceId("id"), writeRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = await definirUsuarioAtivo(id, Boolean(status));

    res.json({
      success: true,
      message: data.ativo
        ? "Usuário ativado com sucesso"
        : "Usuário desativado com sucesso",
      data: {
        id: data.id,
        status: data.ativo,
      },
    });
  } catch (error) {
    console.error("[USERS API] Erro ao alternar status do usuário:", error);
    return responderErroUsuario(res, error, "Erro ao alterar status do usuário");
  }
});

export default router;
