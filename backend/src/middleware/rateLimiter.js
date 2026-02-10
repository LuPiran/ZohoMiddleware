import rateLimit from "express-rate-limit";

/**
 * Rate Limiter para a rota de login
 * - Máximo de 10 tentativas por IP a cada 15 minutos
 * - Apenas tentativas falhadas contam (skipSuccessfulRequests: true)
 * - Mensagem de erro clara quando o limite é excedido
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo de 10 tentativas
  skipSuccessfulRequests: true, // Apenas tentativas falhadas contam
  message: {
    error:
      "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Não usa headers `X-RateLimit-*`
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
 * Rate Limiter geral para todas as rotas da API
 * - Máximo de 200 requisições por IP a cada 15 minutos (aumentado para produção)
 * - Protege contra abuso geral da API
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Máximo de 200 requisições (aumentado para suportar mais carga)
  message: {
    error: "Muitas requisições. Aguarde um momento antes de tentar novamente.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Não usa headers `X-RateLimit-*`
  // Permite skip para rotas específicas se necessário
  skip: (req) => {
    // Pula rate limiting para health checks ou rotas específicas se necessário
    return false;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Muitas requisições. Aguarde um momento antes de tentar novamente.",
      retryAfter: "15 minutos",
    });
  },
});
