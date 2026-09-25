import { expireOverdueAttempts } from "./leadsMedicos.js";
import * as leadsRepo from "../db/leadsRepo.js";
import {
  aguardandoDataEvento,
  isSlaOffered,
  rejectLeadOffer,
  slaOfferMinutes,
  startOfferCycle,
} from "./slaOffers.js";
import { formatMinutes } from "./emailService.js";

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
            reason: `Prazo de ${formatMinutes(slaOfferMinutes())} para aceite expirado.`,
            by: "sweeper",
            timeout: true,
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

    const aguardandoEvento = await fetchLeadsByStatus("aguardando_evento");
    const dataChegou = aguardandoEvento.filter((lead) => !aguardandoDataEvento(lead));
    if (dataChegou.length) {
      console.log(
        `[SWEEPER] ${dataChegou.length} lead(s) com data do evento liberada — distribuindo agora...`,
      );
      await Promise.allSettled(
        dataChegou.map((lead) =>
          startOfferCycle(lead, {
            reason: `Data do evento (${new Date(lead.dataEvento).toLocaleDateString("pt-BR")}) chegou — distribuição liberada automaticamente.`,
            by: "sweeper",
            waitingStatus: "aguardando_evento",
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
