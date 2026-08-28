import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import axios from "axios";
import { ENV } from "../config/env.js";
import { findGerenteEmailsByGerencia } from "./consultores.js";

/* ─── Logo em base64 ────────────────────────────────────────────────────── */

function loadLogoBase64() {
  try {
    const __dir = dirname(fileURLToPath(import.meta.url));
    // LogoTegra.png é a versão branca (logoCorp.png tem "Corp." em cinza
    // escuro, que some no cabeçalho navy do e-mail) — tenta o volume
    // montado (Docker) e o fallback local.
    const paths = [
      resolve(__dir, "../../../admin/public/LogoTegra.png"),
      resolve(__dir, "../../admin/public/LogoTegra.png"),
    ];
    for (const p of paths) {
      try {
        const buf = readFileSync(p);
        return `data:image/png;base64,${buf.toString("base64")}`;
      } catch { /* tenta próximo */ }
    }
  } catch { /* ignora */ }
  return null;
}

const LOGO_DATA_URI = loadLogoBase64();

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function portalBaseUrl() {
  return String(ENV.FRONTEND_URL || "").replace(/\/$/, "") || "http://localhost:8081";
}

function leadPortalUrl(leadId) {
  return `${portalBaseUrl()}/leads-medicos/${leadId}`;
}

/** Formata minutos em texto legível: 10 → "10 minutos", 120 → "2 horas", 2880 → "48 horas" */
function formatMinutes(min) {
  if (!min) return "—";
  // > 2880 (48h) vira dias — o prazo padrão de 48h exatas continua em "horas"
  // (48 horas), não "2 dias", que é como o time trata o prazo internamente.
  if (min > 2880) {
    const d = Math.round(min / 1440);
    return `${d} dia${d > 1 ? "s" : ""}`;
  }
  if (min >= 60) {
    const h = Math.round(min / 60);
    return `${h} hora${h > 1 ? "s" : ""}`;
  }
  return `${min} minuto${min > 1 ? "s" : ""}`;
}

/** Data/hora de prazo: "até 18:30 de 26/08" */
function formatDeadlineTime(minutes) {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  return `até ${hora} de ${data}`;
}

/** Data/hora atual formatada */
function nowBR() {
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  return `${data} às ${hora}`;
}

/** "SUDESTE (Guarulhos / SP)" */
function formatRegiao(lead) {
  const cidade = [lead?.cidade, lead?.estado || lead?.ufCrm].filter(Boolean).join(" / ");
  if (lead?.regiao && cidade) return `${lead.regiao} (${cidade})`;
  if (lead?.regiao) return lead.regiao;
  if (cidade) return cidade;
  return null;
}

/**
 * E-mail(s) do gerente responsável pela gerência do lead — não existe perfil
 * Gestão para esse fim, só Gerente e Consultor.
 */
async function getGerenteEmails(lead) {
  try {
    return await findGerenteEmailsByGerencia(lead?.gerencia);
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
  const { nome, regiao, especialidade, consultor } = leadInfo || {};

  const headerLogo = LOGO_DATA_URI
    // LogoTegra.png (branca) é bem mais "quadrada" que a antiga logoCorp.png
    // (1214x704 vs 400x48) — precisa de mais altura pra não ficar minúscula.
    ? `<img src="${LOGO_DATA_URI}" alt="TegraPharma Corp" height="64"
         style="display:block;max-height:64px;border:0;">`
    : `<p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
         TegraPharma<span style="color:#E5989B;">Corp</span>
       </p>`;

  const labelCell = `font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;width:108px;white-space:nowrap;padding:5px 0;vertical-align:top;`;
  const valueCell = `font-size:14px;color:#1e293b;padding:5px 0 5px 8px;vertical-align:top;`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#1a2f5b;border-radius:12px 12px 0 0;padding:24px 32px 20px;">
            ${headerLogo}
            <p style="margin:8px 0 0;color:#8FA9C1;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Portal do Consultor</p>
          </td>
        </tr>

        <!-- Faixa gradiente -->
        <tr>
          <td style="height:3px;background:linear-gradient(90deg,#8FA9C1,#E5989B);"></td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px 32px;">

            <!-- Badge de status -->
            ${badgeStatus ? `<p style="margin:0 0 18px;">${statusBadge(badgeStatus)}</p>` : ""}

            <!-- Título -->
            <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1a2f5b;line-height:1.3;">${title}</h2>
            <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.6;">${intro}</p>

            <!-- Card do lead -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e2e8f0;border-left:4px solid #8FA9C1;border-radius:8px;margin-bottom:24px;background:#f8fafc;">
              <tr>
                <td style="padding:18px 22px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${nome ? `<tr>
                      <td style="${labelCell}">Paciente</td>
                      <td style="${valueCell}font-weight:700;">${nome}</td>
                    </tr>` : ""}
                    ${regiao ? `<tr>
                      <td style="${labelCell}">Região</td>
                      <td style="${valueCell}">${regiao}</td>
                    </tr>` : ""}
                    ${especialidade ? `<tr>
                      <td style="${labelCell}">Especialidade</td>
                      <td style="${valueCell}">${especialidade}</td>
                    </tr>` : ""}
                    ${consultor ? `<tr>
                      <td style="${labelCell}">Consultor</td>
                      <td style="${valueCell}">${consultor}</td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            ${bodyExtra}

            <!-- CTA -->
            ${ctaUrl ? `<p style="margin:0;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;padding:13px 32px;background:#1a2f5b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.02em;">
                ${ctaLabel || "Abrir no Portal →"}
              </a>
            </p>` : ""}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
              TegraPharma Corp · Portal do Consultor<br>
              ${footerNote ? `<span style="color:#64748b;">${footerNote}</span><br>` : ""}
              <span style="color:#cbd5e1;">E-mail automático — não responda a esta mensagem.</span>
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
    regiao: formatRegiao(lead),            // "SUDESTE (Guarulhos / SP)"
    especialidade: lead?.especialidade || null,
    consultor: lead?.consultor || null,
  };
}

