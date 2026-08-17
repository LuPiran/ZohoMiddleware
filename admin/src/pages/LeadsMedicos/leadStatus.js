/**
 * Status oficiais do picklist Zoho (Leads_M_dicos).
 * Cores alinhadas ao CRM.
 */
export const LEAD_STATUS = {
  NOVO: "Novo Lead",
  CONVERTIDO: "Lead Convertido",
  QUALIFICACAO: "Lead Em Qualificação",
  SEM_INTERESSE: "Lead Sem Interesse",
  COM_INTERESSE: "Lead Com Interesse",
  SEM_CONTATO: "Lead Sem Contato",
};

export const LEAD_STATUSES = [
  LEAD_STATUS.NOVO,
  LEAD_STATUS.CONVERTIDO,
  LEAD_STATUS.QUALIFICACAO,
  LEAD_STATUS.SEM_INTERESSE,
  LEAD_STATUS.COM_INTERESSE,
  LEAD_STATUS.SEM_CONTATO,
];

export const LEAD_STATUS_META = {
  [LEAD_STATUS.NOVO]: {
    color: "#2D8CFF",
    soft: "rgba(45, 140, 255, 0.14)",
  },
  [LEAD_STATUS.CONVERTIDO]: {
    color: "#2ECC71",
    soft: "rgba(46, 204, 113, 0.14)",
  },
  [LEAD_STATUS.QUALIFICACAO]: {
    color: "#F5A623",
    soft: "rgba(245, 166, 35, 0.16)",
  },
  [LEAD_STATUS.SEM_INTERESSE]: {
    color: "#E74C3C",
    soft: "rgba(231, 76, 60, 0.14)",
  },
  [LEAD_STATUS.COM_INTERESSE]: {
    color: "#8E44AD",
    soft: "rgba(142, 68, 173, 0.14)",
  },
  [LEAD_STATUS.SEM_CONTATO]: {
    color: "#C9A227",
    chart: "#F1C40F",
    soft: "rgba(241, 196, 15, 0.22)",
  },
};

const STATUS_ALIASES = {
  "novo lead": LEAD_STATUS.NOVO,
  novo: LEAD_STATUS.NOVO,
  "lead convertido": LEAD_STATUS.CONVERTIDO,
  convertido: LEAD_STATUS.CONVERTIDO,
  "lead em qualificação": LEAD_STATUS.QUALIFICACAO,
  "lead em qualificacao": LEAD_STATUS.QUALIFICACAO,
  qualificado: LEAD_STATUS.QUALIFICACAO,
  "em contato": LEAD_STATUS.COM_INTERESSE,
  "lead com interesse": LEAD_STATUS.COM_INTERESSE,
  "lead sem contato": LEAD_STATUS.SEM_CONTATO,
  "lead sem interesse": LEAD_STATUS.SEM_INTERESSE,
  perdido: LEAD_STATUS.SEM_INTERESSE,
};

export function canonicalizeLeadStatus(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (LEAD_STATUS_META[value]) return value;
  const key = value.toLowerCase();
  return STATUS_ALIASES[key] || value;
}

export function getLeadStatusMeta(raw) {
  const status = canonicalizeLeadStatus(raw);
  return (
    LEAD_STATUS_META[status] || {
      color: "#1a2f5b",
      soft: "rgba(26, 47, 91, 0.08)",
    }
  );
}

export function getLeadStatusColor(raw) {
  const meta = getLeadStatusMeta(raw);
  return meta.chart || meta.color;
}

export function isConvertedLeadStatus(raw) {
  const status = canonicalizeLeadStatus(raw);
  return status === LEAD_STATUS.CONVERTIDO;
}
