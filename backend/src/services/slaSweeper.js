import { expireOverdueAttempts } from "./leadsMedicos.js";
import * as leadsRepo from "../db/leadsRepo.js";
import {
  isSlaOffered,
  rejectLeadOffer,
  startOfferCycle,
} from "./slaOffers.js";

const SWEEP_INTERVAL_MS = 60 * 1000;

async function fetchExpiredOffers() {
  return leadsRepo.listExpiredOffers();
}

async function fetchLeadsByStatus(status) {
  return leadsRepo.listBySlaStatus(status);
}

async function runSweep() {
  try {
    const expired = await fetchExpiredOffers();
    if (expired.length) {
      console.log(
        `[SWEEPER] ${expired.length} oferta(s) expirada(s) — encerrando como rejeitadas...`,
      );
      await Promise.allSettled(
        expired.filter(isSlaOffered).map((lead) =>
          rejectLeadOffer(lead, {
            reason: "Prazo de 48h para aceite expirado.",
            by: "sweeper",
          }),
        ),
      );
    }

    const expiredAttempts = await expireOverdueAttempts();
    if (expiredAttempts) {
      console.log(
        `[SWEEPER] ${expiredAttempts} tentativa(s) vencida(s) — Sem retorno aplicado.`,
      );
    }

    const waiting = await fetchLeadsByStatus("aguardando_horario");
    if (waiting.length) {
      console.log(
        `[SWEEPER] ${waiting.length} lead(s) legado(s) aguardando horário — ofertando agora...`,
      );
      await Promise.allSettled(
        waiting.map((lead) =>
          startOfferCycle(lead, {
            reason: "Oferta 24h liberada para lead que aguardava horário comercial.",
            by: "sweeper",
          }),
        ),
      );
    }
  } catch (err) {
    console.error("[SWEEPER] Erro no ciclo de varredura:", err.message);
  }
}

export function startSlaSweeper() {
  console.log("[SWEEPER] SLA sweeper iniciado (intervalo: 60s)");
  setInterval(runSweep, SWEEP_INTERVAL_MS);
  setTimeout(runSweep, 5000);
}
