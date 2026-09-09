import {
  ConditionalCheckFailedException,
  query,
  withTransaction,
  wrapDuplicateAsConditional,
} from "./mysql.js";
import { applyDocumentUpdates, evaluateCondition } from "./conditions.js";
import { openLead, registroHmac, sealLead } from "./sealed.js";

export async function getById(id) {
  if (!id) return null;
  const rows = await query(
    "SELECT id, payload FROM leads WHERE id = ? LIMIT 1",
    [String(id)],
  );
  return openLead(rows[0]);
}

export async function putIfNotExists(item) {
  const sealed = sealLead(item);
  try {
    await query(
      `INSERT INTO leads (
         id, payload, id_zoho, protocolo, consultor_id, sla_status,
         sla_deadline, uf_crm, entrada_em, registro_hmac
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sealed.id,
        JSON.stringify(sealed.payload),
        sealed.id_zoho,
        sealed.protocolo,
        sealed.consultor_id,
        sealed.sla_status,
        sealed.sla_deadline,
        sealed.uf_crm,
        sealed.entrada_em,
        sealed.registro_hmac,
      ],
    );
    return item;
  } catch (error) {
    wrapDuplicateAsConditional(error);
  }
}

export async function update(id, updates, condition) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      "SELECT id, payload FROM leads WHERE id = ? LIMIT 1 FOR UPDATE",
      [String(id)],
    );
    const current = openLead(rows[0]);
    if (!current) {
      throw new ConditionalCheckFailedException("Lead não encontrado");
    }

    const existsOk = current.id != null;
    const extraOk = evaluateCondition(current, condition);
    if (!existsOk || !extraOk) {
      throw new ConditionalCheckFailedException();
    }

    const next = applyDocumentUpdates(current, updates);
    const sealed = sealLead(next);
    await conn.execute(
      `UPDATE leads SET
         payload = ?, id_zoho = ?, protocolo = ?, consultor_id = ?,
         sla_status = ?, sla_deadline = ?, uf_crm = ?, entrada_em = ?,
         registro_hmac = ?
       WHERE id = ?`,
      [
        JSON.stringify(sealed.payload),
        sealed.id_zoho,
        sealed.protocolo,
        sealed.consultor_id,
        sealed.sla_status,
        sealed.sla_deadline,
        sealed.uf_crm,
        sealed.entrada_em,
        sealed.registro_hmac,
        String(id),
      ],
    );
    return next;
  });
}

export async function findByZohoId(idZoho) {
  if (!idZoho) return null;
  const rows = await query(
    "SELECT id, payload FROM leads WHERE id_zoho = ? LIMIT 1",
    [String(idZoho)],
  );
  return openLead(rows[0]);
}

export async function findByProtocolo(protocolo) {
  if (!protocolo) return null;
  const rows = await query(
    "SELECT id, payload FROM leads WHERE protocolo = ? LIMIT 1",
    [String(protocolo)],
  );
  return openLead(rows[0]);
}

export async function findByRegistroUf(numeroRegistro, ufCrm) {
  const hmac = registroHmac(numeroRegistro);
  const uf = String(ufCrm || "").trim().toUpperCase();
  if (!hmac || !uf) return null;
  const rows = await query(
    "SELECT id, payload FROM leads WHERE registro_hmac = ? AND uf_crm = ? LIMIT 1",
    [hmac, uf],
  );
  return openLead(rows[0]);
}

function openRows(rows) {
  return rows.map(openLead).filter(Boolean);
}

export async function listAll() {
  const rows = await query(
    "SELECT id, payload FROM leads ORDER BY entrada_em DESC, id DESC",
  );
  return openRows(rows);
}

export async function listByConsultorId(consultorId) {
  if (!consultorId) return [];
  const rows = await query(
    "SELECT id, payload FROM leads WHERE consultor_id = ? ORDER BY entrada_em DESC, id DESC",
    [String(consultorId)],
  );
  return openRows(rows);
}

export async function listBySlaStatus(status, { deadlineBefore } = {}) {
  if (!status) return [];
  if (deadlineBefore) {
    const rows = await query(
      `SELECT id, payload FROM leads
       WHERE sla_status = ?
         AND sla_deadline IS NOT NULL
         AND sla_deadline < ?
       ORDER BY sla_deadline ASC`,
      [String(status), String(deadlineBefore)],
    );
    return openRows(rows);
  }
  const rows = await query(
    "SELECT id, payload FROM leads WHERE sla_status = ? ORDER BY sla_deadline ASC, id ASC",
    [String(status)],
  );
  return openRows(rows);
}

export async function listExpiredOffers(nowIso) {
  const now = nowIso || new Date().toISOString();
  const rows = await query(
    `SELECT id, payload FROM leads
     WHERE sla_status IN ('ofertado', 'pendente')
       AND sla_deadline IS NOT NULL
       AND sla_deadline < ?`,
    [now],
  );
  return openRows(rows);
}

export async function listByNomeContains(nome) {
  const term = String(nome || "").trim().toLowerCase();
  if (!term) return [];
  const items = await listAll();
  return items.filter((lead) =>
    String(lead.nome || "").toLowerCase().includes(term),
  );
}

export async function countAcceptedByConsultorId(consultorId) {
  if (!consultorId) return 0;
  const rows = await query(
    `SELECT COUNT(*) AS total FROM leads
     WHERE consultor_id = ?
       AND sla_status IN ('aceito', 'confirmado')`,
    [String(consultorId)],
  );
  return Number(rows[0]?.total || 0);
}
