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

export default anexarPdfNoCliente;
