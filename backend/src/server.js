import express from "express";
import path from "path";
import cors from "cors";
import { ENV } from "./config/env.js";
import uploadRoutes from "./routes/upload.route.js";
import authRoutes from "./routes/auth.route.js";
import usersRoutes from "./routes/users.route.js";
import cepRoutes from "./routes/cep.route.js";
import compraRoutes from "./routes/compra.route.js";
import productsRoutes from "./routes/products.route.js";
import ocorrenciaRoutes from "./routes/ocorrencia.route.js";
import salesOrderRoutes from "./routes/salesOrder.route.js";
import propostaRoutes from "./routes/proposta.route.js";
import savedFormsRoutes from "./routes/savedForms.route.js";
import zohoRoutes from "./routes/zoho.route.js";
import leadsMedicosRoutes from "./routes/leadsMedicos.route.js";
import { startSlaSweeper } from "./services/slaSweeper.js";
import { authenticateToken } from "./services/jwtService.js";
import { requireAdmin } from "./middleware/authz.js";
import {
  applySecurityMiddleware,
  createCorsOriginChecker,
} from "./middleware/securityHeaders.js";
import {
  apiRateLimiter,
  writeRateLimiter,
  piiLookupRateLimiter,
} from "./middleware/rateLimiter.js";

const app = express();

const __dirname = path.resolve();
const shouldServeFrontend =
  ENV.NODE_ENV === "production" && ENV.SERVE_FRONTEND === "true";

const allowedOrigins = [
  "https://portaldoconsultor.tegrapharma.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://18.220.136.160",
  String(ENV.FRONTEND_URL || "").replace(/\/$/, ""),
].filter(Boolean);

function isLocalNetworkOrigin(origin) {
  if (!origin) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(
    origin,
  );
}

app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));

applySecurityMiddleware(app);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

app.use(
  cors({
    origin: createCorsOriginChecker(allowedOrigins, isLocalNetworkOrigin),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Webhook-Secret",
      "X-Api-Key",
      "X-Request-Id",
    ],
  }),
);
console.log("[CORS] Configuração CORS aplicada");
console.log("[CORS] Origens permitidas:", allowedOrigins);

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "2mb";
const uploadBodyLimit = process.env.UPLOAD_BODY_LIMIT || "6mb";

app.use("/v1/upload", express.json({ limit: uploadBodyLimit }));
app.use(express.json({ limit: jsonBodyLimit }));

app.use("/v1", apiRateLimiter);

app.use("/v1/auth", authRoutes);
app.use("/v1/users", authenticateToken, requireAdmin, usersRoutes);
app.use("/v1/compra", authenticateToken, compraRoutes);
app.use("/v1/proposta", authenticateToken, propostaRoutes);
app.use("/v1/ocorrencia", authenticateToken, ocorrenciaRoutes);
app.use(
  "/v1/sales-orders",
  authenticateToken,
  piiLookupRateLimiter,
  salesOrderRoutes,
);
app.use("/v1/products", authenticateToken, productsRoutes);
app.use("/v1/cep", authenticateToken, cepRoutes);
app.use("/v1/zoho", authenticateToken, requireAdmin, zohoRoutes);
app.use("/v1/leads-medicos", leadsMedicosRoutes);
app.use("/v1/saved-forms", savedFormsRoutes);
app.use("/v1/upload", authenticateToken, writeRateLimiter, uploadRoutes);

//??Prepare a nossa aplicação para implementação
if (shouldServeFrontend) {
  app.use(express.static(path.join(__dirname, "../admin/dist")));

  // Rota catch-all para servir o frontend em produção
  // Deve vir ANTES do tratamento de erros
  // Usando regex para compatibilidade com Express 5.x
  app.get(/^\/(?!v1).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "../admin", "dist", "index.html"));
  });
}

// Middleware de tratamento de erros do CORS
app.use((err, req, res, next) => {
  if (err.message === "Não permitido pelo CORS") {
    return res.status(403).json({
      success: false,
      error: "Origem não permitida pelo CORS",
    });
  }
  next(err);
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error("[SERVER] Erro não tratado:", err);
  console.error("[SERVER] Stack:", err.stack);

  // Se a resposta já foi enviada, delega para o handler padrão do Express
  if (res.headersSent) {
    return next(err);
  }

  // Erros de timeout ou conexão OU erros com status 503
  if (
    err.status === 503 ||
    err.code === "ECONNABORTED" ||
    err.code === "ECONNRESET" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND" ||
    err.code === "ECONNREFUSED" ||
    err.message?.includes("timeout")
  ) {
    return res.status(503).json({
      success: false,
      error:
        err.message ||
        "Serviço temporariamente indisponível. Tente novamente em alguns instantes.",
    });
  }

  // Erros de validação
  if (err.status === 400 || err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: err.message || "Dados inválidos",
    });
  }

  // Erros não autorizados
  if (err.status === 401 || err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      error: "Não autorizado",
    });
  }

  // Erro genérico do servidor
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Erro interno do servidor",
    ...(ENV.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Rota 404 para rotas não encontradas (apenas para rotas da API)
app.use((req, res) => {
  if (req.path.startsWith("/v1")) {
    return res.status(404).json({
      success: false,
      error: "Rota não encontrada",
      path: req.path,
    });
  }
  // Se não for rota da API e não estiver em produção, retorna 404
  if (ENV.NODE_ENV !== "production") {
    return res.status(404).json({
      success: false,
      error: "Rota não encontrada",
      path: req.path,
    });
  }
  // Em produção, se chegou aqui e não é API, já foi tratado pelo catch-all acima
  res.status(404).json({
    success: false,
    error: "Rota não encontrada",
  });
});

app.listen(ENV.PORT, () => {
  startSlaSweeper();
  console.log("========================================");
  console.log("🚀 Server está rodando na porta", ENV.PORT);
  console.log("========================================");
  console.log("[CONFIG] Verificando configurações da Zoho:");
  console.log(
    "[CONFIG] ZOHO_CLIENT_ID:",
    ENV.ZOHO_CLIENT_ID ? "✓ Configurado" : "✗ Não configurado",
  );
  console.log(
    "[CONFIG] ZOHO_CLIENT_SECRET:",
    ENV.ZOHO_CLIENT_SECRET ? "✓ Configurado" : "✗ Não configurado",
  );
  console.log(
    "[CONFIG] ZOHO_REFRESH_TOKEN:",
    ENV.ZOHO_REFRESH_TOKEN ? "✓ Configurado" : "✗ Não configurado",
  );
  console.log(
    "[CONFIG] ZOHO_API_BASE:",
    ENV.ZOHO_API_BASE || "✗ Não configurado",
  );
  console.log(
    "[CONFIG] ZOHO_ACCOUNTS_URL:",
    ENV.ZOHO_ACCOUNTS_URL || "✗ Não configurado",
  );
  console.log("[CONFIG] DynamoDB / Leads:");
  console.log("[CONFIG] AWS_REGION:", ENV.AWS_REGION);
  console.log("[CONFIG] DYNAMODB_LEADS_TABLE:", ENV.DYNAMODB_LEADS_TABLE);
  console.log(
    "[CONFIG] AWS_ACCESS_KEY_ID:",
    ENV.AWS_ACCESS_KEY_ID ? "✓ Configurado" : "○ IAM role / profile (sem key no .env)",
  );
  console.log(
    "[CONFIG] ZOHO_LEADS_WEBHOOK_SECRET:",
    ENV.ZOHO_LEADS_WEBHOOK_SECRET ? "✓ Configurado" : "✗ Não configurado",
  );
  console.log("========================================");
});
