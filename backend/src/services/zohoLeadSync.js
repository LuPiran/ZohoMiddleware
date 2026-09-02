import { ENV } from "../config/env.js";
import { chamarZohoApi } from "./zohoApi.js";
import {
  ZOHO_ATTEMPT_STATUS,
  ZOHO_LEAD_STATUS,
} from "../domain/leadStatus.js";
import { TIMEOUT_OBSERVACAO } from "../domain/leadAttempts.js";

export { ZOHO_ATTEMPT_STATUS, ZOHO_LEAD_STATUS };

const STATUS_ALIASES = {
  "novo lead": ZOHO_LEAD_STATUS.NOVO,
  novo: ZOHO_LEAD_STATUS.NOVO,
  "lead em qualificação": ZOHO_LEAD_STATUS.QUALIFICACAO,
  "lead em qualificacao": ZOHO_LEAD_STATUS.QUALIFICACAO,
  qualificado: ZOHO_LEAD_STATUS.QUALIFICACAO,
  "lead com interesse": ZOHO_LEAD_STATUS.COM_INTERESSE,
  "em contato": ZOHO_LEAD_STATUS.COM_INTERESSE,
  "lead sem contato": ZOHO_LEAD_STATUS.SEM_CONTATO,
  "lead sem interesse": ZOHO_LEAD_STATUS.SEM_INTERESSE,
  perdido: ZOHO_LEAD_STATUS.SEM_INTERESSE,
  "lead convertido": ZOHO_LEAD_STATUS.CONVERTIDO,
  convertido: ZOHO_LEAD_STATUS.CONVERTIDO,
  "lead rejeitado": ZOHO_LEAD_STATUS.REJEITADO,
  rejeitado: ZOHO_LEAD_STATUS.REJEITADO,
  "lead sem tratativa": ZOHO_LEAD_STATUS.SEM_TRATATIVA,
  "sem tratativa": ZOHO_LEAD_STATUS.SEM_TRATATIVA,
};

export function canonicalizeLeadStatus(raw, fallback = ZOHO_LEAD_STATUS.NOVO) {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (Object.values(ZOHO_LEAD_STATUS).includes(value)) return value;
  return STATUS_ALIASES[value.toLowerCase()] || value;
}

function field(name, value) {
  if (!name || value === undefined || value === null || value === "") return {};
  return { [name]: value };
}

function consultorLookup(lead) {
  const name = String(lead?.consultor || "").trim();
  if (!name) return undefined;
  // Consultor_Tegra é Lista de opções no CRM — envia o nome como string pura.
  // O valor precisa existir no picklist do campo para ser gravado.
  return name;
}

function addNextAttemptFlags(round) {
  if (round === 1) {
    return field(ENV.ZOHO_LEAD_ADD_2A_FIELD, true);
  }
  if (round === 2) {
    return field(ENV.ZOHO_LEAD_ADD_3A_FIELD, true);
  }
  return {};
}

/**
 * Converte ISO 8601 → formato DataHora do Zoho ("2026-08-24T14:30:00+00:00").
 * Usado em campos do tipo DataHora (ex: Dist_Data_Atribuicao, Dist_Data_Checkin).
 */
export function toZohoDateTime(iso) {
  if (!iso) return undefined;
  const parsed = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  // Zoho não aceita milissegundos — usa os primeiros 19 chars + offset
  return parsed.toISOString().slice(0, 19) + "+00:00";
}

