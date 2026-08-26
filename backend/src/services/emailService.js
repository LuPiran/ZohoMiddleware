import axios from "axios";
import { ENV } from "../config/env.js";
import { findConsultoresGestao } from "./consultores.js";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function portalBaseUrl() {
  return String(ENV.FRONTEND_URL || "").replace(/\/$/, "") || "http://localhost:8081";
}

function leadPortalUrl(leadId) {
  return `${portalBaseUrl()}/leads-medicos/${leadId}`;
}

async function getGestaoEmails() {
  try {
    const gestao = await findConsultoresGestao();
    return gestao.map((c) => c.email).filter(Boolean);
  } catch {
    return [];
  }
}

async function sendEmailToMany(emails, payload) {
  const targets = [...new Set(emails.filter(Boolean))];
  if (!targets.length) return;
  await Promise.allSettled(targets.map((to) => sendEmail({ to, ...payload })));
}

/* ─── Status → cor ─────────────────────────────────────────────────────── */

const STATUS_COLORS = {
  "Lead Em Qualificação":  { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  "Lead Com Interesse":    { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  "Lead Sem Contato":      { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  "Lead Sem Interesse":    { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  "Lead Convertido":       { bg: "#dcfce7", text: "#14532d", dot: "#22c55e" },
  "Lead Rejeitado":        { bg: "#fee2e2", text: "#7f1d1d", dot: "#dc2626" },
  "Lead Sem Tratativa":    { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" },
  "Novo Lead":             { bg: "#eff6ff", text: "#1e3a8a", dot: "#1a2f5b" },
};

function statusBadge(status) {
  const c = STATUS_COLORS[status] || { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" };
  return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:${c.bg};color:${c.text};font-size:13px;font-weight:600;">
    <span style="width:8px;height:8px;border-radius:50%;background:${c.dot};display:inline-block;"></span>
    ${status || "—"}
  </span>`;
}

/* ─── Template HTML base ────────────────────────────────────────────────── */

function buildHtml({ badgeStatus, title, intro, leadInfo, bodyExtra = "", ctaUrl, ctaLabel, footerNote = "" }) {
  const { nome, cidade, estado, especialidade, consultor } = leadInfo || {};
  const cidadeStr = [cidade, estado].filter(Boolean).join(" / ");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#1a2f5b;border-radius:12px 12px 0 0;padding:28px 32px;">
            <p style="margin:0;color:#8FA9C1;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Portal do Consultor</p>
            <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">TegraPharma<span style="color:#E5989B;">Corp</span></p>
          </td>
        </tr>

        <!-- Faixa gradiente -->
        <tr>
          <td style="height:3px;background:linear-gradient(90deg,#8FA9C1,#E5989B);"></td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="background:#ffffff;padding:32px;">

            <!-- Badge de status -->
            ${badgeStatus ? `<p style="margin:0 0 20px;">${statusBadge(badgeStatus)}</p>` : ""}

            <!-- Título -->
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a2f5b;line-height:1.3;">${title}</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${intro}</p>

            <!-- Card do lead -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e2e8f0;border-left:4px solid #8FA9C1;border-radius:8px;margin-bottom:24px;background:#f8fafc;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="4" cellspacing="0">
                    ${nome ? `<tr>
                      <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;width:110px;white-space:nowrap;">Paciente</td>
                      <td style="font-size:14px;color:#1e293b;font-weight:600;">${nome}</td>
                    </tr>` : ""}
                    ${cidadeStr ? `<tr>
                      <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Cidade</td>
                      <td style="font-size:14px;color:#334155;">${cidadeStr}</td>
                    </tr>` : ""}
                    ${especialidade ? `<tr>
                      <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Especialidade</td>
                      <td style="font-size:14px;color:#334155;">${especialidade}</td>
                    </tr>` : ""}
                    ${consultor ? `<tr>
                      <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Consultor</td>
                      <td style="font-size:14px;color:#334155;">${consultor}</td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            ${bodyExtra}

            <!-- CTA -->
            ${ctaUrl ? `<p style="margin:0;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;padding:13px 28px;background:#1a2f5b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.02em;">
                ${ctaLabel || "Abrir no Portal →"}
              </a>
            </p>` : ""}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              TegraPharma Corp · Portal do Consultor<br>
              ${footerNote ? `<span style="color:#cbd5e1;">${footerNote}</span><br>` : ""}
              <span style="color:#cbd5e1;">Este é um e-mail automático, não responda.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

/* ─── Conteúdo por evento ───────────────────────────────────────────────── */

function leadInfoFrom(lead) {
  return {
    nome: lead?.nome || null,
    cidade: lead?.cidade || null,
    estado: lead?.estado || lead?.ufCrm || null,
    especialidade: lead?.especialidade || null,
    consultor: lead?.consultor || null,
  };
}

// 1. Oferta SLA → consultor
function contentLeadOffer(lead, consultorNome) {
  const minutos = ENV.SLA_OFFER_MINUTES || 10;
  const fila = lead.regiao ? `da regional ${lead.regiao}` : "sem UF/região (fila da Gestão)";
  return {
    subject: `Novo lead ${lead.regiao || "Gestão"} — ${minutos} min para aceitar`,
    html: buildHtml({
      badgeStatus: "Novo Lead",
      title: `Novo lead aguardando sua resposta`,
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! Um lead <strong>${fila}</strong> foi oferecido a você. Você tem <strong>${minutos} minutos</strong> para aceitar ou recusar no portal.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Aceitar ou Recusar Lead →",
      footerNote: `Prazo: ${minutos} minutos a partir do recebimento deste e-mail.`,
    }),
  };
}

// 1b. Oferta SLA → gestão (aviso informativo)
function contentLeadOfferGestao(lead, consultorNome) {
  const minutos = ENV.SLA_OFFER_MINUTES || 10;
  return {
    subject: `Lead oferecido a ${consultorNome || "consultor"} — ${lead.regiao || "Gestão"}`,
    html: buildHtml({
      badgeStatus: "Novo Lead",
      title: `Lead distribuído para consultor`,
      intro: `O lead abaixo foi oferecido a <strong>${consultorNome || "um consultor"}</strong> com prazo de <strong>${minutos} minutos</strong> para aceite.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 2. Lead aceito → consultor (confirmação)
function contentLeadAceitoConsultor(lead, consultorNome) {
  return {
    subject: `Lead aceito — ${lead.nome || "Lead"} em qualificação`,
    html: buildHtml({
      badgeStatus: "Lead Em Qualificação",
      title: "Lead aceito com sucesso!",
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! Você confirmou o recebimento do lead abaixo. Ele já está na sua carteira e aguarda qualificação.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Abrir Lead →",
    }),
  };
}

// 2b. Lead aceito → gestão
function contentLeadAceitoGestao(lead, consultorNome) {
  return {
    subject: `Lead aceito por ${consultorNome || "consultor"} — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: "Lead Em Qualificação",
      title: `Lead aceito por ${consultorNome || "consultor"}`,
      intro: `O lead abaixo foi aceito por <strong>${consultorNome || "um consultor"}</strong> e está em processo de qualificação.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 3. Lead recusado → gestão
function contentLeadRecusado(lead, consultorNome) {
  return {
    subject: `Lead recusado — ${lead.nome || "Lead"} retornou à fila`,
    html: buildHtml({
      badgeStatus: "Lead Rejeitado",
      title: "Lead recusado pelo consultor",
      intro: `<strong>${consultorNome || "Um consultor"}</strong> recusou o lead abaixo. O lead foi encerrado no portal e devolvido ao Zoho CRM.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 4. Tentativa registrada → consultor
function contentTentativa(lead, consultorNome, n) {
  const ordinals = ["", "Primeira", "Segunda", "Terceira", "Quarta"];
  const label = ordinals[n] || `${n}ª`;
  return {
    subject: `${label} tentativa registrada — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: lead.status,
      title: `${label} tentativa de contato registrada`,
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! A <strong>${label.toLowerCase()} tentativa</strong> de contato com o lead abaixo foi registrada com sucesso no portal.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver histórico →",
    }),
  };
}

// 5. Mudança de status → consultor
function contentStatusChange(lead, consultorNome, novoStatus) {
  return {
    subject: `Status atualizado — ${novoStatus} · ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: novoStatus,
      title: "Status do lead atualizado",
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! O lead abaixo teve seu status atualizado para <strong>${novoStatus}</strong>.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 6. Lead convertido → consultor + gestão
function contentLeadConvertido(lead, consultorNome, paraGestao = false) {
  return {
    subject: `🎉 Lead convertido — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: "Lead Convertido",
      title: paraGestao
        ? `Lead convertido por ${consultorNome || "consultor"}!`
        : "Parabéns — lead convertido!",
      intro: paraGestao
        ? `O lead abaixo foi convertido com sucesso por <strong>${consultorNome || "um consultor"}</strong>. Resultado registrado no Zoho CRM.`
        : `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! O lead abaixo foi convertido com sucesso. Excelente trabalho! 🎉`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 7. Lead sem tratativa (timeout) → consultor + gestão
function contentLeadSemTratativa(lead, consultorNome, paraGestao = false) {
  return {
    subject: `Lead sem tratativa — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: "Lead Sem Tratativa",
      title: paraGestao
        ? `Lead sem tratativa — ${consultorNome || "consultor"}`
        : "Lead encerrado por inatividade",
      intro: paraGestao
        ? `O lead abaixo foi encerrado por inatividade. O consultor responsável (<strong>${consultorNome || "—"}</strong>) não realizou as tentativas dentro do prazo.`
        : `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! O lead abaixo foi encerrado pois o prazo de tentativas se esgotou sem ação registrada.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

/* ─── Providers ──────────────────────────────────────────────────────────── */

async function sendViaMicrosoft({ to, subject, html }) {
  const tenant = ENV.GRAPH_MAIL_TENANT_ID;
  const clientId = ENV.GRAPH_MAIL_CLIENT_ID;
  const clientSecret = ENV.GRAPH_MAIL_CLIENT_SECRET;
  const from = ENV.MAIL_FROM;

  if (!tenant || !clientId || !clientSecret || !from) {
    throw new Error("Microsoft Graph incompleto (GRAPH_MAIL_TENANT_ID / CLIENT_ID / CLIENT_SECRET / MAIL_FROM).");
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
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 },
  );
}

async function sendViaResend({ to, subject, html }) {
  if (!ENV.RESEND_API_KEY || !ENV.MAIL_FROM) {
    throw new Error("Resend incompleto (RESEND_API_KEY / MAIL_FROM).");
  }
  await axios.post(
    "https://api.resend.com/emails",
    { from: ENV.MAIL_FROM, to: [to], subject, html },
    {
      headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json" },
      timeout: 15000,
    },
  );
}

/* ─── sendEmail (base) ───────────────────────────────────────────────────── */

export async function sendEmail({ to, subject, html, text }) {
  const provider = ENV.MAIL_PROVIDER;
  if (!to) return { sent: false, reason: "sem destinatário" };
  if (!provider || provider === "none") return { sent: false, reason: "MAIL_PROVIDER=none" };

  const htmlContent = html || (text ? `<pre>${text}</pre>` : "<p>—</p>");

  if (provider === "microsoft") {
    await sendViaMicrosoft({ to, subject, html: htmlContent });
    return { sent: true, provider };
  }
  if (provider === "resend") {
    await sendViaResend({ to, subject, html: htmlContent });
    return { sent: true, provider };
  }
  return { sent: false, reason: `provider desconhecido: ${provider}` };
}

/* ─── Notificações públicas ──────────────────────────────────────────────── */

/**
 * Lead oferecido ao consultor (SLA timer).
 * Dispara também para a gestão como aviso informativo.
 */
export async function notifyLeadOffer(lead, consultor) {
  const to = consultor?.email || lead?.emailConsultor;
  const nome = consultor?.nome || lead?.consultor;

  // Consultor
  if (to) {
    const { subject, html } = contentLeadOffer(lead, nome);
    try {
      const result = await sendEmail({ to, subject, html });
      if (result.sent) console.log(`[MAIL] Oferta → ${to}`);
      else console.log(`[MAIL] Oferta não enviada: ${result.reason}`);
    } catch (err) {
      console.error("[MAIL] Falha oferta consultor:", err.response?.data || err.message);
    }
  } else {
    console.warn("[MAIL] Oferta sem e-mail de consultor");
  }

  // Gestão (fire-and-forget)
  const gestaoEmails = await getGestaoEmails();
  if (gestaoEmails.length) {
    const { subject, html } = contentLeadOfferGestao(lead, nome);
    void sendEmailToMany(gestaoEmails, { subject, html }).catch(() => {});
  }

  return { sent: Boolean(to) };
}

/** Consultor aceitou o lead. */
export async function notifyLeadAceito(lead, user) {
  const consultorNome = lead?.consultor || user?.name || null;
  const emailConsultor = lead?.emailConsultor || user?.email || null;

  // Consultor — confirmação
  if (emailConsultor) {
    const { subject, html } = contentLeadAceitoConsultor(lead, consultorNome);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] Aceite consultor:", err.message),
    );
  }

  // Gestão — aviso
  const gestaoEmails = await getGestaoEmails();
  if (gestaoEmails.length) {
    const { subject, html } = contentLeadAceitoGestao(lead, consultorNome);
    sendEmailToMany(gestaoEmails, { subject, html }).catch(() => {});
  }
}

/** Consultor recusou o lead → só gestão. */
export async function notifyLeadRecusado(lead, user) {
  const consultorNome = lead?.consultor || user?.name || user?.email || null;
  const gestaoEmails = await getGestaoEmails();
  if (!gestaoEmails.length) return;
  const { subject, html } = contentLeadRecusado(lead, consultorNome);
  sendEmailToMany(gestaoEmails, { subject, html }).catch(() => {});
}

/** Tentativa de contato registrada (1ª, 2ª ou 3ª) → só consultor. */
export async function notifyTentativa(lead, n, user) {
  const emailConsultor = lead?.emailConsultor || user?.email || null;
  if (!emailConsultor) return;
  const consultorNome = lead?.consultor || user?.name || null;
  const { subject, html } = contentTentativa(lead, consultorNome, n);
  sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
    console.error("[MAIL] Tentativa:", err.message),
  );
}

/** Mudança de status (sem interesse, sem contato) → só consultor. */
export async function notifyStatusChange(lead, user, novoStatus) {
  const emailConsultor = lead?.emailConsultor || user?.email || null;
  if (!emailConsultor) return;
  const consultorNome = lead?.consultor || user?.name || null;
  const { subject, html } = contentStatusChange(lead, consultorNome, novoStatus);
  sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
    console.error("[MAIL] Status change:", err.message),
  );
}

/** Lead convertido → consultor + gestão. */
export async function notifyLeadConvertido(lead) {
  const emailConsultor = lead?.emailConsultor || null;
  const consultorNome = lead?.consultor || null;

  if (emailConsultor) {
    const { subject, html } = contentLeadConvertido(lead, consultorNome, false);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] Convertido consultor:", err.message),
    );
  }

  const gestaoEmails = await getGestaoEmails();
  if (gestaoEmails.length) {
    const { subject, html } = contentLeadConvertido(lead, consultorNome, true);
    sendEmailToMany(gestaoEmails, { subject, html }).catch(() => {});
  }
}

/** Lead sem tratativa (timeout terminal) → consultor + gestão. */
export async function notifyLeadSemTratativa(lead) {
  const emailConsultor = lead?.emailConsultor || null;
  const consultorNome = lead?.consultor || null;

  if (emailConsultor) {
    const { subject, html } = contentLeadSemTratativa(lead, consultorNome, false);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] SemTratativa consultor:", err.message),
    );
  }

  const gestaoEmails = await getGestaoEmails();
  if (gestaoEmails.length) {
    const { subject, html } = contentLeadSemTratativa(lead, consultorNome, true);
    sendEmailToMany(gestaoEmails, { subject, html }).catch(() => {});
  }
}
