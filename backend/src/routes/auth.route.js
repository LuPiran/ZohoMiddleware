import express from "express";
import axios from "axios";
import zohoAuth from "../services/zohoAuth.js";
import { ENV } from "../config/env.js";
import {
  loginRateLimiter,
  checkEmailRateLimiter,
} from "../middleware/rateLimiter.js";
import {
  validateLogin,
  validateCheckEmail,
  handleValidationErrors,
} from "../middleware/validation.js";
import { logSecurityEvent, sanitizeInput } from "../utils/security.js";
import gerarAcessToken from "../zoho/auth.js";
import { validarIdToken } from "../services/entraAuth.js";
import {
  completarLoginPortal,
  formatAuthError,
} from "../services/loginSession.js";
import {
  assertAccountNotLocked,
  recordLoginFailure,
  clearLoginFailures,
} from "../middleware/bruteForceGuard.js";
import { authenticateTokenOrQuery } from "../services/jwtService.js";
import { requireSelfOrAdmin } from "../middleware/authz.js";

const router = express.Router();

/**
 * Login Zoho (email + senha)
 * POST /v1/auth/login
 */
router.post(
  "/login",
  loginRateLimiter,
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log("[AUTH ROUTE] Nova requisição de login Zoho");

    try {
      const email = sanitizeInput(req.body.email).toLowerCase().trim();
      const senha = req.body.senha;

      console.log("[AUTH ROUTE] Tentando login Zoho para:", email);

      try {
        assertAccountNotLocked(email, clientIp);
      } catch (lockError) {
        if (lockError.code === "ACCOUNT_LOCKED") {
          logSecurityEvent(email, clientIp, false);
          return res.status(429).json({
            success: false,
            error: lockError.message,
            retryAfterSec: lockError.retryAfterSec,
          });
        }
        throw lockError;
      }

      const usuario = await zohoAuth.validarCredenciais(email, senha);

      if (!usuario) {
        const lockStatus = recordLoginFailure(email, clientIp);
        logSecurityEvent(email, clientIp, false);
        if (lockStatus.locked) {
          return res.status(429).json({
            success: false,
            error:
              "Conta temporariamente bloqueada por tentativas inválidas. Aguarde 15 minutos.",
            retryAfterSec: lockStatus.retryAfterSec,
          });
        }
        return res.status(401).json({
          success: false,
          error: "Email ou senha incorretos",
        });
      }

      clearLoginFailures(email, clientIp);

      if (!usuario.Email && !usuario.email) {
        usuario.Email = email;
      }

      await completarLoginPortal(req, res, usuario, email);
    } catch (error) {
      console.error("[AUTH ROUTE] ✗ ERRO na rota de login Zoho:");
      console.error("[AUTH ROUTE] Mensagem:", error.message);
      res.status(500).json(formatAuthError(error));
    }
  },
);

/**
 * Login Microsoft Entra ID
 * POST /v1/auth/microsoft
 * Body: { idToken: string }
 */