export function toZohoDate(iso) {
  if (!iso) return undefined;
  const parsed = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return parsed.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

function attemptFieldMap(round) {
  if (round === 2) {
    return {
      date: ENV.ZOHO_LEAD_DATA_2A_FIELD,
      obs: ENV.ZOHO_LEAD_OBS_2A_FIELD,
      status: ENV.ZOHO_LEAD_STATUS_2A_FIELD,
    };
  }
  if (round === 3) {
    return {
      date: ENV.ZOHO_LEAD_DATA_3A_FIELD,
      obs: ENV.ZOHO_LEAD_OBS_3A_FIELD,
      status: ENV.ZOHO_LEAD_STATUS_3A_FIELD,
    };
  }
  if (round === 4) {
    return {
      date: ENV.ZOHO_LEAD_DATA_4A_FIELD,
      obs: ENV.ZOHO_LEAD_OBS_4A_FIELD,
      status: ENV.ZOHO_LEAD_STATUS_4A_FIELD,
    };
  }
  return {
    date: ENV.ZOHO_LEAD_DATA_1A_FIELD,
    obs: ENV.ZOHO_LEAD_OBS_1A_FIELD,
    status: ENV.ZOHO_LEAD_STATUS_1A_FIELD,
  };
}

/**
 * PUT no registro do CRM. Falha não derruba a ação do portal.
 */
export async function updateZohoLeadRecord(idZoho, fields) {
  const moduleName = ENV.ZOHO_LEADS_MODULE || "Leads_M_dicos";
  const id = String(idZoho || "").trim();
  if (!id) {
    console.warn("[ZOHO LEAD] Sync ignorado: lead sem idZoho");
    return { synced: false, reason: "sem idZoho" };
  }

  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      return true;
    }),
  );
  if (!Object.keys(payload).length) {
    return { synced: false, reason: "sem campos" };
  }

  await chamarZohoApi("PUT", `/${moduleName}`, {
    data: [{ id, ...payload }],
  });

  console.log(`[ZOHO LEAD] Sync ok ${id} → ${JSON.stringify(payload)}`);
  return { synced: true };
}

export function syncZohoLead(idZoho, fields) {
  void updateZohoLeadRecord(idZoho, fields).catch((error) => {
    console.error(
      "[ZOHO LEAD] Falha ao sincronizar",
      idZoho,
      error.response?.data || error.message,
    );
  });
}

export function syncZohoLeadProtocolo(lead) {
  if (!lead?.protocolo) return;
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_PROTOCOLO_FIELD, lead.protocolo),
  });
}

/**
 * Converte a região interna do Portal (SUDESTE, SUL, NORDESTE, NORTE,
 * CENTRO-OESTE — em caixa alta, usada pra decidir a fila de consultores)
 * para o rótulo exato do picklist Dist_Regiao no Zoho (Title Case).
 */
const DIST_REGIAO_LABELS = {
  SUDESTE: "Sudeste",
  SUL: "Sul",
  NORDESTE: "Nordeste",
  NORTE: "Norte",
  "CENTRO-OESTE": "Centro-Oeste",
};

function distRegiaoLabel(regiao) {
  const key = String(regiao || "").trim().toUpperCase();
  return DIST_REGIAO_LABELS[key] || "Não Identificada";
}

/**
 * Converte o método interno de localização (geoMetodo) para o rótulo do
 * picklist Dist_Geo_Metodo no Zoho. "DDD" nunca é produzido pelo código
 * hoje — a inferência de região por DDD do desenho antigo não existe mais.
 */
const DIST_GEO_METODO_LABELS = {
  cep: "CEP",
  google: "Geolocalização Google",
  uf: "UF informada",
};

function distGeoMetodoLabel(geoMetodo) {
  return DIST_GEO_METODO_LABELS[geoMetodo] || "Nao identificada";
}

/**
 * Sincroniza campos Dist_* imediatamente após a distribuição do lead no portal.
 * Chamado em createLeadFromZoho logo após gravar no DynamoDB.
 * Fire-and-forget — não bloqueia o fluxo de criação.
 */
