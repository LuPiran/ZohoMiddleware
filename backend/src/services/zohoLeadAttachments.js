import FormData from "form-data";
import { ENV } from "../config/env.js";
import { chamarZohoApi } from "./zohoApi.js";

function extractAttachmentId(payload) {
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  const details = row?.details || {};
  return (
    details?.id ||
    details?.attachment_id ||
    details?.Attachment_Id ||
    row?.details?.id ||
    null
  );
}

export async function uploadLeadAttachmentToZoho({
  idZoho,
  fileName,
  buffer,
  mimeType,
}) {
  const leadId = String(idZoho || "").trim();
  if (!leadId) {
    const err = new Error("idZoho é obrigatório para anexar evidência no Zoho.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const moduleName = ENV.ZOHO_LEADS_MODULE || "Leads_M_dicos";
  const form = new FormData();
  form.append("file", buffer, {
    filename: fileName || "evidencia.jpg",
    contentType: mimeType || "application/octet-stream",
  });

  try {
    const response = await chamarZohoApi(
      "POST",
      `/${moduleName}/${encodeURIComponent(leadId)}/Attachments`,
      form,
      {
        headers: form.getHeaders(),
        timeoutMs: 120000,
      },
    );

    return {
      attachmentId: extractAttachmentId(response),
    };
  } catch (error) {
    const err = new Error(
      `Falha ao anexar evidência no Zoho CRM (${fileName || "arquivo"}).`,
    );
    err.status = error.response?.status || 502;
    err.code = "ZOHO_ATTACHMENT_ERROR";
    err.cause = error;
    throw err;
  }
}
