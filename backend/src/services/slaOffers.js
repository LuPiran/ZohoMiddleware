import { randomUUID } from "crypto";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  findConsultoresByRegiao,
  findConsultoresGestao,
  getConsultorCargaAceita,
  getConsultorDisplayName,
  getConsultorGerencia,
  isPerfilConsultorFila,
  isPerfilGerencia,
  isPerfilGestao,
  updateConsultorUltimaAtribuicao,
} from "./consultores.js";
import { notifyLeadOffer } from "./emailService.js";
import { buildDynamoUpdateParts } from "../utils/dynamoUpdate.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;

/** Ciclos completos (consultores + gerência) antes de escalar à Gestão. */
export const SLA_REGIONAL_CYCLES = 2;

function isGestaoPhase(lead) {
  return Boolean(lead?.slaFaseGestao) || !lead?.regiao;
}

function regionalCycle(lead) {
  return Number(lead?.slaCicloRegional || 1);
}

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

function scoreCandidates(candidates) {
  const scored = candidates.map((consultor) => ({
    consultor,
    carga: getConsultorCargaAceita(consultor),
    ultima: consultor.ultimaAtribuicao
      ? new Date(consultor.ultimaAtribuicao).getTime()
      : 0,
  }));
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
  if (consultores.length) return scoreCandidates(consultores) || null;

  const gerentes = people.filter(isPerfilGerencia);
  if (gerentes.length) return scoreCandidates(gerentes) || null;

  return null;
}

export async function pickConsultorGestao(excludeIds = []) {
  const people = availablePeople(await findConsultoresGestao(), excludeIds);
  if (!people.length) return null;
  return scoreCandidates(people);
}

export async function resolveOfferTarget(lead, excludeIds = []) {
  if (isGestaoPhase(lead)) return pickConsultorGestao(excludeIds);
  return pickConsultorForOffer(lead.regiao, excludeIds);
}

/**
 * Próximo destinatário: fila regional (até 2 ciclos) → Gestão → encerrar.
 */
async function pickNextOffer(lead, recusadosInput) {
  const recusados = new Set(toExcludeIdList(recusadosInput).map((id) => String(id)));
  const historicoExtras = [];
  const fieldUpdates = {};

  if (isGestaoPhase(lead)) {
    const next = await pickConsultorGestao([...recusados]);
    return { next, recusados: [...recusados], historicoExtras, fieldUpdates };
  }

  let next = await pickConsultorForOffer(lead.regiao, [...recusados]);
  if (next) {
    return { next, recusados: [...recusados], historicoExtras, fieldUpdates };
  }

  const ciclo = regionalCycle(lead);
  if (ciclo < SLA_REGIONAL_CYCLES) {
    const proximoCiclo = ciclo + 1;
    fieldUpdates.slaCicloRegional = proximoCiclo;
    historicoExtras.push({
      action: "sla_ciclo_reiniciado",
      label: `Nova rodada de atribuição — região ${lead.regiao}`,
      detail: `Nenhum consultor aceitou na rodada ${ciclo}. Iniciando nova rodada (${proximoCiclo}) de atribuição na região ${lead.regiao}.`,
      by: "sistema",
    });
    const freshRecusados = [];
    next = await pickConsultorForOffer(lead.regiao, freshRecusados);
    if (next) {
      return {
        next,
        recusados: freshRecusados,
        historicoExtras,
        fieldUpdates,
      };
    }
  }

  fieldUpdates.slaFaseGestao = true;
  fieldUpdates.slaCicloRegional = SLA_REGIONAL_CYCLES;
  historicoExtras.push({
    action: "sla_escalado_gestao",
    label: "Lead escalado para a Gestão",
    detail: `Após ${SLA_REGIONAL_CYCLES} rodadas na região ${lead.regiao} sem aceite, o lead foi encaminhado para a equipe de Gestão.`,
    by: "sistema",
  });

  const gestaoRecusados = [];
  next = await pickConsultorGestao(gestaoRecusados);
  return {
    next,
    recusados: gestaoRecusados,
    historicoExtras,
    fieldUpdates,
  };
}

