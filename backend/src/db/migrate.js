import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { ENV } from "../config/env.js";
import { assertEncryptionReady } from "./crypto.js";
import { getPool, waitForMysql } from "./mysql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function adminConfig() {
  const asRoot = Boolean(ENV.MYSQL_ROOT_PASSWORD);
  return {
    host: ENV.MYSQL_HOST,
    port: Number(ENV.MYSQL_PORT) || 3306,
    user: asRoot ? "root" : ENV.MYSQL_USER,
    password: asRoot ? ENV.MYSQL_ROOT_PASSWORD : ENV.MYSQL_PASSWORD,
    charset: "utf8mb4",
    multipleStatements: true,
    timezone: "Z",
  };
}

async function columnInfo(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME, EXTRA FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [ENV.MYSQL_DATABASE, table, column],
  );
  return rows[0] || null;
}

async function columnExtra(conn, table, column) {
  return columnInfo(conn, table, column)?.EXTRA || "";
}

async function hasColumn(conn, table, column) {
  return Boolean(await columnInfo(conn, table, column));
}

async function upgradeLegacyGeneratedColumns(conn) {
  const nomeExtra = await columnExtra(conn, "leads", "nome");
  if (nomeExtra && String(nomeExtra).toLowerCase().includes("generated")) {
    await conn.query("ALTER TABLE leads DROP INDEX idx_leads_nome");
    await conn.query("ALTER TABLE leads DROP COLUMN nome");
  }

  const registroGenerated = await columnExtra(conn, "leads", "numero_registro");
  if (registroGenerated && String(registroGenerated).toLowerCase().includes("generated")) {
    await conn.query("ALTER TABLE leads DROP INDEX idx_leads_registro_uf");
    await conn.query("ALTER TABLE leads DROP COLUMN numero_registro");
  }

  const idZohoGenerated = await columnExtra(conn, "leads", "id_zoho");
  if (idZohoGenerated && String(idZohoGenerated).toLowerCase().includes("generated")) {
    await conn.query("ALTER TABLE leads DROP INDEX uq_leads_id_zoho");
    await conn.query("ALTER TABLE leads DROP INDEX uq_leads_protocolo");
    await conn.query("ALTER TABLE leads DROP INDEX idx_leads_consultor");
    await conn.query("ALTER TABLE leads DROP INDEX idx_leads_sla");
    await conn.query("ALTER TABLE leads DROP COLUMN id_zoho");
    await conn.query("ALTER TABLE leads DROP COLUMN protocolo");
    await conn.query("ALTER TABLE leads DROP COLUMN consultor_id");
    await conn.query("ALTER TABLE leads DROP COLUMN sla_status");
    await conn.query("ALTER TABLE leads DROP COLUMN sla_deadline");
    await conn.query("ALTER TABLE leads DROP COLUMN uf_crm");
    await conn.query("ALTER TABLE leads DROP COLUMN entrada_em");
  }

  if (!(await hasColumn(conn, "leads", "id_zoho"))) {
    await conn.query(`
      ALTER TABLE leads
        ADD COLUMN id_zoho VARCHAR(128) NULL,
        ADD COLUMN protocolo VARCHAR(32) NULL,
        ADD COLUMN consultor_id VARCHAR(128) NULL,
        ADD COLUMN sla_status VARCHAR(64) NULL,
        ADD COLUMN sla_deadline VARCHAR(64) NULL,
        ADD COLUMN uf_crm VARCHAR(16) NULL,
        ADD COLUMN entrada_em VARCHAR(64) NULL,
        ADD COLUMN registro_hmac CHAR(64) NULL,
        ADD UNIQUE KEY uq_leads_id_zoho (id_zoho),
        ADD UNIQUE KEY uq_leads_protocolo (protocolo),
        ADD KEY idx_leads_consultor (consultor_id, entrada_em),
        ADD KEY idx_leads_sla (sla_status, sla_deadline),
        ADD KEY idx_leads_registro_hmac (registro_hmac, uf_crm)
    `);
  } else if (!(await hasColumn(conn, "leads", "registro_hmac"))) {
    await conn.query(
      "ALTER TABLE leads ADD COLUMN registro_hmac CHAR(64) NULL, ADD KEY idx_leads_registro_hmac (registro_hmac, uf_crm)",
    );
  }

  const emailGenerated = await columnExtra(conn, "consultores", "email");
  if (emailGenerated && String(emailGenerated).toLowerCase().includes("generated")) {
    await conn.query("ALTER TABLE consultores DROP INDEX idx_consultores_email");
    await conn.query("ALTER TABLE consultores DROP COLUMN email");
    await conn.query("ALTER TABLE consultores DROP INDEX idx_consultores_regiao_ativo");
    await conn.query("ALTER TABLE consultores DROP INDEX idx_consultores_gerencia");
    await conn.query("ALTER TABLE consultores DROP COLUMN ativo");
    await conn.query("ALTER TABLE consultores DROP COLUMN regiao");
    await conn.query("ALTER TABLE consultores DROP COLUMN gerencia");
  }

  if (!(await hasColumn(conn, "consultores", "email_hmac"))) {
    await conn.query(`
      ALTER TABLE consultores
        ADD COLUMN email_hmac CHAR(64) NULL,
        ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN regiao VARCHAR(64) NULL,
        ADD COLUMN gerencia VARCHAR(255) NULL,
        ADD UNIQUE KEY uq_consultores_email_hmac (email_hmac),
        ADD KEY idx_consultores_regiao_ativo (regiao, ativo),
        ADD KEY idx_consultores_gerencia (gerencia)
    `);
  }
}

export async function migrateSchema() {
  assertEncryptionReady();
  await waitForMysql();

  const sql = await readFile(path.join(__dirname, "schema.sql"), "utf8");
  const conn = await mysql.createConnection({
    ...adminConfig(),
    database: ENV.MYSQL_DATABASE,
  });

  try {
    await conn.query(sql);
    await upgradeLegacyGeneratedColumns(conn);
    await conn.query(
      "INSERT IGNORE INTO schema_migrations (name) VALUES (?)",
      ["001_init_json_documents"],
    );
    await conn.query(
      "INSERT IGNORE INTO schema_migrations (name) VALUES (?)",
      ["002_encrypted_payloads"],
    );
    console.log(
      `[MYSQL] Schema aplicado em ${ENV.MYSQL_HOST}/${ENV.MYSQL_DATABASE}`,
    );
  } finally {
    await conn.end();
  }

  await getPool().execute("SELECT 1");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrateSchema()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[MYSQL] Falha na migration:", error);
      process.exit(1);
    });
}
