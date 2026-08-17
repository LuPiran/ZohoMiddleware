import { randomUUID } from "crypto";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  findConsultoresByRegiao,
  getConsultorDisplayName,
  getConsultorGerencia,
  updateConsultorUltimaAtribuicao,
} from "./consultores.js";
import { notifyLeadOffer } from "./emailService.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;

export function slaOfferMinutes() {
  const n = Number(ENV.SLA_OFFER_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

/** Horário comercial 8h–18h (Brasília, UTC-3). */
export function isBusinessHours(date = new Date()) {
  const brasiliaHour = (date.getUTCHours() - 3 + 24) % 24;
  return brasiliaHour >= 8 && brasiliaHour < 18;
}

export function isSlaOffered(lead) {
  const s = String(lead?.slaStatus || "");
  return s === "ofertado" || s === "pendente";
}

export function isSlaAccepted(lead) {
  const s = String(lead?.slaStatus || "");
  return s === "aceito" || s === "confirmado";
}

export function offeredStatusCondition() {
  return {
    expression: "(#slaCond = :ofertado OR #slaCond = :pendente)",
    names: { "#slaCond": "slaStatus" },
    values: { ":ofertado": "ofertado", ":pendente": "pendente" },
  };
}

function offerDeadlineIso() {
  return new Date(Date.now() + slaOfferMinutes() * 60 * 1000).toISOString();
}

function refusedSet(lead) {
  const raw = Array.isArray(lead?.slaRecusados) ? lead.slaRecusados : [];
  return new Set(raw.map((id) => String(id)));
}

async function countAcceptedLeads(consultorId) {
  const indexName = ENV.DYNAMODB_LEADS_CONSULTOR_INDEX || "gsi_consultor";
  const pkAttr = ENV.DYNAMODB_LEADS_CONSULTOR_ATTR || "consultorId";
  let count = 0;
  let ExclusiveStartKey;

  try {
    do {
      const page = await dynamoDocClient.send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: indexName,
          KeyConditionExpression: "#pk = :pk",
          ExpressionAttributeNames: { "#pk": pkAttr },
          ExpressionAttributeValues: { ":pk": String(consultorId) },
          ExclusiveStartKey,
        }),
      );
      for (const item of page.Items || []) {
        if (isSlaAccepted(item)) count += 1;
      }
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
  } catch (error) {
    console.warn("[SLA] Contagem de carga falhou:", error.message);
  }

  return count;
}

/**
 * Escolhe o consultor ativo da região com menor número de leads aceitos.
 */
export async function pickConsultorForOffer(regiao, excludeIds = []) {
  const excluded = new Set((excludeIds || []).map((id) => String(id)));
  const consultores = await findConsultoresByRegiao(regiao);
  const candidates = consultores.filter((c) => c?.id && !excluded.has(String(c.id)));
  if (!candidates.length) return null;

  const scored = await Promise.all(
    candidates.map(async (c) => ({
      consultor: c,
      carga: await countAcceptedLeads(c.id),
      ultima: c.ultimaAtribuicao ? new Date(c.ultimaAtribuicao).getTime() : 0,
    })),
  );

  scored.sort((a, b) => a.carga - b.carga || a.ultima - b.ultima);
  return scored[0].consultor;
}

export function applyOfferToLead(lead, consultor, { reason } = {}) {
  const now = new Date().toISOString();
  const nome = getConsultorDisplayName(consultor) || consultor.email || consultor.id;
  lead.consultorId = String(consultor.id);
  lead.consultorIdOferta = String(consultor.id);
  lead.consultor = nome;
  lead.emailConsultor = consultor.email || lead.emailConsultor;
  lead.gerencia = lead.gerencia || getConsultorGerencia(consultor);
  lead.slaStatus = "ofertado";
  lead.slaDeadline = offerDeadlineIso();
  lead.slaCheckinAt = null;
  lead.slaOfertaRound = Number(lead.slaOfertaRound || 0) + 1;
  lead.updatedAt = now;

  const historico = Array.isArray(lead.historico) ? lead.historico : [];
  historico.unshift({
    id: randomUUID(),
    at: now,
    action: "sla_ofertado",
    label: "Lead oferecido ao consultor",
    detail: reason || `Oferecido a ${nome} (${lead.regiao || "sem região"}). ${slaOfferMinutes()} min para aceitar.`,
    by: "sistema",
  });
  lead.historico = historico.slice(0, 200);
  return lead;
}

/**
 * Aplica a primeira oferta (lead ainda em memória, antes do Put).
 */
