import rateLimit from "express-rate-limit";

/**
 * Rate limiter para login - previne brute force attacks
 * Permite 5 tentativas por IP a cada 15 minutos
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo de 5 tentativas por IP
  message: {
    success: false,
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Conta todas as requisições, mesmo as bem-sucedidas
});

/**
 * Rate limiter geral para API
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de 100 requisições por IP
  message: {
    success: false,
    error: "Muitas requisições. Tente novamente mais tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
