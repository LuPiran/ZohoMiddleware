import multer from "multer";
import { MAX_EVIDENCIA_BYTES, MAX_EVIDENCIAS } from "../domain/leadEvidencias.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EVIDENCIA_BYTES,
    files: MAX_EVIDENCIAS,
  },
  fileFilter(_req, file, cb) {
    const mime = String(file.mimetype || "").toLowerCase();
    if (!mime.startsWith("image/")) {
      cb(new Error("Apenas imagens são aceitas como evidência."));
      return;
    }
    cb(null, true);
  },
});

export function evidenceUploadMiddleware(req, res, next) {
  upload.array("evidencias", MAX_EVIDENCIAS)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_COUNT"
          ? "É permitido no máximo 5 imagens de evidência."
          : error.code === "LIMIT_FILE_SIZE"
            ? "Cada imagem deve ter no máximo 5 MB."
            : "Não foi possível receber as imagens de evidência.";
      return res.status(400).json({ success: false, error: message });
    }
    if (String(error.message || "").includes("imagens")) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return next(error);
  });
}

