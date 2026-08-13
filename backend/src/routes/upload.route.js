import express from "express";
import anexarPdfNoCliente from "../services/zohoAttachment.js";
import { isAdminPainel } from "../middleware/authz.js";
import { logSecurityEvent } from "../utils/security.js";

const router = express.Router();

const MAX_PDF_BYTES = Number.parseInt(
  process.env.UPLOAD_MAX_BYTES || String(5 * 1024 * 1024),
  10,
);

function isValidZohoId(clientId) {
  return /^[0-9]{6,32}$/.test(String(clientId || "").trim());
}

function looksLikePdf(buffer) {
  if (!buffer || buffer.length < 5) return false;
  // %PDF-
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

/**
 * Upload de invoice PDF para um Client ID Zoho.
 * Mitigações IDOR:
 * - JWT obrigatório (mount)
 * - clientId estritamente numérico Zoho
 * - tamanho máximo + magic bytes PDF
 * - auditoria user→clientId
 * - não-admin: exige confirmação explícita do mesmo clientId em `confirmClientId`
 *   (reduz uploads cegos / scripts com ID adivinhado)
 */
router.post("/", async (req, res) => {
  console.log("[UPLOAD ROUTE] Nova requisição de upload recebida");

  try {
    const { clientId, base64, confirmClientId } = req.body || {};
    const userId = req.user?.id || "unknown";
    const userEmail = req.user?.email || "unknown";

    if (!clientId || !base64) {
      return res.status(400).json({
        success: false,
        error: "clientId e base64 são obrigatórios",
      });
    }

    if (!isValidZohoId(clientId)) {
      return res.status(400).json({
        success: false,
        error: "clientId inválido",
      });
    }

    if (!isAdminPainel(req.user)) {
      if (String(confirmClientId || "") !== String(clientId)) {
        console.warn(
          `[SECURITY][IDOR] Upload sem confirmClientId user=${userId} clientId=${clientId} ip=${req.ip}`,
        );
        return res.status(403).json({
          success: false,
          error:
            "Confirmação do clientId obrigatória. Envie confirmClientId igual ao clientId.",
        });
      }
    }

    if (typeof base64 !== "string" || base64.length > MAX_PDF_BYTES * 2) {
      return res.status(400).json({
        success: false,
        error: "Arquivo muito grande ou inválido",
      });
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) {
      return res.status(400).json({
        success: false,
        error: `PDF deve ter entre 1 byte e ${MAX_PDF_BYTES} bytes`,
      });
    }

    if (!looksLikePdf(buffer)) {
      return res.status(400).json({
        success: false,
        error: "Conteúdo não é um PDF válido",
      });
    }

    console.log(
      `[UPLOAD ROUTE] user=${userId} email=${userEmail} clientId=${clientId} bytes=${buffer.length}`,
    );
    logSecurityEvent(userEmail, req.ip, true);

    const result = await anexarPdfNoCliente({
      clientId: String(clientId).trim(),
      pdfBuffer: buffer,
      fileName: "invoice.pdf",
    });

    return res.json({
      success: true,
      zohoResponse: result,
    });
  } catch (error) {
    console.error("[UPLOAD ROUTE] ✗ ERRO:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: "Erro ao anexar PDF",
    });
  }
});

export default router;
