import {
  ConditionalCheckFailedException,
  query,
  withTransaction,
  wrapDuplicateAsConditional,
} from "./mysql.js";
import { applyDocumentUpdates } from "./conditions.js";
import { emailHmac, openConsultor, sealConsultor } from "./sealed.js";

function persistColumns(item) {
  const sealed = sealConsultor(item);
  return {
    sealed,
    params: [
      JSON.stringify(sealed.payload),
      sealed.email_hmac,
      sealed.ativo,
      sealed.regiao,
      sealed.gerencia,
      sealed.id,
    ],
  };
}

export async function getById(id) {
  if (!id) return null;
  const rows = await query(
    "SELECT id, payload FROM consultores WHERE id = ? LIMIT 1",
    [String(id)],
  );
  return openConsultor(rows[0]);
}

export async function findByEmail(email) {
  const hmac = emailHmac(email);
  if (!hmac) return null;
  const rows = await query(
    "SELECT id, payload FROM consultores WHERE email_hmac = ? LIMIT 1",
    [hmac],
  );
  return openConsultor(rows[0]);
}

export async function listActive() {
  const rows = await query(
    "SELECT id, payload FROM consultores WHERE ativo = 1 ORDER BY id ASC",
  );
  return rows.map(openConsultor).filter(Boolean);
}

export async function listAll() {
  const rows = await query(
    "SELECT id, payload FROM consultores ORDER BY id ASC",
  );
  return rows.map(openConsultor).filter(Boolean);
}

export async function listActiveByRegiao(regiao) {
  const target = String(regiao || "").trim().toUpperCase();
  if (!target) return [];
  const rows = await query(
    "SELECT id, payload FROM consultores WHERE ativo = 1 AND UPPER(regiao) = ? ORDER BY id ASC",
    [target],
  );
  return rows.map(openConsultor).filter(Boolean);
}

export async function putIfNotExists(item) {
  const { sealed } = persistColumns(item);
  try {
    await query(
      `INSERT INTO consultores (id, payload, email_hmac, ativo, regiao, gerencia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sealed.id,
        JSON.stringify(sealed.payload),
        sealed.email_hmac,
        sealed.ativo,
        sealed.regiao,
        sealed.gerencia,
      ],
    );
    return item;
  } catch (error) {
    wrapDuplicateAsConditional(error);
  }
}

export async function update(id, updates) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      "SELECT id, payload FROM consultores WHERE id = ? LIMIT 1 FOR UPDATE",
      [String(id)],
    );
    const current = openConsultor(rows[0]);
    if (!current) {
      throw new ConditionalCheckFailedException("Consultor não encontrado");
    }
    const next = applyDocumentUpdates(current, updates);
    const sealed = sealConsultor(next);
    await conn.execute(
      `UPDATE consultores
       SET payload = ?, email_hmac = ?, ativo = ?, regiao = ?, gerencia = ?
       WHERE id = ?`,
      [
        JSON.stringify(sealed.payload),
        sealed.email_hmac,
        sealed.ativo,
        sealed.regiao,
        sealed.gerencia,
        String(id),
      ],
    );
    return next;
  });
}

export async function incrementCargaAceita(consultorId) {
  if (!consultorId) return;
  const current = await getById(consultorId);
  if (!current) return;
  const carga = Number(current.cargaAceita);
  const next = Number.isFinite(carga) ? carga + 1 : 1;
  await update(consultorId, { cargaAceita: next });
}

export async function decrementCargaAceita(consultorId) {
  if (!consultorId) return 0;
  const current = await getById(consultorId);
  if (!current) return 0;
  const carga = Number(current.cargaAceita);
  if (!Number.isFinite(carga) || carga <= 0) return 0;
  await update(consultorId, { cargaAceita: carga - 1 });
  return 1;
}

export async function setCargaAceita(consultorId, carga) {
  const current = await getById(consultorId);
  if (!current) return null;
  return update(consultorId, { cargaAceita: Number(carga) || 0 });
}
