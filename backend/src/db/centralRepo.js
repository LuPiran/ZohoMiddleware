import { query } from "./mysql.js";
import { openCentral, sealCentral } from "./sealed.js";

export async function getItem(pk, sk) {
  const rows = await query(
    "SELECT pk, sk, payload FROM central_kv WHERE pk = ? AND sk = ? LIMIT 1",
    [String(pk), String(sk)],
  );
  return openCentral(rows[0]);
}

export async function putItem(item) {
  const sealed = sealCentral(item);
  await query(
    `INSERT INTO central_kv (pk, sk, payload) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
    [sealed.pk, sealed.sk, JSON.stringify(sealed.payload)],
  );
  return item;
}

export async function listByPk(pk) {
  const rows = await query(
    "SELECT pk, sk, payload FROM central_kv WHERE pk = ? ORDER BY sk ASC",
    [String(pk)],
  );
  return rows.map(openCentral).filter(Boolean);
}