export function syncZohoLeadDistribuicao(lead) {
  if (!lead?.idZoho) return;
  const fila = lead.slaFaseGestao ? "Gestao" : "Consultor";
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD, lead.consultor),
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_EMAIL_FIELD, lead.emailConsultor),
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_ID_FIELD, lead.consultorId ? String(lead.consultorId) : undefined),
    ...field(ENV.ZOHO_LEAD_DIST_DATA_ATRIBUICAO_FIELD, toZohoDateTime(lead.entradaEm)),
    ...field(ENV.ZOHO_LEAD_DIST_REGIAO_FIELD, distRegiaoLabel(lead.regiao)),
    ...field(ENV.ZOHO_LEAD_DIST_GEO_METODO_FIELD, distGeoMetodoLabel(lead.geoMetodo)),
    ...field(ENV.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD, lead.erroSync),
    // Confirma no próprio registro que o lead passou pelo Portal, e de qual
    // evento ele veio (além das evidências indiretas dos campos Dist_*).
    ...field(ENV.ZOHO_LEAD_EVENTO_TRATADO_FIELD, true),
    ...field(ENV.ZOHO_LEAD_NOME_EVENTO_FIELD, lead.evento),
    ...field(ENV.ZOHO_LEAD_DIST_FILA_FIELD, fila),
    ...field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, "Oferecido"),
    ...(lead.slaOfertaRound != null
      ? field(ENV.ZOHO_LEAD_DIST_RODADAS_FIELD, Number(lead.slaOfertaRound))
      : {}),
  });
}

export function syncZohoLeadAccepted(lead) {
  const now =
    lead.slaCheckinAt || lead.dataQualificado || new Date().toISOString();
  const qualificationDate = toZohoDate(now);

  // Status + data qualificação + Dist checkin no mesmo PUT
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.QUALIFICACAO),
    ...field(ENV.ZOHO_LEAD_DATA_QUALIFICADO_FIELD, qualificationDate),
    ...field(ENV.ZOHO_LEAD_DIST_DATA_CHECKIN_FIELD, toZohoDateTime(now)),
    ...field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, "Aceito"),
  });

  const consultor = consultorLookup(lead);
  const email = lead.emailConsultor;
  if (consultor || email) {
    syncZohoLead(lead.idZoho, {
      ...field(ENV.ZOHO_LEAD_CONSULTOR_FIELD, consultor),
      ...field(ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD, email),
    });
  }
}

export function syncZohoLeadAttemptTreated(lead, round, { observacao, at } = {}) {
  syncZohoLead(lead.idZoho, buildZohoAttemptTreatedFields(lead, round, { observacao, at }));
}

export function buildZohoAttemptTreatedFields(lead, round, { observacao, at } = {}) {
  const fields = attemptFieldMap(round);
  const firstAt = lead.dataPrimeiraTentativa || at;
  const firstObs = lead.descricaoPrimeiraTentativa || observacao;

  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.COM_INTERESSE),
    ...field(ENV.ZOHO_LEAD_DATA_INTERESSE_FIELD, toZohoDate(at)),
    ...field(ENV.ZOHO_LEAD_DATA_1A_FIELD, toZohoDate(firstAt)),
    ...field(ENV.ZOHO_LEAD_OBS_1A_FIELD, firstObs),
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, observacao),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.TRATADO),
  };
}

export function syncZohoLeadAttemptNoReturn(lead, round, { at, observacao, leadTerminal } = {}) {
  syncZohoLead(
    lead.idZoho,
    buildZohoAttemptNoReturnFields(lead, round, { at, observacao, leadTerminal }),
  );
}

export function buildZohoAttemptNoReturnFields(
  _lead,
  round,
  { at, observacao, leadTerminal } = {},
) {
  const fields = attemptFieldMap(round);
  const note = observacao || TIMEOUT_OBSERVACAO;
  return {
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, note),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.SEM_RETORNO),
    ...addNextAttemptFlags(round),
    // Rodada 3 (sem pedido de 4ª) ou rodada 4 vencidas: o lead inteiro vira
    // "Lead Sem Tratativa" — sincroniza no mesmo PUT em vez de uma 2ª chamada.
    ...(leadTerminal
      ? {
          ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_TRATATIVA),
          ...field(ENV.ZOHO_LEAD_DATA_SEM_TRATATIVA_FIELD, toZohoDate(at)),
        }
      : {}),
  };
}

