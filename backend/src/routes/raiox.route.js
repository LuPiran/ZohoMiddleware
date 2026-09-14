import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Serve o "Raio-X do Portal" — documentação técnica completa (arquitetura,
 * schema do banco, modelos de e-mail, lacunas de segurança conhecidas).
 *
 * Rota montada com authenticateToken + requireAdmin (ver server.js), igual
 * a /v1/users e /v1/zoho — só Admin Painel acessa. O arquivo é estático,
 * gerado fora do Portal e versionado em backend/src/private/, nunca
 * exposto por um caminho público do Nginx.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIOX_PATH = path.join(__dirname, "../private/raiox-portal.html");

let cachedHtml = null;
let loadError = null;

function loadRaiox() {
  if (cachedHtml || loadError) return;
  try {
    cachedHtml = fs.readFileSync(RAIOX_PATH, "utf-8");
  } catch (err) {
    loadError = err;
  }
}

const router = express.Router();

router.get("/", (req, res) => {
  loadRaiox();

  if (!cachedHtml) {
    console.error("[RAIOX] arquivo não encontrado:", loadError?.message);
    return res.status(404).json({
      success: false,
      error: "Documento não encontrado.",
    });
  }

  console.log(
    `[RAIOX] acesso por user=${req.user?.id} email=${req.user?.email} ip=${req.ip}`,
  );

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(cachedHtml);
});

export default router;
