import { ENV } from "../config/env.js";

const BUCKET_DEFAULT = "tegrapharma";

function sanitizeProtocolFolder(protocolo) {
  return String(protocolo || "")
    .replace(/[^0-9A-Za-z\-]/g, "_")
    .slice(0, 120) || "sem_protocolo";
}

/**
 * Remove path traversal e caracteres problemáticos do nome do arquivo.
 */
export function sanitizeStorageFileName(originalName) {
  const base = String(originalName || "arquivo")
    .replace(/[/\\]/g, "")
    .replace(/\.\./g, "")
    .trim();
  const cleaned = base.replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_");
  return cleaned.slice(0, 200) || `arquivo_${Date.now()}`;
}

/**
 * Faz upload dos anexos do formulário para o Storage do Supabase.
 * Estrutura: {Compra|Recompra|Proposta|Ocorrencia}/{protocolo}/{arquivo}
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Object} opts
 * @param {"Compra"|"Recompra"|"Proposta"|"Ocorrencia"} opts.pastaRaiz
 * @param {string} opts.protocolo
 * @param {Array<{ base64: string, fileName: string, contentType?: string }>} opts.arquivos
 * @returns {Promise<{ paths: Array<{ path: string, fileName: string, publicUrl?: string }>, errors: string[] }>}
 */
export async function uploadFormularioArquivosToBucket(supabase, opts) {
  const bucket =
    ENV.SUPABASE_FORMULARIOS_BUCKET?.trim() || BUCKET_DEFAULT;
  const { pastaRaiz, protocolo, arquivos } = opts;

  const paths = [];
  const errors = [];

  if (!supabase || !Array.isArray(arquivos) || arquivos.length === 0) {
    return { paths, errors };
  }

  const folder = sanitizeProtocolFolder(protocolo);
  const prefix = `${pastaRaiz}/${folder}`;

  let index = 0;
  for (const arq of arquivos) {
    if (!arq?.base64 || !arq?.fileName) continue;

    const safeName = sanitizeStorageFileName(arq.fileName);
    index += 1;
    const uniqueName = `${Date.now()}_${index}_${safeName}`;
    const objectPath = `${prefix}/${uniqueName}`;
    const buffer = Buffer.from(arq.base64, "base64");
    if (!buffer.length) {
      errors.push(`Arquivo vazio ou inválido: ${arq.fileName}`);
      continue;
    }

    const contentType = arq.contentType || "application/octet-stream";

    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      errors.push(`${arq.fileName}: ${error.message || String(error)}`);
      continue;
    }

    paths.push({
      path: objectPath,
      fileName: arq.fileName,
      bucket,
    });
  }

  return { paths, errors };
}
