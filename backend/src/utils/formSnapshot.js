/**
 * Remove payloads pesados (base64) e mantém metadados para persistir snapshot do formulário.
 */
export function sanitizeFormBodyForStorage(body) {
  if (!body || typeof body !== "object") return {};
  const { arquivos, ...rest } = body;
  const out = { ...rest };
  if (Array.isArray(arquivos)) {
    out.arquivos = arquivos.map((a) => ({
      fileName: a?.fileName,
      contentType: a?.contentType,
    }));
  }
  return out;
}
