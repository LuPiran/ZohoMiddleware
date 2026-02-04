import express from "express";
import anexarPdfNoCliente from "../services/zohoAttachment.js";

const router = express.Router();

router.post("/upload", async (req, res) => {
  console.log("[UPLOAD ROUTE] Nova requisição de upload recebida");

  try {
    const { clientId, base64 } = req.body;

    if (!clientId || !base64) {
      console.log("[UPLOAD ROUTE] ✗ ERRO: clientId ou base64 não fornecidos");
      return res.status(400).json({
        error: "clientId e base64 são obrigatórios",
      });
    }

    console.log("[UPLOAD ROUTE] Processando upload para Client ID:", clientId);
    const buffer = Buffer.from(base64, "base64");
    console.log(
      "[UPLOAD ROUTE] Buffer criado com tamanho:",
      buffer.length,
      "bytes",
    );

    const result = await anexarPdfNoCliente({
      clientId,
      pdfBuffer: buffer,
      fileName: "invoice.pdf",
    });

    console.log("[UPLOAD ROUTE] ✓ Upload concluído com sucesso");
    res.json({
      success: true,
      zohoResponse: result,
    });
  } catch (error) {
    console.error("[UPLOAD ROUTE] ✗ ERRO na rota de upload:");
    console.error(
      "[UPLOAD ROUTE] Detalhes:",
      error.response?.data || error.message,
    );
    res.status(500).json({ error: "Erro ao anexar PDF" });
  }
});

export default router;
