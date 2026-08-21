import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  isSlaOffered,
  rejectLeadOffer,
  startOfferCycle,
} from "./slaOffers.js";
import { expireOverdueAttempts } from "./leadsMedicos.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;
const SWEEP_INTERVAL_MS = 60 * 1000;

function slaIndexConfig() {
  return {
    indexName: ENV.DYNAMODB_LEADS_SLA_INDEX || "gsi_sla",
    statusAttr: ENV.DYNAMODB_LEADS_SLA_STATUS_ATTR || "slaStatus",
    deadlineAttr: ENV.DYNAMODB_LEADS_SLA_DEADLINE_ATTR || "slaDeadline",
  };
}

function isMissingSlaIndex(error) {
  return (
    error?.name === "ValidationException" ||
    error?.name === "ResourceNotFoundException"
  );
}

async function queryLeadsBySlaStatus(status, { deadlineBefore } = {}) {
  const { indexName, statusAttr, deadlineAttr } = slaIndexConfig();
  const items = [];
  let lastKey;

  const names = { "#ss": statusAttr };
  const values = { ":status": status };
  let condition = "#ss = :status";

  if (deadlineBefore) {
    names["#sd"] = deadlineAttr;
    values[":before"] = deadlineBefore;
    condition += " AND #sd < :before";
  }

  do {
    const page = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: indexName,
        KeyConditionExpression: condition,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

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

async function fetchExpiredOffers() {
  const now = new Date().toISOString();

  try {
    const ofertado = await queryLeadsBySlaStatus("ofertado", {
      deadlineBefore: now,
    });
    const pendente = await queryLeadsBySlaStatus("pendente", {
      deadlineBefore: now,
    });
    const byId = new Map();
    for (const lead of [...ofertado, ...pendente]) {
      if (lead?.id) byId.set(lead.id, lead);
    }
    return [...byId.values()];
  } catch (error) {
    if (!isMissingSlaIndex(error)) throw error;
    console.warn(
      "[SWEEPER] gsi_sla indisponível — usando Scan para ofertas expiradas.",
    );
    return scanExpiredOffers();
  }
}

async function fetchLeadsByStatus(status) {
  try {
    return await queryLeadsBySlaStatus(status);
  } catch (error) {
    if (!isMissingSlaIndex(error)) throw error;
    console.warn(
      `[SWEEPER] gsi_sla indisponível — usando Scan para slaStatus=${status}.`,
    );
    return scanByStatus(status);
  }
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
