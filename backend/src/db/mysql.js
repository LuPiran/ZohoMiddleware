import mysql from "mysql2/promise";
import { ENV } from "../config/env.js";

export class ConditionalCheckFailedException extends Error {
  constructor(message = "Conditional check failed") {
    super(message);
    this.name = "ConditionalCheckFailedException";
  }
}

let pool;

function mysqlConfig(extra = {}) {
  return {
    host: ENV.MYSQL_HOST,
    port: Number(ENV.MYSQL_PORT) || 3306,
    user: ENV.MYSQL_USER,
    password: ENV.MYSQL_PASSWORD,
    database: ENV.MYSQL_DATABASE,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: Math.min(Number(ENV.MYSQL_POOL_SIZE) || 10, 20),
    enableKeepAlive: true,
    connectTimeout: 10_000,
    ssl: ENV.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    ...extra,
  };
}

export function getPool() {
  if (!pool) {
    if (!ENV.MYSQL_HOST || !ENV.MYSQL_USER || !ENV.MYSQL_DATABASE || !ENV.MYSQL_PASSWORD) {
      const err = new Error(
        "MySQL não configurado. Defina MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD e MYSQL_DATABASE.",
      );
      err.status = 503;
      err.code = "MYSQL_NOT_CONFIGURED";
      throw err;
    }
    pool = mysql.createPool(mysqlConfig());
  }
  return pool;
}

export function parseJsonColumn(value) {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString("utf8"));
  }
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // conexão já pode ter caído
    }
    throw error;
  } finally {
    conn.release();
  }
}

export async function pingMysql() {
  await query("SELECT 1 AS ok");
}

export async function waitForMysql({ retries = 30, delayMs = 1000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pingMysql();
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[MYSQL] Aguardando conexão (${attempt}/${retries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const err = new Error("MySQL indisponível.");
  err.status = 503;
  err.code = "MYSQL_UNAVAILABLE";
  err.cause = lastError;
  throw err;
}

export function isDuplicateKeyError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
}

export function wrapDuplicateAsConditional(error) {
  if (isDuplicateKeyError(error)) {
    throw new ConditionalCheckFailedException(error.message);
  }
  throw error;
}

export function mysqlMeta() {
  return {
    engine: "mysql",
    database: ENV.MYSQL_DATABASE,
    table: "central_kv",
    encrypted: true,
  };
}

export async function closeMysql() {
  if (!pool) return;
  await pool.end();
  pool = null;
}
