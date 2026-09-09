/**
 * Recalcula cargaAceita de cada consultor a partir dos leads aceitos.
 *
 * Uso (na pasta backend):
 *   node scripts/backfill-carga-aceita.js
 */
import dotenv from "dotenv";
import { migrateSchema } from "../src/db/migrate.js";
import * as consultoresRepo from "../src/db/consultoresRepo.js";
import * as leadsRepo from "../src/db/leadsRepo.js";
import { closeMysql } from "../src/db/mysql.js";

dotenv.config();

async function main() {
  await migrateSchema();
  console.log("[BACKFILL] Recalculando cargaAceita...");
  const consultores = await consultoresRepo.listAll();
  let updated = 0;

  for (const consultor of consultores) {
    if (!consultor?.id) continue;
    const carga = await leadsRepo.countAcceptedByConsultorId(consultor.id);
    const atual = Number(consultor.cargaAceita);
    if (Number.isFinite(atual) && atual === carga) continue;

    await consultoresRepo.setCargaAceita(consultor.id, carga);
    updated += 1;
    console.log(
      `[BACKFILL] ${consultor.email || consultor.id}: cargaAceita = ${carga}`,
    );
  }

  console.log(`[BACKFILL] Concluído. ${updated} consultor(es) atualizado(s).`);
}

main()
  .catch((error) => {
    console.error("[BACKFILL] Falha:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMysql();
  });
