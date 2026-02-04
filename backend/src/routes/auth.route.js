import express from "express";
import zohoAuth from "../services/zohoAuth.js";
import { ENV } from "../config/env.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";
import {
  validateLogin,
  handleValidationErrors,
} from "../middleware/validation.js";
import { generateToken } from "../services/jwtService.js";
import {
  comparePassword,
  logSecurityEvent,
  sanitizeInput,
} from "../utils/security.js";

const router = express.Router();

/**
 * Rota de login
 * POST /api/auth/login
 * Body: { email: string, senha: string }
 *
 * Proteções aplicadas:
 * - Rate limiting (5 tentativas por 15 minutos)
 * - Validação de entrada
 * - Sanitização de dados
 * - Comparação segura de senhas
 * - JWT para sessão
 * - Logs de segurança
 */
router.post(
  "/login",
  loginRateLimiter, // Rate limiting primeiro
  validateLogin, // Validação de entrada
  handleValidationErrors,
  async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log("[AUTH ROUTE] Nova requisição de login recebida");

    try {
      // Sanitiza os inputs
      const email = sanitizeInput(req.body.email);
      const senha = req.body.senha; // Senha não deve ser sanitizada (pode ter caracteres especiais)

      console.log("[AUTH ROUTE] Tentando fazer login para:", email);

      // Valida as credenciais no Zoho
      const usuario = await zohoAuth.validarCredenciais(email, senha);

      if (!usuario) {
        logSecurityEvent(email, clientIp, false);
        console.log("[AUTH ROUTE] ✗ Login falhou: credenciais inválidas");
        // Sempre retorna a mesma mensagem para não revelar se o email existe
        return res.status(401).json({
          success: false,
          error: "Email ou senha incorretos",
        });
      }

      logSecurityEvent(email, clientIp, true);
      console.log("[AUTH ROUTE] ✓ Login realizado com sucesso");
      console.log("[AUTH ROUTE] Usuário ID:", usuario.id);

      // Gera token JWT
      const token = generateToken(usuario);

      // Obtém o nome do usuário (tenta diferentes variações de campos)
      const campoNome = process.env.ZOHO_NOME_FIELD || "Nome";
      const nomeUsuario =
        usuario[campoNome] ||
        usuario.Nome ||
        usuario.Name ||
        usuario.nome ||
        usuario.name ||
        usuario.Nome_Completo ||
        usuario.nome_completo ||
        usuario.Full_Name ||
        usuario.full_name ||
        "";

      // Retorna os dados do usuário (sem a senha) e o token
      res.json({
        success: true,
        message: "Login realizado com sucesso",
        token, // Token JWT para autenticação em requisições futuras
        usuario: {
          id: usuario.id,
          email: usuario.Email || usuario.email,
          nome: nomeUsuario || usuario.Email || usuario.email, // Fallback para email se não tiver nome
          // Remove campos sensíveis antes de retornar
          ...Object.fromEntries(
            Object.entries(usuario).filter(
              ([key]) =>
                ![
                  "Senha",
                  "Password",
                  "senha",
                  "password",
                  "Senha_Password",
                  "senha_password",
                ].includes(key),
            ),
          ),
        },
      });
    } catch (error) {
      console.error("[AUTH ROUTE] ✗ ERRO na rota de login:");
      console.error("[AUTH ROUTE] Mensagem:", error.message);
      console.error("[AUTH ROUTE] Stack:", error.stack);
      console.error(
        "[AUTH ROUTE] Response data:",
        error.response?.data || "N/A",
      );
      console.error("[AUTH ROUTE] Status:", error.response?.status || "N/A");

      // Retorna erro com mais detalhes para debug (em desenvolvimento)
      const zohoError = error.response?.data;
      let errorMessage =
        error.message || "Erro ao processar login. Tente novamente mais tarde.";

      // Trata erros específicos do Zoho
      if (zohoError?.code === "INVALID_MODULE") {
        errorMessage =
          "Módulo não encontrado no Zoho CRM. Verifique se o nome do módulo está correto na configuração ZOHO_MODULE_NAME.";
      } else if (zohoError?.message) {
        errorMessage = zohoError.message;
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
        details:
          ENV.NODE_ENV !== "production"
            ? {
                zohoCode: zohoError?.code,
                zohoMessage: zohoError?.message,
                fullError: error.message,
              }
            : undefined,
      });
    }
  },
);

/**
 * Rota para verificar se um email existe
 * POST /api/auth/check-email
 * Body: { email: string }
 */
router.post("/check-email", async (req, res) => {
  console.log("[AUTH ROUTE] Verificando se email existe");

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email é obrigatório",
      });
    }

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
});

export default router;
