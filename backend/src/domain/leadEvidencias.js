export const MAX_EVIDENCIAS = 5;
export const MIN_EVIDENCIAS = 1;
export const MAX_EVIDENCIA_BYTES = 5 * 1024 * 1024;

export const ALLOWED_EVIDENCE_MIME = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAGIC = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
  { mime: "image/webp", offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
];

function validationError(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = "VALIDATION_ERROR";
  return err;
}

export function detectImageMime(buffer, declaredMime) {
  if (!buffer || buffer.length < 12) return null;
  for (const rule of MAGIC) {
    const offset = rule.offset || 0;
    const match = rule.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (match) return rule.mime === "image/jpg" ? "image/jpeg" : rule.mime;
  }
  const declared = String(declaredMime || "").toLowerCase();
  if (declared === "image/webp" && buffer.slice(0, 4).toString("ascii") === "RIFF") {
    return "image/webp";
  }
  return null;
}

export function extensionForMime(mime) {
  return ALLOWED_EVIDENCE_MIME[mime] || "jpg";
}

export function assertEvidenceFiles(files, { required = true } = {}) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (required && list.length < MIN_EVIDENCIAS) {
    throw validationError(
      "Envie pelo menos 1 imagem de evidência (máximo 5).",
    );
  }
  if (list.length > MAX_EVIDENCIAS) {
    throw validationError("É permitido no máximo 5 imagens de evidência.");
  }

  return list.map((file, index) => {
    const buffer = file.buffer;
    if (!buffer?.length) {
      throw validationError(`Arquivo ${index + 1} está vazio.`);
    }
    if (buffer.length > MAX_EVIDENCIA_BYTES) {
      throw validationError(
        `A imagem ${index + 1} ultrapassa 5 MB. Reduza o tamanho e tente novamente.`,
      );
    }
    const mime = detectImageMime(buffer, file.mimetype);
    if (!mime || !ALLOWED_EVIDENCE_MIME[mime]) {
      throw validationError(
        `O arquivo ${index + 1} não é uma imagem válida. Use JPG, PNG, WEBP ou GIF.`,
      );
    }
    return {
      buffer,
      mimeType: mime,
      originalName: file.originalname || `evidencia-${index + 1}`,
      size: buffer.length,
    };
  });
}

export function nextEvidenceIndex(lead) {
  const items = Array.isArray(lead?.evidencias) ? lead.evidencias : [];
  const max = items.reduce((acc, item) => {
    const n = Number(item?.n);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return max + 1;
}
