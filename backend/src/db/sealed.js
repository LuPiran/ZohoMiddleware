import { decryptJson, encryptJson, hmacIndex, isSealedPayload, normalizeEmail } from "./crypto.js";
import { parseJsonColumn } from "./mysql.js";

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

export function leadIndexes(item) {
  const registro = emptyToNull(item?.numeroRegistro);
  return {
    id_zoho: emptyToNull(item?.idZoho),
    protocolo: emptyToNull(item?.protocolo),
    consultor_id: emptyToNull(item?.consultorId),
    sla_status: emptyToNull(item?.slaStatus),
    sla_deadline: emptyToNull(item?.slaDeadline),
    uf_crm: emptyToNull(item?.ufCrm)?.toUpperCase() || null,
    entrada_em: emptyToNull(item?.entradaEm),
    registro_hmac: registro ? hmacIndex(registro) : null,
  };
}

export function consultorIndexes(item) {
  const email = normalizeEmail(item?.email);
  return {
    email_hmac: email ? hmacIndex(email) : null,
    ativo: item?.ativo === true || item?.ativo === 1 ? 1 : 0,
    regiao: emptyToNull(item?.regiao)?.toUpperCase() || null,
    gerencia: emptyToNull(item?.gerencia),
  };
}

export function sealLead(item) {
  if (!item?.id) throw new Error("Lead sem id");
  return {
    id: String(item.id),
    payload: encryptJson(item, `leads:${item.id}`),
    ...leadIndexes(item),
  };
}

export function sealConsultor(item) {
  if (!item?.id) throw new Error("Consultor sem id");
  return {
    id: String(item.id),
    payload: encryptJson(item, `consultores:${item.id}`),
    ...consultorIndexes(item),
  };
}

export function sealCentral(item) {
  const pk = String(item.pk);
  const sk = String(item.sk);
  return {
    pk,
    sk,
    payload: encryptJson(item, `central_kv:${pk}:${sk}`),
  };
}

function openWith(row, aad) {
  if (!row) return null;
  const parsed = parseJsonColumn(row.payload);
  if (!parsed) return null;
  if (isSealedPayload(parsed)) return decryptJson(parsed, aad);
  return parsed;
}

export function openLead(row) {
  if (!row) return null;
  return openWith(row, `leads:${row.id}`);
}

export function openConsultor(row) {
  if (!row) return null;
  return openWith(row, `consultores:${row.id}`);
}

export function openCentral(row) {
  if (!row) return null;
  return openWith(row, `central_kv:${row.pk}:${row.sk}`);
}

export function emailHmac(email) {
  const normalized = normalizeEmail(email);
  return normalized ? hmacIndex(normalized) : null;
}

export function registroHmac(numeroRegistro) {
  const registro = emptyToNull(numeroRegistro);
  return registro ? hmacIndex(registro) : null;
}
