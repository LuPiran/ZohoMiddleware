import { randomUUID } from "crypto";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  findConsultoresByRegiao,
  findConsultoresGestao,
  getConsultorDisplayName,
  getConsultorGerencia,
  isPerfilConsultorFila,
  isPerfilGerencia,
  isPerfilGestao,
  updateConsultorUltimaAtribuicao,
} from "./consultores.js";
import { notifyLeadOffer } from "./emailService.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;

export function slaOfferMinutes() {
  const n = Number(ENV.SLA_OFFER_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 10;
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

function toExcludeIdList(excludeIds) {
  if (!excludeIds) return [];
  if (excludeIds instanceof Set) return [...excludeIds];
  if (Array.isArray(excludeIds)) return excludeIds;
  return [];
}

function consultorNome(consultor) {
  return getConsultorDisplayName(consultor) || consultor?.email || consultor?.id;
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

async function scoreCandidates(candidates) {
  const scored = await Promise.all(
    candidates.map(async (consultor) => ({
      consultor,
      carga: await countAcceptedLeads(consultor.id),
      ultima: consultor.ultimaAtribuicao
        ? new Date(consultor.ultimaAtribuicao).getTime()
        : 0,
    })),
  );
  scored.sort((a, b) => a.carga - b.carga || a.ultima - b.ultima);
  return scored[0]?.consultor || null;
}

function availablePeople(people, excludeIds) {
  const excluded = new Set(toExcludeIdList(excludeIds).map((id) => String(id)));
  return people.filter((person) => person?.id && !excluded.has(String(person.id)));
}

/**
 * Consultores da região primeiro (menor carga).
 * Gerência só entra quando não resta consultor — sempre por último.
 */
export async function pickConsultorForOffer(regiao, excludeIds = []) {
  const people = availablePeople(await findConsultoresByRegiao(regiao), excludeIds);
  if (!people.length) return null;

  const consultores = people.filter(isPerfilConsultorFila);
  if (consultores.length) return scoreCandidates(consultores);

  const gerentes = people.filter(isPerfilGerencia);
  if (gerentes.length) return scoreCandidates(gerentes);

  return null;
}

export async function pickConsultorGestao(excludeIds = []) {
  const people = availablePeople(await findConsultoresGestao(), excludeIds);
  if (!people.length) return null;
  return scoreCandidates(people);
}

export async function resolveOfferTarget(lead, excludeIds = []) {
  if (lead?.regiao) return pickConsultorForOffer(lead.regiao, excludeIds);
  return pickConsultorGestao(excludeIds);
}

function offerHistoryCopy(lead, consultor, { reoffer = false } = {}) {
  const nome = consultorNome(consultor);
  const minutos = slaOfferMinutes();
  const verbo = reoffer ? "Reofertado" : "Oferecido";
  const verboLabel = reoffer ? "reofertado" : "oferecido";
  if (isPerfilGestao(consultor)) {
    return {
      label: `Lead ${verboLabel} à Gestão`,
      detail: `Lead sem UF/região. ${verbo} à Gestão (${nome}). ${minutos} min para aceitar.`,
    };
  }
  if (isPerfilGerencia(consultor)) {
    return {
      label: `Lead ${verboLabel} à gerência`,
      detail: `Fila regional ${lead.regiao || "—"}: consultores esgotados. ${verbo} à gerência (${nome}). ${minutos} min para aceitar.`,
    };
  }
  return {
    label: `Lead ${verboLabel} ao consultor`,
    detail: `Fila regional ${lead.regiao || "—"}: menor carteira (${nome}). ${minutos} min para aceitar.`,
  };
}

export function applyOfferToLead(lead, consultor, { reason } = {}) {
  const now = new Date().toISOString();
  const nome = consultorNome(consultor);
  const copy = offerHistoryCopy(lead, consultor);
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
    label: copy.label,
    detail: reason || copy.detail,
    by: "sistema",
  });
  lead.historico = historico.slice(0, 200);
  return lead;
}

function appendCreateHistory(lead, entry) {
  const now = new Date().toISOString();
  const historico = Array.isArray(lead.historico) ? lead.historico : [];
  historico.unshift({ id: randomUUID(), at: now, ...entry });
  lead.historico = historico.slice(0, 200);
  return lead;
}

/**
 * Primeira oferta na criação (24h). Com região: consultores, depois gerência.
 * Sem região: Gestão.
 */
export async function offerLeadOnCreate(lead) {
  const chosen = await resolveOfferTarget(lead, refusedSet(lead));
  if (!chosen) {
    lead.slaStatus = "expirado_ciclo";
    lead.slaDeadline = null;
    const semRegiao = !lead.regiao;
    appendCreateHistory(lead, {
      action: "sla_ciclo_encerrado",
      label: semRegiao
        ? "Nenhum perfil Gestão disponível"
        : "Nenhum consultor ativo na regional",
      detail: semRegiao
        ? "Lead sem UF/região e não há consultor com perfil Gestão ativo."
        : `Sem consultor ou gerência ativos em ${lead.regiao}.`,
      by: "sistema",
    });
    console.warn(
      `[SLA] Sem destinatário para oferta (${lead.regiao || "sem região"})`,
    );
    return lead;
  }

  applyOfferToLead(lead, chosen);
  await updateConsultorUltimaAtribuicao(chosen.id, new Date().toISOString());
  void notifyLeadOffer(lead, chosen);
  return lead;
}

async function persistOfferSwitch(lead, extraUpdates, historicoEntries, condition) {
  const now = new Date().toISOString();
  const historico = Array.isArray(lead.historico) ? [...lead.historico] : [];
  const list = (Array.isArray(historicoEntries)
    ? historicoEntries
    : [historicoEntries]
  ).filter(Boolean);
  for (let i = 0; i < list.length; i += 1) {
    historico.unshift({
      id: randomUUID(),
      at: new Date(Date.now() + i).toISOString(),
      ...list[i],
    });
  }

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

function previousOfferHistory(reason, by) {
  const sweeper = String(by || "") === "sweeper";
  return {
    action: sweeper ? "sla_prazo_expirado" : "sla_recusado",
    label: sweeper ? "Prazo de aceite encerrado" : "Oferta recusada",
    detail: reason || (sweeper
      ? "Ninguém aceitou no prazo. Seguindo a fila."
      : "Consultor recusou a oferta."),
    by: by || "sistema",
  };
}

/**
 * Recusa ou timeout → próximo da fila (consultor → gerência, ou Gestão).
 */
export async function reofferLead(lead, { reason, by } = {}) {
  const previousId = lead.consultorId || lead.consultorIdOferta;
  const recusados = refusedSet(lead);
  if (previousId) recusados.add(String(previousId));

  const next = await resolveOfferTarget(lead, [...recusados]);
  const stillOffered = offeredStatusCondition();
  const closedEntry = previousOfferHistory(reason, by);

  if (!next) {
    return persistOfferSwitch(
      lead,
      {
        slaStatus: "expirado_ciclo",
        slaDeadline: null,
        slaRecusados: [...recusados],
      },
      [
        closedEntry,
        {
          action: "sla_ciclo_encerrado",
          label: "Fila de aceite encerrada",
          detail: lead.regiao
            ? "Todos os consultores e a gerência da regional recusaram ou deixaram expirar."
            : "Gestão recusou ou deixou expirar a oferta do lead sem região.",
          by: by || "sistema",
        },
      ],
      stillOffered,
    );
  }

  const now = new Date().toISOString();
  await updateConsultorUltimaAtribuicao(next.id, now);
  const copy = offerHistoryCopy(lead, next, { reoffer: true });
  const deadline = offerDeadlineIso();

  const updated = await persistOfferSwitch(
    lead,
    {
      consultorId: String(next.id),
      consultorIdOferta: String(next.id),
      consultor: consultorNome(next),
      emailConsultor: next.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(next) || lead.gerencia,
      slaStatus: "ofertado",
      slaDeadline: deadline,
      slaCheckinAt: null,
      slaOfertaRound: Number(lead.slaOfertaRound || 0) + 1,
      slaRecusados: [...recusados],
    },
    [
      closedEntry,
      {
        action: "sla_reatribuido",
        label: copy.label,
        detail: copy.detail,
        by: by || "sistema",
      },
    ],
    stillOffered,
  );

  if (updated) void notifyLeadOffer(updated, next);
  return updated;
}

/**
 * Libera leads que ficaram em aguardando_horario (legado).
 */
export async function startOfferCycle(lead, { reason, by } = {}) {
  const waitingCondition = {
    expression: "#ssWait = :wait",
    names: { "#ssWait": "slaStatus" },
    values: { ":wait": "aguardando_horario" },
  };
  const chosen = await resolveOfferTarget(lead, refusedSet(lead));
  if (!chosen) {
    return persistOfferSwitch(
      lead,
      {
        slaStatus: "expirado_ciclo",
        slaDeadline: null,
      },
      {
        action: "sla_ciclo_encerrado",
        label: "Nenhum destinatário para a oferta",
        detail: reason || `Sem consultor, gerência ou Gestão para ${lead.regiao || "lead sem região"}.`,
        by: by || "sistema",
      },
      waitingCondition,
    );
  }

  const now = new Date().toISOString();
  await updateConsultorUltimaAtribuicao(chosen.id, now);
  const copy = offerHistoryCopy(lead, chosen);
  const deadline = offerDeadlineIso();

  const updated = await persistOfferSwitch(
    lead,
    {
      consultorId: String(chosen.id),
      consultorIdOferta: String(chosen.id),
      consultor: consultorNome(chosen),
      emailConsultor: chosen.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(chosen) || lead.gerencia,
      slaStatus: "ofertado",
      slaDeadline: deadline,
      slaCheckinAt: null,
      slaOfertaRound: Number(lead.slaOfertaRound || 0) + 1,
    },
    {
      action: "sla_ofertado",
      label: copy.label,
      detail: reason || copy.detail,
      by: by || "sistema",
    },
    waitingCondition,
  );

  if (updated) void notifyLeadOffer(updated, chosen);
  return updated;
}
