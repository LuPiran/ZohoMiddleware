import helmet from "helmet";
import { randomUUID } from "crypto";
import { ENV } from "../config/env.js";

/**
 * Headers de segurança (Helmet) + request id + defaults HTTP seguros.
 */
export function applySecurityMiddleware(app) {
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const incoming = req.get("x-request-id");
    const requestId =
      incoming && /^[a-zA-Z0-9_-]{8,64}$/.test(incoming)
        ? incoming
        : randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP no nginx do admin; API é JSON
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts:
        ENV.NODE_ENV === "production"
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
    }),
  );

  // Bloqueia métodos perigosos / não usados
  app.use((req, res, next) => {
    const allowed = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
    if (!allowed.includes(req.method)) {
      return res.status(405).json({
        success: false,
        error: "Método não permitido",
      });
    }
    return next();
  });
}

/**
 * CORS mais restrito em produção.
 */
export function createCorsOriginChecker(allowedOrigins, isLocalNetworkOrigin) {
  const isProd = ENV.NODE_ENV === "production";

  return function corsOrigin(origin, callback) {
    if (!origin) {
      // Em produção, requests sem Origin (server-to-server / webhooks) são OK;
      // browsers sempre enviam Origin em CORS cross-site.
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (!isProd && isLocalNetworkOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Não permitido pelo CORS"));
  };
}
