import axios from "axios";
import { ENV } from "../config/env.js";

function portalBaseUrl() {
  return String(ENV.FRONTEND_URL || "").replace(/\/$/, "") || "http://localhost:8081";
}

function offerEmailContent(lead, consultorNome) {
  const minutos = ENV.SLA_OFFER_MINUTES || 10;
  const link = `${portalBaseUrl()}/leads-medicos/${lead.id}`;
  const cidade = [lead.cidade, lead.estado || lead.ufCrm].filter(Boolean).join(" / ");
  const fila = lead.regiao
    ? `da regional ${lead.regiao}`
    : "sem UF/região (fila da Gestão)";
  const subject = `Novo lead ${lead.regiao || "Gestão"} — ${minutos} min para aceitar`.replace(
    /\s+/g,
    " ",
  ).trim();

  const text = [
    `Olá${consultorNome ? `, ${consultorNome}` : ""},`,
    "",
    `Um lead ${fila} foi oferecido a você.`,
    "",
    `Nome: ${lead.nome || "—"}`,
    `Cidade: ${cidade || "—"}`,
    `Você tem ${minutos} minutos para aceitar ou recusar no portal.`,
    "",
    link,
  ].join("\n");

  const html = `
    <p>Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""},</p>
    <p>Um lead <strong>${fila}</strong> foi oferecido a você.</p>
    <ul>
      <li><strong>Nome:</strong> ${lead.nome || "—"}</li>
      <li><strong>Cidade:</strong> ${cidade || "—"}</li>
    </ul>
    <p>Você tem <strong>${minutos} minutos</strong> para aceitar ou recusar.</p>
    <p><a href="${link}">Abrir lead no portal</a></p>
  `;

  return { subject, text, html };
}

async function sendViaMicrosoft({ to, subject, text, html }) {
  const tenant = ENV.GRAPH_MAIL_TENANT_ID;
  const clientId = ENV.GRAPH_MAIL_CLIENT_ID;
  const clientSecret = ENV.GRAPH_MAIL_CLIENT_SECRET;
  const from = ENV.MAIL_FROM;

  if (!tenant || !clientId || !clientSecret || !from) {
    throw new Error(
      "Microsoft Graph incompleto (GRAPH_MAIL_TENANT_ID / CLIENT_ID / CLIENT_SECRET / MAIL_FROM).",
    );
  }

  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 },
  );

  const accessToken = tokenRes.data?.access_token;
  if (!accessToken) throw new Error("Graph não retornou access_token");

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      message: {
        subject,
        body: { contentType: "HTML", content: html || text },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    },
  );
}

async function sendViaResend({ to, subject, text, html }) {
  if (!ENV.RESEND_API_KEY || !ENV.MAIL_FROM) {
    throw new Error("Resend incompleto (RESEND_API_KEY / MAIL_FROM).");
  }

  await axios.post(
    "https://api.resend.com/emails",
    {
      from: ENV.MAIL_FROM,
      to: [to],
      subject,
      text,
      html,
    },
    {
      headers: {
        Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
}

export async function sendEmail({ to, subject, text, html }) {
  const provider = ENV.MAIL_PROVIDER;
  if (!to) return { sent: false, reason: "sem destinatário" };
  if (!provider || provider === "none") {
    return { sent: false, reason: "MAIL_PROVIDER=none" };
  }

  if (provider === "microsoft") {
    await sendViaMicrosoft({ to, subject, text, html });
    return { sent: true, provider };
  }
  if (provider === "resend") {
    await sendViaResend({ to, subject, text, html });
    return { sent: true, provider };
  }

  return { sent: false, reason: `provider desconhecido: ${provider}` };
}

/**
 * Aviso de oferta SLA — nunca derruba o fluxo do lead.
 */
export async function notifyLeadOffer(lead, consultor) {
  const to = consultor?.email || lead?.emailConsultor;
  if (!to) {
    console.warn("[MAIL] Oferta sem e-mail de consultor");
    return { sent: false, reason: "sem e-mail" };
  }

  const { subject, text, html } = offerEmailContent(
    lead,
    consultor?.nome || lead?.consultor,
  );

  try {
    const result = await sendEmail({ to, subject, text, html });
    if (result.sent) {
      console.log(`[MAIL] Oferta enviada (${result.provider}) → ${to}`);
    } else {
      console.log(`[MAIL] Oferta não enviada: ${result.reason}`);
    }
    return result;
  } catch (error) {
    console.error("[MAIL] Falha ao enviar oferta:", error.response?.data || error.message);
    return { sent: false, reason: error.message };
  }
}