// 1. Oferta SLA → consultor
function contentLeadOffer(lead, consultorNome) {
  const minutos = Number(ENV.SLA_OFFER_MINUTES) || 10;
  const tempoStr   = formatMinutes(minutos);          // "2 horas" / "10 minutos"
  const deadlineStr = formatDeadlineTime(minutos);    // "até 18:30 de 26/08"
  const fila = lead.regiao ? `da regional <strong>${lead.regiao}</strong>` : "sem região (fila da Gestão)";

  const prazoBox = `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px;background:#fffbeb;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0;font-size:13px;color:#78350f;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">⏱ Prazo para aceitar</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#92400e;line-height:1.2;">${tempoStr}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#b45309;">${deadlineStr}</p>
        </td>
      </tr>
    </table>`;

  return {
    subject: `Novo lead ${lead.regiao || "Gestão"} — responda em ${tempoStr}`,
    html: buildHtml({
      badgeStatus: "Novo Lead",
      title: "Novo lead aguardando sua resposta",
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! Um lead ${fila} foi oferecido a você. Aceite ou recuse no portal dentro do prazo.`,
      leadInfo: leadInfoFrom(lead),
      bodyExtra: prazoBox,
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Aceitar ou Recusar Lead →",
      footerNote: `Gerado em: ${nowBR()}`,
    }),
  };
}

// 1b. Oferta SLA → gestão (aviso informativo)
function contentLeadOfferGestao(lead, consultorNome) {
  const minutos = Number(ENV.SLA_OFFER_MINUTES) || 10;
  const tempoStr = formatMinutes(minutos);
  const deadlineStr = formatDeadlineTime(minutos);
  return {
    subject: `Lead oferecido a ${consultorNome || "consultor"} — ${lead.regiao || "Gestão"}`,
    html: buildHtml({
      badgeStatus: "Novo Lead",
      title: "Lead distribuído para consultor",
      intro: `O lead abaixo foi oferecido a <strong>${consultorNome || "um consultor"}</strong>. Prazo de aceite: <strong>${tempoStr}</strong> (${deadlineStr}).`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
      footerNote: `Gerado em: ${nowBR()}`,
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

// 3. Lead recusado (explícito) ou sem resposta em 48h (timeout) → gerente
function contentLeadRecusado(lead, consultorNome, { timeout = false } = {}) {
  return {
    subject: timeout
      ? `Lead sem resposta em 48h — ${lead.nome || "Lead"} encerrado`
      : `Lead recusado — ${lead.nome || "Lead"} encerrado`,
    html: buildHtml({
      badgeStatus: "Lead Rejeitado",
      title: timeout ? "Lead encerrado — consultor não respondeu" : "Lead recusado pelo consultor",
      intro: timeout
        ? `<strong>${consultorNome || "O consultor"}</strong> não aceitou nem recusou o lead abaixo dentro do prazo de 48h. O lead foi encerrado no portal e devolvido ao Zoho CRM.`
        : `<strong>${consultorNome || "Um consultor"}</strong> recusou o lead abaixo. O lead foi encerrado no portal e devolvido ao Zoho CRM.`,
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

  // ── Modo teste: redireciona todos os e-mails para MAIL_REDIRECT_TO ──────────
  const redirectTo = ENV.MAIL_REDIRECT_TO;
  let actualTo = to;
  if (redirectTo) {
    console.log(`[MAIL] REDIRECT ativo: ${to} → ${redirectTo}`);
    actualTo = redirectTo;
    subject = `[TEST → ${to}] ${subject}`;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const htmlContent = html || (text ? `<pre>${text}</pre>` : "<p>—</p>");

  if (provider === "microsoft") {
    await sendViaMicrosoft({ to: actualTo, subject, html: htmlContent });
    return { sent: true, provider };
  }
  if (provider === "resend") {
    await sendViaResend({ to: actualTo, subject, html: htmlContent });
    return { sent: true, provider };
  }
  return { sent: false, reason: `provider desconhecido: ${provider}` };
}

/* ─── Notificações públicas ──────────────────────────────────────────────── */

/**
 * Lead oferecido ao consultor (SLA timer).
 * Dispara apenas para o consultor — gestão só é notificada em eventos inesperados.
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

  return { sent: Boolean(to) };
}

/**
 * Consultor aceitou o lead.
 * Dispara apenas para o consultor — gestão só é notificada em eventos inesperados.
 */
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
}

/**
 * Consultor recusou o lead (explícito) OU não respondeu em 48h (timeout) →
 * só o gerente da região/gerência do lead. É exatamente o "evento inesperado"
 * que justifica avisar alguém além do próprio consultor.
 */
export async function notifyLeadRecusado(lead, { timeout = false } = {}) {
  const consultorNome = lead?.consultor || null;
  const gerenteEmails = await getGerenteEmails(lead);
  if (!gerenteEmails.length) return;
  const { subject, html } = contentLeadRecusado(lead, consultorNome, { timeout });
  sendEmailToMany(gerenteEmails, { subject, html }).catch(() => {});
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

/**
 * Lead convertido → só consultor. Conversão é o resultado desejado, não um
 * evento inesperado — gerente não entra em cópia aqui.
 */
export async function notifyLeadConvertido(lead) {
  const emailConsultor = lead?.emailConsultor || null;
  const consultorNome = lead?.consultor || null;

  if (emailConsultor) {
    const { subject, html } = contentLeadConvertido(lead, consultorNome, false);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] Convertido consultor:", err.message),
    );
  }
}

/**
 * Lead sem tratativa (3ª/4ª tentativa vencida sem ação) → consultor + gerente.
 * Evento inesperado — o gerente da região/gerência do lead entra em cópia.
 */
export async function notifyLeadSemTratativa(lead) {
  const emailConsultor = lead?.emailConsultor || null;
  const consultorNome = lead?.consultor || null;

  if (emailConsultor) {
    const { subject, html } = contentLeadSemTratativa(lead, consultorNome, false);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] SemTratativa consultor:", err.message),
    );
  }

  const gerenteEmails = await getGerenteEmails(lead);
  if (gerenteEmails.length) {
    const { subject, html } = contentLeadSemTratativa(lead, consultorNome, true);
    sendEmailToMany(gerenteEmails, { subject, html }).catch(() => {});
  }
}

/* ─── Preview (não envia nada — só monta o HTML com dado de exemplo) ────── */

/**
 * Gera {subject, html} de todos os modelos de e-mail com um lead de
 * exemplo, sem chamar sendEmail em nenhum momento. Serve só pra visualizar/
 * ajustar template sem precisar criar lead de teste na base.
 */
export function previewEmailTemplates() {
  const sampleLead = {
    id: "preview-lead-id",
    nome: "Maria Aparecida Souza",
    regiao: "SUDESTE",
    cidade: "São Paulo",
    estado: "SP",
    especialidade: "Neurologia",
    consultor: "Lucas Piran",
    emailConsultor: "lucas.piran@tegrapharma.com",
    status: "Lead Em Qualificação",
    dataConversao: new Date().toISOString(),
  };
  const consultorNome = sampleLead.consultor;

  return [
    { key: "oferta_consultor", label: "1. Oferta SLA → consultor", ...contentLeadOffer(sampleLead, consultorNome) },
    { key: "oferta_gestao", label: "1b. Oferta SLA → aviso gestão (função existe, não é chamada hoje)", ...contentLeadOfferGestao(sampleLead, consultorNome) },
    { key: "aceito_consultor", label: "2. Lead aceito → consultor", ...contentLeadAceitoConsultor(sampleLead, consultorNome) },
    { key: "aceito_gestao", label: "2b. Lead aceito → aviso gestão (função existe, não é chamada hoje)", ...contentLeadAceitoGestao(sampleLead, consultorNome) },
    { key: "recusado_explicito", label: "3. Recusado — recusa explícita → gerente", ...contentLeadRecusado(sampleLead, consultorNome, { timeout: false }) },
    { key: "recusado_timeout", label: "3b. Recusado — timeout de 48h → gerente", ...contentLeadRecusado(sampleLead, consultorNome, { timeout: true }) },
    { key: "tentativa", label: "4. Tentativa de contato registrada → consultor", ...contentTentativa(sampleLead, consultorNome, 1) },
    { key: "status_change", label: "5. Mudança de status (Sem Interesse) → consultor", ...contentStatusChange(sampleLead, consultorNome, "Lead Sem Interesse") },
    { key: "convertido_consultor", label: "6. Lead convertido → consultor", ...contentLeadConvertido(sampleLead, consultorNome, false) },
    { key: "sem_tratativa_consultor", label: "7. Lead sem tratativa → consultor", ...contentLeadSemTratativa(sampleLead, consultorNome, false) },
    { key: "sem_tratativa_gerente", label: "7b. Lead sem tratativa → gerente", ...contentLeadSemTratativa(sampleLead, consultorNome, true) },
  ];
}
