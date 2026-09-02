import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Rate Limiter para login (Zoho + Microsoft)
 * - 5 falhas / 15 min / IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Rate limit para verificação de existência de e-mail (anti-enumeração).
 */
export const checkEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Muitas verificações de e-mail. Aguarde alguns minutos.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Lookups de PII (CPF, nome, número de pedido).
 */
export const piiLookupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userPart = req.user?.id || "anon";
    return `${ipKeyGenerator(req.ip)}:${userPart}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Muitas consultas. Aguarde alguns minutos antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Escritas no CRM (compra, proposta, ocorrência, upload).
 */
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userPart = req.user?.id || "anon";
    return `${ipKeyGenerator(req.ip)}:${userPart}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Muitas submissões. Aguarde alguns minutos antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Download / preview da Central Comercial (arquivos pesados).
 */
export const centralContentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userPart = req.user?.id || "anon";
    return `${ipKeyGenerator(req.ip)}:${userPart}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Muitos downloads. Aguarde alguns minutos antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
});

/**
 * Rate Limiter geral para todas as rotas da API
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Muitas requisições. Aguarde um momento antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
});
