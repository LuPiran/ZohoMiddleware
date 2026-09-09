/**
 * Garante o schema MySQL (leads, consultores, central_kv).
 * Uso: node scripts/ensure-central-table.js
 */
import { migrateSchema } from "../src/db/migrate.js";
import { closeMysql } from "../src/db/mysql.js";

try {
  await migrateSchema();
  console.log("Schema MySQL ok.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeMysql();
}
