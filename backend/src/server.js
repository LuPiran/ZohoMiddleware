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
import propostaRoutes from "./routes/proposta.route.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

const app = express();

const __dirname = path.resolve();

// Configuração do CORS
const allowedOrigins = [
  "https://zohomiddleware-x12ad.sevalla.app",
  "http://localhost:5173", // Desenvolvimento local
  "http://localhost:5174", // Desenvolvimento local
  "http://localhost:3000", // Desenvolvimento local
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requisições sem origin (mobile apps, Postman, etc) ou das origens permitidas
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Não permitido pelo CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  }),
);
console.log("[CORS] Configuração CORS aplicada");
console.log("[CORS] Origens permitidas:", allowedOrigins);

app.use(express.json({ limit: "20mb" }));

// Trust proxy para obter IP real do cliente (importante para rate limiting)
app.set("trust proxy", 1);

// Aplica rate limiting geral na API (exceto rotas específicas que têm seu próprio limiter)
app.use("/api", apiRateLimiter);

app.use("/api", uploadRoutes);
app.use("/api/auth", authRoutes);
// A rota de usuários já tem rate limiting aplicado no nível da rota se necessário
app.use("/api/users", usersRoutes);
app.use("/api/cep", cepRoutes);
app.use("/api/compra", compraRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/ocorrencia", ocorrenciaRoutes);
app.use("/api/proposta", propostaRoutes);

//??Prepare a nossa aplicação para implementação
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../admin/dist")));

  // Rota catch-all para servir o frontend em produção
  // Deve vir ANTES do tratamento de erros
  // Usando regex para compatibilidade com Express 5.x
  app.get(/^\/(?!api).*/, (req, res) => {
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
      error: err.message || "Serviço temporariamente indisponível. Tente novamente em alguns instantes.",
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
  if (req.path.startsWith("/api")) {
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
  console.log("========================================");
});