export async function offerLeadOnCreate(lead) {
  if (!lead.regiao) return lead;

  const chosen = await pickConsultorForOffer(lead.regiao, refusedSet(lead));
  if (!chosen) {
    lead.slaStatus = "expirado_ciclo";
    lead.slaDeadline = null;
    console.warn(`[SLA] Sem consultor ativo na região ${lead.regiao}`);
    return lead;
  }

  applyOfferToLead(lead, chosen, {
    reason: `Fila regional ${lead.regiao}: menor carteira.`,
  });
  await updateConsultorUltimaAtribuicao(chosen.id, new Date().toISOString());
  void notifyLeadOffer(lead, chosen);
  return lead;
}

async function persistOfferSwitch(lead, extraUpdates, historicoEntry, condition) {
  const now = new Date().toISOString();
  const historico = Array.isArray(lead.historico) ? [...lead.historico] : [];
  historico.unshift({ id: randomUUID(), at: now, ...historicoEntry });

  const updates = {
    ...extraUpdates,
    historico: historico.slice(0, 200),
    updatedAt: now,
  };

  const names = { ...(condition?.names || {}) };
  const values = { ...(condition?.values || {}) };
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

  try {
    const result = await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id: lead.id },
        UpdateExpression: `SET ${parts.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: condition?.expression,
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") return null;
    throw error;
  }
}

/**
 * Recusa ou timeout → próximo consultor da região.
 */
export async function reofferLead(lead, { reason, by } = {}) {
  const previousId = lead.consultorId || lead.consultorIdOferta;
  const recusados = refusedSet(lead);
  if (previousId) recusados.add(String(previousId));

  const next = await pickConsultorForOffer(lead.regiao, [...recusados]);
  const stillOffered = offeredStatusCondition();
  if (!next) {
    return persistOfferSwitch(
      lead,
      {
        slaStatus: "expirado_ciclo",
        slaDeadline: null,
        slaRecusados: [...recusados],
      },
      {
        action: "sla_ciclo_encerrado",
        label: "Nenhum consultor restante na regional",
        detail: reason || "Todos recusaram ou o prazo expirou.",
        by: by || "sistema",
      },
      stillOffered,
    );
  }

  const now = new Date().toISOString();
  await updateConsultorUltimaAtribuicao(next.id, now);
  const nome = getConsultorDisplayName(next) || next.email || next.id;
  const deadline = offerDeadlineIso();

  const condition = offeredStatusCondition();
  const updated = await persistOfferSwitch(
    lead,
    {
      consultorId: String(next.id),
      consultorIdOferta: String(next.id),
      consultor: nome,
      emailConsultor: next.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(next) || lead.gerencia,
      slaStatus: "ofertado",
      slaDeadline: deadline,
      slaCheckinAt: null,
      slaOfertaRound: Number(lead.slaOfertaRound || 0) + 1,
      slaRecusados: [...recusados],
    },
    {
      action: "sla_reatribuido",
      label: "Lead oferecido ao próximo consultor",
      detail: reason || `Oferecido a ${nome}.`,
      by: by || "sistema",
    },
    condition,
  );

  if (updated) void notifyLeadOffer(updated, next);
  return updated;
}

/**
 * Inicia o ciclo de oferta em um lead já persistido (ex.: saiu de aguardando_horario).
 */
export async function startOfferCycle(lead, { reason, by } = {}) {
  const waitingCondition = {
    expression: "#ssWait = :wait",
    names: { "#ssWait": "slaStatus" },
    values: { ":wait": "aguardando_horario" },
  };
  const chosen = await pickConsultorForOffer(lead.regiao, refusedSet(lead));
  if (!chosen) {
    return persistOfferSwitch(
      lead,
      {
        slaStatus: "expirado_ciclo",
        slaDeadline: null,
      },
      {
        action: "sla_ciclo_encerrado",
        label: "Nenhum consultor ativo na regional",
        detail: reason || `Sem consultor ativo em ${lead.regiao || "—"}.`,
        by: by || "sistema",
      },
      waitingCondition,
    );
  }

  const now = new Date().toISOString();
  await updateConsultorUltimaAtribuicao(chosen.id, now);
  const nome = getConsultorDisplayName(chosen) || chosen.email || chosen.id;
  const deadline = offerDeadlineIso();

  const updated = await persistOfferSwitch(
    lead,
    {
      consultorId: String(chosen.id),
      consultorIdOferta: String(chosen.id),
      consultor: nome,
      emailConsultor: chosen.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(chosen) || lead.gerencia,
      slaStatus: "ofertado",
      slaDeadline: deadline,
      slaCheckinAt: null,
      slaOfertaRound: Number(lead.slaOfertaRound || 0) + 1,
    },
    {
      action: "sla_ofertado",
      label: "Lead oferecido ao consultor",
      detail: reason || `Oferecido a ${nome} (${lead.regiao}). ${slaOfferMinutes()} min para aceitar.`,
      by: by || "sistema",
    },
    waitingCondition,
  );

  if (updated) void notifyLeadOffer(updated, chosen);
  return updated;
}
