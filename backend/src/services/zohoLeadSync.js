import { ENV } from "../config/env.js";
import { chamarZohoApi } from "./zohoApi.js";

export const ZOHO_LEAD_STATUS = {
  QUALIFICACAO: "Lead em Qualificação",
  COM_INTERESSE: "Lead Com Interesse",
  SEM_CONTATO: "Lead Sem Contato",
  SEM_INTERESSE: "Lead Sem Interesse",
  CONVERTIDO: "Lead Convertido",
};

export const ZOHO_ATTEMPT_STATUS = {
  TRATADO: "Tratado Pelo Consultor",
  SEM_RETORNO: "Sem Retorno",
};

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
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
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

export function syncZohoLeadAccepted(lead) {
  const now = lead.slaCheckinAt || lead.dataQualificado || new Date().toISOString();
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.QUALIFICACAO),
    ...field(ENV.ZOHO_LEAD_DATA_QUALIFICADO_FIELD, toZohoDate(now)),
    ...field(ENV.ZOHO_LEAD_CONSULTOR_FIELD, consultorLookup(lead)),
    ...field(ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD, lead.emailConsultor),
  });
}

export function syncZohoLeadAttemptTreated(lead, round, { observacao, at } = {}) {
  const fields = attemptFieldMap(round);
  const firstAt = lead.dataPrimeiraTentativa || at;
  const firstObs = lead.descricaoPrimeiraTentativa || observacao;

  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.COM_INTERESSE),
    ...field(ENV.ZOHO_LEAD_DATA_INTERESSE_FIELD, toZohoDate(at)),
    ...field(ENV.ZOHO_LEAD_DATA_1A_FIELD, toZohoDate(firstAt)),
    ...field(ENV.ZOHO_LEAD_OBS_1A_FIELD, firstObs),
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, observacao),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.TRATADO),
    ...addNextAttemptFlags(round),
  });
}

export function syncZohoLeadAttemptNoReturn(lead, round, { at, observacao } = {}) {
  const fields = attemptFieldMap(round);
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_CONTATO),
    ...field(ENV.ZOHO_LEAD_DATA_SEM_CONTATO_FIELD, toZohoDate(at)),
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, observacao),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.SEM_RETORNO),
    ...addNextAttemptFlags(round),
  });
}

export function syncZohoLeadSemInteresse(lead, { at } = {}) {
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_INTERESSE),
    ...field(ENV.ZOHO_LEAD_DATA_SEM_INTERESSE_FIELD, toZohoDate(at)),
  });
}
