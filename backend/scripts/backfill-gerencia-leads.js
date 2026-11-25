/**
 * Corrige a gerência dos leads que ficaram com a gerência da ficha do Zoho
 * em vez da do consultor que está com o lead (chamado #14632: lead da Karizi
 * aparecendo na equipe e nos e-mails da Marcelli).
 *
 * Só mexe em `gerencia` do lead no Portal (MySQL). Não grava no Zoho e não
 * muda consultor, status nem prazo.
 *
 * Uso (na pasta backend):
 *   node scripts/backfill-gerencia-leads.js            # só mostra (simulação)
 *   node scripts/backfill-gerencia-leads.js --confirm  # grava
 */
import dotenv from "dotenv";
import { migrateSchema } from "../src/db/migrate.js";
import * as consultoresRepo from "../src/db/consultoresRepo.js";
import * as leadsRepo from "../src/db/leadsRepo.js";
import { closeMysql } from "../src/db/mysql.js";

dotenv.config();

const confirmar = process.argv.includes("--confirm");

async function main() {
  await migrateSchema();
  const consultores = await consultoresRepo.listAll();
  const porId = new Map(consultores.filter((c) => c?.id).map((c) => [String(c.id), c]));

  const leads = await leadsRepo.listAll();
  let divergentes = 0;
  let corrigidos = 0;
  const resumo = new Map();

  for (const lead of leads) {
    const consultor = porId.get(String(lead.consultorId || ""));
    const gerenciaConsultor = String(consultor?.gerencia || "").trim();
    if (!consultor || !gerenciaConsultor) continue;
    if (String(lead.gerencia || "").trim() === gerenciaConsultor) continue;

    divergentes += 1;
    const chave = `${lead.gerencia || "(vazia)"} → ${gerenciaConsultor} (${consultor.nome || consultor.email})`;
    resumo.set(chave, (resumo.get(chave) || 0) + 1);

    if (confirmar) {
      await leadsRepo.update(lead.id, { gerencia: gerenciaConsultor });
      corrigidos += 1;
    }
  }

  for (const [chave, n] of [...resumo.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`[GERENCIA] ${n}x ${chave}`);
  }
  console.log(
    confirmar
      ? `[GERENCIA] Concluído. ${corrigidos} lead(s) corrigido(s).`
      : `[GERENCIA] Simulação: ${divergentes} lead(s) com gerência diferente da do consultor. Rode com --confirm para gravar.`,
  );
}

main()
  .catch((error) => {
    console.error("[GERENCIA] Falha:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMysql();
  });
