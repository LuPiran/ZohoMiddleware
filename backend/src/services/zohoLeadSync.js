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
  // Consultor_Tegra é lookup no CRM
  return { name };
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

export function syncZohoLeadAccepted(lead) {
  const now =
    lead.slaCheckinAt || lead.dataQualificado || new Date().toISOString();
  const qualificationDate = toZohoDate(now);

  // Status + data primeiro: lookup de consultor não pode impedir a qualificação no CRM.
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.QUALIFICACAO),
    ...field(ENV.ZOHO_LEAD_DATA_QUALIFICADO_FIELD, qualificationDate),
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

export function syncZohoLeadAttemptNoReturn(lead, round, { at, observacao } = {}) {
  syncZohoLead(lead.idZoho, buildZohoAttemptNoReturnFields(lead, round, { at, observacao }));
}

export function buildZohoAttemptNoReturnFields(_lead, round, { at, observacao } = {}) {
  const fields = attemptFieldMap(round);
  const note = observacao || TIMEOUT_OBSERVACAO;
  return {
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, note),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.SEM_RETORNO),
    ...addNextAttemptFlags(round),
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
  const attemptFields = [1, 2, 3].includes(n) ? attemptFieldMap(n) : null;

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
