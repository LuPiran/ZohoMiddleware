import { timingSafeEqual } from "crypto";
import { ENV } from "../config/env.js";

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) {
    // Compara contra si mesmo para manter tempo aproximado
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Autenticação para ingestão Zoho → Leads Médicos.
 * Aceita:
 * - Header X-Webhook-Secret
 * - Header X-Api-Key
 * - Authorization: Bearer <secret>
 */
export function authenticateLeadsWebhook(req, res, next) {
  const configured = ENV.ZOHO_LEADS_WEBHOOK_SECRET;

  if (!configured) {
    console.error("[LEADS] ZOHO_LEADS_WEBHOOK_SECRET não configurado");
    return res.status(503).json({
      success: false,
      error: "Webhook de leads não configurado no servidor",
    });
  }

  const headerSecret =
    req.get("x-webhook-secret") ||
    req.get("x-api-key") ||
    "";

  const auth = req.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  const provided = headerSecret || bearer;

  if (!provided || !safeEqual(provided, configured)) {
    console.warn(
      `[SECURITY] Webhook leads não autorizado ip=${req.ip} requestId=${req.requestId || "-"}`,
    );
    return res.status(401).json({
      success: false,
      error: "Não autorizado",
    });
  }

  return next();
}