function offerHistoryCopy(lead, consultor, { reoffer = false } = {}) {
  const nome = consultorNome(consultor);
  const minutos = slaOfferMinutes();
  const acao = reoffer ? "reenviado" : "enviado";
  const regiao = lead.regiao || "—";

  if (isPerfilGestao(consultor)) {
    const escalado = lead.slaFaseGestao && lead.regiao;
    return {
      label: `Lead escalado para a Gestão`,
      detail: escalado
        ? `Após ${SLA_REGIONAL_CYCLES} rodadas na região ${regiao} sem aceite, o lead foi encaminhado para a equipe de Gestão (${nome}). Prazo: ${minutos} minutos para aceitar.`
        : `Lead sem região definida. Enviado diretamente para a Gestão (${nome}). Prazo: ${minutos} minutos para aceitar.`,
    };
  }
  if (isPerfilGerencia(consultor)) {
    return {
      label: `Lead escalado para a gerência`,
      detail: `Todos os consultores da região ${regiao} foram acionados sem sucesso. Lead ${acao} para a gerência (${nome}). Prazo: ${minutos} minutos para aceitar.`,
    };
  }
  return {
    label: `Lead ${acao} para ${nome}`,
    detail: `Lead atribuído a ${nome} pela fila da região ${regiao}. Prazo: ${minutos} minutos para aceitar ou recusar.`,
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
  delete lead.slaCheckinAt;
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
  if (lead.regiao) {
    lead.slaCicloRegional = 1;
    lead.slaFaseGestao = false;
  } else {
    lead.slaFaseGestao = true;
    lead.slaCicloRegional = 0;
  }

  const { next, recusados, historicoExtras, fieldUpdates } = await pickNextOffer(
    lead,
    refusedSet(lead),
  );

  for (const entry of historicoExtras) {
    appendCreateHistory(lead, entry);
  }

  if (!next) {
    Object.assign(lead, fieldUpdates);
    lead.slaStatus = "expirado_ciclo";
    delete lead.slaDeadline;
    const semRegiao = !lead.regiao;
    appendCreateHistory(lead, {
      action: "sla_ciclo_encerrado",
      label: semRegiao
        ? "Nenhum perfil Gestão disponível"
        : "Ninguém disponível para aceitar o lead",
      detail: semRegiao
        ? "Lead sem UF/região e não há consultor com perfil Gestão ativo."
        : `${SLA_REGIONAL_CYCLES} ciclos regionais em ${lead.regiao} e a Gestão esgotada — sem destinatário.`,
      by: "sistema",
    });
    console.warn(
      `[SLA] Sem destinatário para oferta (${lead.regiao || "sem região"})`,
    );
    return lead;
  }

  Object.assign(lead, fieldUpdates);
  lead.slaRecusados = recusados;
  applyOfferToLead(lead, next);
  await updateConsultorUltimaAtribuicao(next.id, new Date().toISOString());
  void notifyLeadOffer(lead, next);
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

  const built = buildDynamoUpdateParts(updates);
  const names = { ...built.names, ...(condition?.names || {}) };
  const values = { ...built.values, ...(condition?.values || {}) };

  if (!built.updateExpression) {
    return null;
  }

  try {
    const result = await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id: lead.id },
        UpdateExpression: built.updateExpression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
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
    label: sweeper ? "Consultor não respondeu no prazo" : "Consultor recusou o lead",
    detail: reason || (sweeper
      ? "O lead não foi aceito em 10 minutos. Encaminhado automaticamente para o próximo consultor da fila."
      : "O consultor recusou o recebimento deste lead. Encaminhado automaticamente para o próximo da fila."),
    by: by || "sistema",
  };
}

/**
 * Recusa ou timeout → próximo da fila (consultor → gerência → novo ciclo → Gestão).
 */
export async function reofferLead(lead, { reason, by } = {}) {
  const previousId = lead.consultorId || lead.consultorIdOferta;
  const recusados = refusedSet(lead);
  if (previousId) recusados.add(String(previousId));

  const {
    next,
    recusados: nextRecusados,
    historicoExtras,
    fieldUpdates,
  } = await pickNextOffer(lead, recusados);
  const stillOffered = offeredStatusCondition();
  const closedEntry = previousOfferHistory(reason, by);

  if (!next) {
    return persistOfferSwitch(
      lead,
      {
        ...fieldUpdates,
        slaStatus: "expirado_ciclo",
        slaDeadline: null,
        slaRecusados: nextRecusados,
      },
      [
        closedEntry,
        ...historicoExtras,
        {
          action: "sla_ciclo_encerrado",
          label: "Fila esgotada — nenhum aceite",
          detail: lead.regiao
            ? `Todos os consultores e a equipe de Gestão da região ${lead.regiao} foram acionados sem sucesso. Lead requer atenção manual.`
            : "A Gestão recusou ou não respondeu no prazo. Este lead precisa de atenção manual.",
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
      ...fieldUpdates,
      consultorId: String(next.id),
      consultorIdOferta: String(next.id),
      consultor: consultorNome(next),
      emailConsultor: next.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(next) || lead.gerencia,
      slaStatus: "ofertado",
      slaDeadline: deadline,
      slaCheckinAt: null,
      slaOfertaRound: Number(lead.slaOfertaRound || 0) + 1,
      slaRecusados: nextRecusados,
    },
    [
      closedEntry,
      ...historicoExtras,
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

  if (lead.regiao && !lead.slaFaseGestao) {
    lead.slaCicloRegional = lead.slaCicloRegional || 1;
  }

  const { next, recusados, historicoExtras, fieldUpdates } = await pickNextOffer(
    lead,
    refusedSet(lead),
  );

  if (!next) {
    return persistOfferSwitch(
      lead,
      {
        ...fieldUpdates,
        slaStatus: "expirado_ciclo",
        slaDeadline: null,
      },
      [
        ...historicoExtras,
        {
          action: "sla_ciclo_encerrado",
          label: "Nenhum destinatário para a oferta",
          detail:
            reason ||
            `Sem consultor, gerência ou Gestão disponível para ${lead.regiao || "lead sem região"}.`,
          by: by || "sistema",
        },
      ],
      waitingCondition,
    );
  }

  const now = new Date().toISOString();
  await updateConsultorUltimaAtribuicao(next.id, now);
  const copy = offerHistoryCopy(lead, next);
  const deadline = offerDeadlineIso();

  const updated = await persistOfferSwitch(
    lead,
    {
      ...fieldUpdates,
      consultorId: String(next.id),
      consultorIdOferta: String(next.id),
      consultor: consultorNome(next),
      emailConsultor: next.email || lead.emailConsultor,
      gerencia: getConsultorGerencia(next) || lead.gerencia,
      slaStatus: "ofertado",
      slaDeadline: deadline,
      slaCheckinAt: null,
      slaOfertaRound: Number(lead.slaOfertaRound || 0) + 1,
      slaRecusados: recusados,
    },
    [
      ...historicoExtras,
      {
        action: "sla_ofertado",
        label: copy.label,
        detail: reason || copy.detail,
        by: by || "sistema",
      },
    ],
    waitingCondition,
  );

  if (updated) void notifyLeadOffer(updated, next);
  return updated;
}