router.post("/microsoft", loginRateLimiter, async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  console.log("[AUTH ROUTE] Nova requisição de login Microsoft");

  try {
    const idToken = req.body?.idToken;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "idToken é obrigatório",
      });
    }

    if (idToken.length > 8192) {
      return res.status(400).json({
        success: false,
        error: "idToken inválido",
      });
    }

    const identidade = await validarIdToken(idToken);
    console.log("[AUTH ROUTE] Token Microsoft válido para:", identidade.email);

    try {
      assertAccountNotLocked(identidade.email, clientIp);
    } catch (lockError) {
      if (lockError.code === "ACCOUNT_LOCKED") {
        logSecurityEvent(identidade.email, clientIp, false);
        return res.status(429).json({
          success: false,
          error: lockError.message,
          retryAfterSec: lockError.retryAfterSec,
        });
      }
      throw lockError;
    }

    const { usuario, criado } = await zohoAuth.obterOuCriarUsuarioPorEmail({
      email: identidade.email,
      nome: identidade.nome,
    });

    if (criado) {
      console.log(
        "[AUTH ROUTE] Usuário provisionado no Zoho para:",
        identidade.email,
      );
    }

    if (!usuario?.id) {
      logSecurityEvent(identidade.email, clientIp, false);
      return res.status(500).json({
        success: false,
        error: "Não foi possível obter o usuário do portal no Zoho",
      });
    }

    clearLoginFailures(identidade.email, clientIp);

    if (!usuario.Email && !usuario.email) {
      usuario.Email = identidade.email;
    }

    await completarLoginPortal(req, res, usuario, identidade.email);
  } catch (error) {
    console.error("[AUTH ROUTE] ✗ ERRO no login Microsoft:");
    console.error("[AUTH ROUTE] Mensagem:", error.message);
    console.error("[AUTH ROUTE] Código:", error.code);

    if (
      error.code === "ENTRA_TOKEN_MISSING" ||
      error.code === "ENTRA_TOKEN_INVALID" ||
      error.code === "ENTRA_TENANT_MISMATCH" ||
      error.code === "ENTRA_EMAIL_UNVERIFIED" ||
      error.code === "ENTRA_EMAIL_MISSING"
    ) {
      logSecurityEvent("microsoft", clientIp, false);
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    if (error.code === "ENTRA_NOT_CONFIGURED") {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json(formatAuthError(error));
  }
});

/**
 * Verifica se um email existe no módulo Zoho
 * POST /v1/auth/check-email
 */
router.post(
  "/check-email",
  checkEmailRateLimiter,
  validateCheckEmail,
  handleValidationErrors,
  async (req, res) => {
    console.log("[AUTH ROUTE] Verificando se email existe");

    try {
      const email = sanitizeInput(req.body.email).toLowerCase().trim();
      const usuario = await zohoAuth.buscarUsuarioPorEmail(email);

      res.json({
        success: true,
        exists: !!usuario,
      });
    } catch (error) {
      console.error("[AUTH ROUTE] ✗ ERRO ao verificar email:");
      console.error(
        "[AUTH ROUTE] Detalhes:",
        error.response?.data || error.message,
      );

      res.status(500).json({
        success: false,
        error: "Erro ao verificar email",
      });
    }
  },
);

/**
 * Proxy autenticado da foto do usuário (Bearer ou ?access=)
 * GET /v1/auth/user-photo/:userId
 */
router.get(
  "/user-photo/:userId",
  authenticateTokenOrQuery,
  requireSelfOrAdmin("userId"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";

      const baseUrl =
        ENV.ZOHO_API_BASE?.replace(/\/$/, "") || "https://www.zohoapis.com";
      const apiBase = baseUrl.replace("zohoapi.com", "zohoapis.com");
      const photoUrl = `${apiBase}/crm/v2/${moduleName}/${userId}/photo`;

      console.log("[AUTH ROUTE] Buscando foto do usuário:", photoUrl);

      const accessToken = await gerarAcessToken();

      const imageResponse = await axios.get(photoUrl, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        responseType: "arraybuffer",
      });

      console.log("[AUTH ROUTE] ✓ Foto obtida com sucesso do Zoho");

      res.set({
        "Content-Type": imageResponse.headers["content-type"] || "image/jpeg",
        "Content-Length": imageResponse.headers["content-length"],
        "Cache-Control": "private, max-age=3600",
      });

      res.send(Buffer.from(imageResponse.data));
    } catch (error) {
      console.error("[AUTH ROUTE] ✗ ERRO ao servir foto do usuário:");
      console.error("[AUTH ROUTE] Status:", error.response?.status);
      console.error(
        "[AUTH ROUTE] Detalhes:",
        error.response?.data || error.message,
      );
      res.status(404).json({ error: "Foto não encontrada" });
    }
  },
);

export default router;
