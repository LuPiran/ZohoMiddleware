import { randomUUID } from "crypto";
import { GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  findConsultoresByRegiao,
  getConsultorDisplayName,
  getConsultorGerencia,
  updateConsultorUltimaAtribuicao,
} from "./consultores.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;
const SWEEP_INTERVAL_MS = 60 * 1000;

async function scanExpiredLeads() {
  const now = new Date().toISOString();
  const items = [];
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "#ss = :pendente AND #sd < :now",
        ExpressionAttributeNames: { "#ss": "slaStatus", "#sd": "slaDeadline" },
        ExpressionAttributeValues: { ":pendente": "pendente", ":now": now },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function appendHistoricoAndUpdate(leadId, currentHistorico, entry, extraUpdates) {
  const historico = Array.isArray(currentHistorico) ? [...currentHistorico] : [];
  historico.unshift({ id: randomUUID(), at: new Date().toISOString(), ...entry });

  const updates = { ...extraUpdates, historico: historico.slice(0, 200), updatedAt: new Date().toISOString() };
  const names = {};
  const values = {};
  const parts = [];
  let i = 0;

  for (const [key, value] of Object.entries(updates)) {
    const nk = `#k${i}`;
    const vk = `:v${i}`;
    names[nk] = key;
    values[vk] = value;
    parts.push(`${nk} = ${vk}`);
    i += 1;
  }

  await dynamoDocClient.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { id: leadId },
      UpdateExpression: `SET ${parts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

async function reassignLead(lead) {
  const regiao = lead.regiao;
  if (!regiao) {
    await appendHistoricoAndUpdate(lead.id, lead.historico, {
      action: "sla_expirado",
      label: "SLA expirado — sem região para reatribuição",
      detail: "Lead expirou sem região definida. Verificar manualmente.",
      by: "sweeper",
    }, { slaStatus: "expirado" });
    return;
  }

  try {
    const consultores = await findConsultoresByRegiao(regiao);
    const candidates = consultores.filter((c) => String(c.id) !== String(lead.consultorId));

    if (!candidates.length) {
      await appendHistoricoAndUpdate(lead.id, lead.historico, {
        action: "sla_expirado",
        label: "SLA expirado — sem consultor disponível",
        detail: `Nenhum outro consultor ativo encontrado para região ${regiao}.`,
        by: "sweeper",
      }, { slaStatus: "expirado" });
      return;
    }

    const next = candidates[0];
    const now = new Date().toISOString();
    const newDeadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await updateConsultorUltimaAtribuicao(next.id, now);

    await appendHistoricoAndUpdate(lead.id, lead.historico, {
      action: "sla_reatribuido",
      label: "Lead reatribuído por SLA expirado",
      detail: `Consultor anterior não fez check-in. Reatribuído para ${getConsultorDisplayName(next) || next.id}.`,
      by: "sweeper",
    }, {
      slaStatus: "pendente",
      slaDeadline: newDeadline,
      slaCheckinAt: null,
      consultorId: String(next.id),
      consultor: getConsultorDisplayName(next) || lead.consultor,
      emailConsultor: next.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(next) || lead.gerencia,
    });

    console.log(`[SWEEPER] Lead ${lead.id} reatribuído para ${getConsultorDisplayName(next)} (região ${regiao})`);
  } catch (err) {
    console.error(`[SWEEPER] Erro ao reatribuir lead ${lead.id}:`, err.message);
  }
}

async function runSweep() {
  try {
    const expired = await scanExpiredLeads();
    if (!expired.length) return;

    console.log(`[SWEEPER] ${expired.length} lead(s) com SLA expirado — processando...`);
    await Promise.allSettled(expired.map(reassignLead));
  } catch (err) {
    console.error("[SWEEPER] Erro no ciclo de varredura:", err.message);
  }
}

export function startSlaSweeper() {
  console.log("[SWEEPER] SLA sweeper iniciado (intervalo: 60s)");
  setInterval(runSweep, SWEEP_INTERVAL_MS);
  // Roda imediatamente na primeira vez
  setTimeout(runSweep, 5000);
}
