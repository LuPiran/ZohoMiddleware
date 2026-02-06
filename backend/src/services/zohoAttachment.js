import axios from "axios";
import FormData from "form-data";
import gerarAcessToken from "../zoho/auth.js";

/**
 * Anexa um PDF no módulo Contacts do Zoho CRM
 */
async function anexarPdfNoCliente({ clientId, pdfBuffer, fileName }) {
  console.log("[ZOHO ATTACHMENT] Iniciando anexo de PDF...");
  console.log("[ZOHO ATTACHMENT] Client ID:", clientId);
  console.log("[ZOHO ATTACHMENT] File Name:", fileName);
  console.log("[ZOHO ATTACHMENT] Buffer Size:", pdfBuffer.length, "bytes");

  const accessToken = await gerarAcessToken();

  const url = `https://www.zohoapis.com/crm/v2/Contacts/${clientId}/Attachments`;
  console.log("[ZOHO ATTACHMENT] URL:", url);

  const form = new FormData();
  form.append("file", pdfBuffer, {
    filename: fileName,
    contentType: "application/pdf",
  });

  try {
    const response = await axios.post(url, form, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        ...form.getHeaders(),
      },
    });

    console.log("[ZOHO ATTACHMENT] ✓ Sucesso! PDF anexado com sucesso");
    console.log("[ZOHO ATTACHMENT] Status:", response.status);
    return response.data;
  } catch (error) {
    console.error("[ZOHO ATTACHMENT] ✗ ERRO ao anexar PDF:");
    console.error("[ZOHO ATTACHMENT] Status:", error.response?.status);
    console.error(
      "[ZOHO ATTACHMENT] Mensagem:",
      error.response?.data || error.message,
    );
    console.error("[ZOHO ATTACHMENT] Client ID:", clientId);
    throw error;
  }
}

/**
 * Anexa arquivos em um módulo específico do Zoho CRM
 * @param {string} moduleName - Nome do módulo (ex: "Portal_onix", "Contacts")
 * @param {string} recordId - ID do registro no Zoho
 * @param {Array<{buffer: Buffer, fileName: string, contentType: string}>} arquivos - Array de arquivos para anexar
 * @returns {Promise<Array>} - Array de respostas do Zoho
 */
export async function anexarArquivosNoRegistro({
  moduleName,
  recordId,
  arquivos,
}) {
  if (!arquivos || arquivos.length === 0) {
    return [];
  }

  console.log(
    `[ZOHO ATTACHMENT] Iniciando anexo de ${arquivos.length} arquivo(s) no módulo ${moduleName}...`,
  );
  console.log("[ZOHO ATTACHMENT] Record ID:", recordId);

  const accessToken = await gerarAcessToken();
  const url = `https://www.zohoapis.com/crm/v2/${moduleName}/${recordId}/Attachments`;

  const resultados = [];

  for (const arquivo of arquivos) {
    try {
      const form = new FormData();
      form.append("file", arquivo.buffer, {
        filename: arquivo.fileName,
        contentType: arquivo.contentType || "application/octet-stream",
      });

      const response = await axios.post(url, form, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          ...form.getHeaders(),
        },
      });

      console.log(
        `[ZOHO ATTACHMENT] ✓ Arquivo ${arquivo.fileName} anexado com sucesso`,
      );
      resultados.push({
        success: true,
        fileName: arquivo.fileName,
        data: response.data,
      });
    } catch (error) {
      console.error(
        `[ZOHO ATTACHMENT] ✗ ERRO ao anexar arquivo ${arquivo.fileName}:`,
      );
      console.error(
        "[ZOHO ATTACHMENT] Mensagem:",
        error.response?.data || error.message,
      );
      resultados.push({
        success: false,
        fileName: arquivo.fileName,
        error: error.response?.data || error.message,
      });
    }
  }

  return resultados;
}

export default anexarPdfNoCliente;
