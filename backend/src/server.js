import express from "express";
import path from "path";
import cors from "cors";
import { ENV } from "./config/env.js";
import uploadRoutes from "./routes/upload.route.js";
import authRoutes from "./routes/auth.route.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

const app = express();

const __dirname = path.resolve();

// Configuração do CORS - permite todas as origens em desenvolvimento
app.use(
  cors({
    origin: "*", // Permite todas as origens em desenvolvimento
    credentials: false,
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
console.log("[CORS] Configuração CORS aplicada - permitindo todas as origens");

app.use(express.json({ limit: "20mb" }));

// Trust proxy para obter IP real do cliente (importante para rate limiting)
app.set("trust proxy", 1);

// Aplica rate limiting geral na API
app.use("/api", apiRateLimiter);

app.use("/api", uploadRoutes);
app.use("/api/auth", authRoutes);

//??Prepare a nossa aplicação para implementação
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../admin/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../admin", "dist", "index.html"));
  });
}

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
