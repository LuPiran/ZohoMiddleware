/**
 * Aplica privilégio mínimo no MySQL (SELECT/INSERT/UPDATE/DELETE).
 * Uso: node scripts/harden-mysql.js
 */
import mysql from "mysql2/promise";
import { ENV } from "../src/config/env.js";

const rootPassword = process.env.MYSQL_ROOT_PASSWORD || ENV.MYSQL_ROOT_PASSWORD;
if (!rootPassword) {
  console.error("[HARDEN] MYSQL_ROOT_PASSWORD ausente.");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: ENV.MYSQL_HOST,
  port: Number(ENV.MYSQL_PORT) || 3306,
  user: "root",
  password: rootPassword,
  multipleStatements: true,
});

try {
  await conn.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'tegrapharma'@'%'");
  await conn.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON tegrapharma.* TO 'tegrapharma'@'%'",
  );
  await conn.query("FLUSH PRIVILEGES");
  const [grants] = await conn.query("SHOW GRANTS FOR 'tegrapharma'@'%'");
  console.log("[HARDEN] Privilégios do usuário da aplicação reduzidos a CRUD.");
  for (const row of grants) {
    console.log("[HARDEN]", Object.values(row)[0]);
  }
} finally {
  await conn.end();
}
