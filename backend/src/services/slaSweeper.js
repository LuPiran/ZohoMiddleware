import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  isSlaOffered,
  reofferLead,
  startOfferCycle,
} from "./slaOffers.js";
import { expireOverdueAttempts } from "./leadsMedicos.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;
const SWEEP_INTERVAL_MS = 60 * 1000;

async function scanByStatus(status) {
  const items = [];
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "#ss = :status",
        ExpressionAttributeNames: { "#ss": "slaStatus" },
        ExpressionAttributeValues: { ":status": status },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function scanExpiredOffers() {
  const now = new Date().toISOString();
  const items = [];
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression:
          "(#ss = :ofertado OR #ss = :pendente) AND #sd < :now",
        ExpressionAttributeNames: { "#ss": "slaStatus", "#sd": "slaDeadline" },
        ExpressionAttributeValues: {
          ":ofertado": "ofertado",
          ":pendente": "pendente",
          ":now": now,
        },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function runSweep() {
  try {
    const expired = await scanExpiredOffers();
    if (expired.length) {
      console.log(
        `[SWEEPER] ${expired.length} oferta(s) expirada(s) — redistribuindo...`,
      );
      await Promise.allSettled(
        expired.filter(isSlaOffered).map((lead) =>
          reofferLead(lead, {
            reason: "Prazo de aceite expirado. Oferecido ao próximo consultor.",
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

    const waiting = await scanByStatus("aguardando_horario");
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