/**
 * Consultor solicitou a 4ª tentativa (data-alvo + motivo). Não altera o
 * status do lead — continua "Lead Em Qualificação".
 */
export function syncZohoLeadFourthAttemptRequested(lead, { at, dataQuartaTentativa, motivo } = {}) {
  syncZohoLead(
    lead.idZoho,
    buildZohoFourthAttemptRequestedFields(lead, { at, dataQuartaTentativa, motivo }),
  );
}

export function buildZohoFourthAttemptRequestedFields(
  _lead,
  { dataQuartaTentativa, motivo } = {},
) {
  return {
    ...field(ENV.ZOHO_LEAD_ADD_4A_FIELD, true),
    ...field(ENV.ZOHO_LEAD_DATA_4A_FIELD, toZohoDate(dataQuartaTentativa)),
    ...field(ENV.ZOHO_LEAD_MOTIVO_4A_FIELD, motivo),
  };
}

const AGENDAMENTO_FIELDS = {
  1: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_1_FIELD,
  2: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_2_FIELD,
  3: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_3_FIELD,
  4: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_4_FIELD,
};

/**
 * Agendamento é independente do fluxo de tentativa formal — só guarda a data
 * de próximo contato previsto (até 4 por lead), sem mexer em status/rodada.
 */
export function syncZohoLeadAgendamento(lead, { n, data } = {}) {
  syncZohoLead(lead.idZoho, buildZohoAgendamentoFields({ n, data }));
}

export function buildZohoAgendamentoFields({ n, data } = {}) {
  const fieldName = AGENDAMENTO_FIELDS[n]?.();
  if (!fieldName) return {};
  return { ...field(fieldName, toZohoDate(data)) };
}

/**
 * Lead recusado ou não aceito dentro do prazo — devolvido ao Zoho como
 * terminal, sem voltar ao rodízio. Registra também quem estava com a oferta.
 */
export function syncZohoLeadRejected(lead, { at } = {}) {
  syncZohoLead(lead.idZoho, buildZohoRejectedFields(lead, { at }));
}

export function buildZohoRejectedFields(lead, { at } = {}) {
  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.REJEITADO),
    ...field(ENV.ZOHO_LEAD_DATA_REJEITADO_FIELD, toZohoDate(at)),
    ...field(ENV.ZOHO_LEAD_CONSULTOR_FIELD, consultorLookup(lead)),
    ...field(ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD, lead.emailConsultor),
    ...field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, "Rejeitado"),
  };
}

export function syncZohoLeadSemContato(lead, { at } = {}) {
  syncZohoLead(lead.idZoho, buildZohoSemContatoFields(lead, { at }));
}

export function buildZohoSemContatoFields(_lead, { at } = {}) {
  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_CONTATO),
    ...field(ENV.ZOHO_LEAD_DATA_SEM_CONTATO_FIELD, toZohoDate(at)),
  };
}

export function syncZohoLeadSemInteresse(lead, { at, observacao, round } = {}) {
  syncZohoLead(lead.idZoho, buildZohoSemInteresseFields(lead, { at, observacao, round }));
}

export function buildZohoSemInteresseFields(_lead, { at, observacao, round } = {}) {
  const n = Number(round);
  const attemptFields = [1, 2, 3, 4].includes(n) ? attemptFieldMap(n) : null;

  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_INTERESSE),
    ...field(ENV.ZOHO_LEAD_DATA_SEM_INTERESSE_FIELD, toZohoDate(at)),
    ...(attemptFields
      ? {
          ...field(attemptFields.date, toZohoDate(at)),
          ...field(attemptFields.obs, observacao),
          ...field(attemptFields.status, ZOHO_ATTEMPT_STATUS.TRATADO),
        }
      : {}),
  };
}
