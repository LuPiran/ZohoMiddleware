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
  listActiveConsultores,
  updateConsultorUltimaAtribuicao,
} from "./consultores.js";
import { notifyLeadOffer, notifyLeadRecusado } from "./emailService.js";
import { ZOHO_LEAD_STATUS } from "../domain/leadStatus.js";
import { syncZohoLeadRejected } from "./zohoLeadSync.js";
import { buildDynamoUpdateParts } from "../utils/dynamoUpdate.js";
import { haversineDistance } from "./geocoding.js";

/**
 * Raio de empate geográfico: consultores dentro deste buffer (km) de diferença
 * entre si concorrem por menor carga em vez de distância absoluta.
 * Evita que 1 km de diferença sempre favoreça o mesmo consultor.
 */
const GEO_TIE_BUFFER_KM = 30;

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;

/** Ciclos completos (consultores + gerência) antes de escalar à Gestão. */
export const SLA_REGIONAL_CYCLES = 2;

function isGestaoPhase(lead) {
  return Boolean(lead?.slaFaseGestao);
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

/**
 * Ordena candidatos e retorna o melhor.
 *
 * Com coordenadas do lead (leadCoords):
 *   1. Consultores com lat/lng → ordenados por distância ao lead (km)
 *   2. Dentro de GEO_TIE_BUFFER_KM de diferença → empate resolvido por carga
 *   3. Consultores sem geo → caem ao fim, ordenados por carga
 *
 * Sem coordenadas do lead (fallback legado):
 *   Ordenado apenas por carga → última atribuição (comportamento original).
 *
 * @param {object[]} candidates — registros de portal_consultores
 * @param {{ lat: number, lng: number } | null} leadCoords
 */
function scoreCandidates(candidates, leadCoords = null) {
  const scored = candidates.map((consultor) => {
    const carga = getConsultorCargaAceita(consultor);
    const ultima = consultor.ultimaAtribuicao
      ? new Date(consultor.ultimaAtribuicao).getTime()
      : 0;

    let distanciaKm = null;
    if (
      leadCoords?.lat != null &&
      leadCoords?.lng != null &&
      consultor.lat != null &&
      consultor.lng != null
    ) {
      distanciaKm = haversineDistance(
        leadCoords.lat,
        leadCoords.lng,
        Number(consultor.lat),
        Number(consultor.lng),
      );
    }

    return { consultor, carga, ultima, distanciaKm };
  });

  const hasGeo = scored.some((s) => s.distanciaKm !== null);

  if (hasGeo) {
    scored.sort((a, b) => {
      // Candidatos sem geo ficam sempre por último
      if (a.distanciaKm === null && b.distanciaKm !== null) return 1;
      if (a.distanciaKm !== null && b.distanciaKm === null) return -1;

      if (a.distanciaKm !== null && b.distanciaKm !== null) {
        const diff = a.distanciaKm - b.distanciaKm;
        // Fora do buffer: menor distância vence
        if (Math.abs(diff) > GEO_TIE_BUFFER_KM) return diff;
      }

      // Dentro do buffer (ou sem geo nos dois): menor carga → última atribuição
      return a.carga - b.carga || a.ultima - b.ultima;
    });
  } else {
    // Fallback legado: só carga + última atribuição
    scored.sort((a, b) => a.carga - b.carga || a.ultima - b.ultima);
  }

  const winner = scored[0];
  if (winner?.distanciaKm != null) {
    console.log(
      `[GEO] Winner: ${getConsultorDisplayName(winner.consultor)} — ` +
        `${Math.round(winner.distanciaKm)} km do lead, carga ${winner.carga}`,
    );
  }

  return winner?.consultor || null;
}

function availablePeople(people, excludeIds) {
  const excluded = new Set(toExcludeIdList(excludeIds).map((id) => String(id)));
  return people.filter((person) => person?.id && !excluded.has(String(person.id)));
}

/**
 * Extrai coordenadas do lead (se disponíveis após geocodificação).
 * @param {object} lead
 * @returns {{ lat: number, lng: number } | null}
 */
function leadCoords(lead) {
  if (lead?.lat != null && lead?.lng != null) {
    return { lat: Number(lead.lat), lng: Number(lead.lng) };
  }
  return null;
}

/**
 * Consultores da região primeiro — ordenados por distância ao lead (se geo disponível)
 * e por menor carga como critério secundário.
 * Gerência só entra quando não resta consultor — sempre por último.
 *
 * @param {string} regiao
 * @param {string[]} excludeIds
 * @param {{ lat: number, lng: number } | null} coords — coordenadas do lead
 */
export async function pickConsultorForOffer(regiao, excludeIds = [], coords = null) {
  const people = availablePeople(await findConsultoresByRegiao(regiao), excludeIds);
  if (!people.length) return null;

  const consultores = people.filter(isPerfilConsultorFila);
  if (consultores.length) return scoreCandidates(consultores, coords) || null;

  const gerentes = people.filter(isPerfilGerencia);
  if (gerentes.length) return scoreCandidates(gerentes, coords) || null;

  return null;
}

export async function pickConsultorGestao(excludeIds = [], coords = null) {
  const people = availablePeople(await findConsultoresGestao(), excludeIds);
  if (!people.length) return null;
  return scoreCandidates(people, coords);
}

/**
 * Fallback geo: quando o lead não tem região mas tem coordenadas,
 * busca entre TODOS os consultores ativos (exceto Gestão) e ordena por distância.
 * Consultores da fila têm prioridade sobre gerentes.
 *
 * @param {string[]} excludeIds — já recusaram ou expiraram
 * @param {{ lat: number, lng: number } | null} coords
 */
export async function pickConsultorGeoAll(excludeIds = [], coords = null) {
  const all = await listActiveConsultores();
  const people = availablePeople(all, excludeIds).filter(
    (c) => !isPerfilGestao(c),
  );
  if (!people.length) return null;

  const consultores = people.filter(isPerfilConsultorFila);
  if (consultores.length) return scoreCandidates(consultores, coords) || null;

  const gerentes = people.filter(isPerfilGerencia);
  if (gerentes.length) return scoreCandidates(gerentes, coords) || null;

  return null;
}

export async function resolveOfferTarget(lead, excludeIds = []) {
  const coords = leadCoords(lead);
  if (isGestaoPhase(lead)) return pickConsultorGestao(excludeIds, coords);
  if (!lead.regiao) return pickConsultorGeoAll(excludeIds, coords);
  return pickConsultorForOffer(lead.regiao, excludeIds, coords);
}

/**
 * Próximo destinatário: fila regional (até 2 ciclos) → Gestão → encerrar.
 */
async function pickNextOffer(lead, recusadosInput) {
  const recusados = new Set(toExcludeIdList(recusadosInput).map((id) => String(id)));
  const historicoExtras = [];
  const fieldUpdates = {};
  const coords = leadCoords(lead);

  if (isGestaoPhase(lead)) {
    const next = await pickConsultorGestao([...recusados], coords);
    return { next, recusados: [...recusados], historicoExtras, fieldUpdates };
  }

  // ── Lead sem região mas com geo: distribui por proximidade entre todos os consultores ──
  if (!lead.regiao) {
    let next = await pickConsultorGeoAll([...recusados], coords);
    if (next) {
      return { next, recusados: [...recusados], historicoExtras, fieldUpdates };
    }
    // Todos os consultores geo esgotados → escala para Gestão
    fieldUpdates.slaFaseGestao = true;
    historicoExtras.push({
      action: "sla_escalado_gestao",
      label: "Lead escalado para a Gestão",
      detail:
        "Nenhum consultor disponível via geolocalização — lead encaminhado para a equipe de Gestão.",
      by: "sistema",
    });
    const gestaoRecusados = [];
    next = await pickConsultorGestao(gestaoRecusados, coords);
    return { next, recusados: gestaoRecusados, historicoExtras, fieldUpdates };
  }

  // ── Fluxo regional normal ──
  let next = await pickConsultorForOffer(lead.regiao, [...recusados], coords);
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
    const escaladoRegional = lead.slaFaseGestao && lead.regiao;
    const escaladoGeo = lead.slaFaseGestao && !lead.regiao;
    return {
      label: `Lead escalado para a Gestão`,
      detail: escaladoRegional
        ? `Após ${SLA_REGIONAL_CYCLES} rodadas na região ${regiao} sem aceite, o lead foi encaminhado para a equipe de Gestão (${nome}). Prazo: ${minutos} minutos para aceitar.`
        : escaladoGeo
          ? `Todos os consultores próximos foram acionados sem sucesso. Lead encaminhado para a Gestão (${nome}). Prazo: ${minutos} minutos para aceitar.`
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
    detail: regiao === "—"
      ? `Lead atribuído a ${nome} por geolocalização (sem região definida). Prazo: ${minutos} minutos para aceitar ou recusar.`
      : `Lead atribuído a ${nome} pela fila da região ${regiao}. Prazo: ${minutos} minutos para aceitar ou recusar.`,
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
  // Marco fixo do 1º oferecimento — nunca sobrescrito depois de setado,
  // diferente de slaDeadline (que muda a cada nova oferta). Usado pra
  // calcular "tempo médio até aceite" nos KPIs de equipe.
  lead.primeiraOfertaEm = lead.primeiraOfertaEm || now;
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
  } else if (leadCoords(lead)) {
    // Sem região mas tem coordenadas → distribui por proximidade (geo fallback)
    lead.slaCicloRegional = 0;
    lead.slaFaseGestao = false;
  } else {
    // Sem região e sem geo → vai direto para Gestão
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
    const temGeo = Boolean(leadCoords(lead));
    const detail = semRegiao && !temGeo
      ? "Lead sem região e sem geolocalização — não há consultor com perfil Gestão ativo."
      : semRegiao
        ? "Lead sem região: nenhum consultor encontrado por geolocalização e não há consultor Gestão ativo."
        : `${SLA_REGIONAL_CYCLES} ciclos regionais em ${lead.regiao} e a Gestão esgotada — sem destinatário.`;
    appendCreateHistory(lead, {
      action: "sla_ciclo_encerrado",
      label: semRegiao && !temGeo
        ? "Nenhum perfil Gestão disponível"
        : semRegiao
          ? "Nenhum consultor disponível (geo + Gestão)"
          : "Ninguém disponível para aceitar o lead",
      detail,
      by: "sistema",
    });
    // Acumula no mesmo log que a geocodificação já pode ter preenchido
    // (ver leadsMedicos.js) — sincronizado pro Zoho em Dist_Erro_Sync.
    lead.erroSync = [lead.erroSync, detail].filter(Boolean).join(" | ");
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
    detail:
      reason ||
      (sweeper
        ? "O lead não foi aceito dentro do prazo."
        : "O consultor recusou o recebimento deste lead."),
    by: by || "sistema",
  };
}

/**
 * Recusa explícita OU estouro do prazo de aceite (48h): o lead é encerrado
 * no Portal e devolvido ao Zoho como "Lead Rejeitado" — NÃO volta ao
 * rodízio. Quem estava com a oferta (consultorId/consultor/emailConsultor)
 * é preservado de propósito: é o registro de quem rejeitou.
 */
export async function rejectLeadOffer(lead, { reason, by } = {}) {
  const now = new Date().toISOString();
  const stillOffered = offeredStatusCondition();
  const closedEntry = previousOfferHistory(reason, by);
  const consultorAtual = lead.consultor || "O consultor responsável";
  // Distingue recusa explícita (usuário clicou "Recusar") de timeout de 48h
  // (sweeper, ou aceite tentado depois do prazo já vencido) pelo texto do
  // motivo — os 2 call sites de timeout sempre mencionam "expirad[o/a]".
  const timeout = /expirad/i.test(reason || "");

  const updated = await persistOfferSwitch(
    lead,
    {
      slaStatus: "rejeitado",
      slaDeadline: null,
      status: ZOHO_LEAD_STATUS.REJEITADO,
      dataLeadRejeitado: now,
    },
    [
      closedEntry,
      {
        action: "lead_rejeitado_terminal",
        label: "Lead encerrado — devolvido ao Zoho como rejeitado",
        detail: `${consultorAtual} não aceitou este lead. Encerrado no Portal e sincronizado ao Zoho como "Lead Rejeitado" — não retorna à fila.`,
        by: by || "sistema",
      },
    ],
    stillOffered,
  );

  if (updated) {
    syncZohoLeadRejected(updated, { at: now });
    // Evento inesperado — avisa o gerente da região/gerência do lead.
    void notifyLeadRecusado(updated, { timeout });
  }
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
