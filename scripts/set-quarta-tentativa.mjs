/**
 * set-quarta-tentativa.mjs
 *
 * Coloca um lead na quarta tentativa (em aberto) diretamente no MySQL.
 * Uso: node scripts/set-quarta-tentativa.mjs "Teste Distribuição 1"
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../backend/.env");
try {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [k, ...rest] = line.split("=");
    const key = k?.trim();
    if (key && !key.startsWith("#") && !(key in process.env)) {
      process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  console.warn("⚠️  Não encontrou backend/.env — usando variáveis de ambiente já existentes.");
}

const { migrateSchema } = await import("../backend/src/db/migrate.js");
const leadsRepo = await import("../backend/src/db/leadsRepo.js");
const { closeMysql } = await import("../backend/src/db/mysql.js");

const nomeBuscado = process.argv[2] || process.env.LEAD_NOME;
if (!nomeBuscado) {
  console.error("❌ Informe o nome: node scripts/set-quarta-tentativa.mjs \"Teste Distribuição 1\"");
  process.exit(1);
}

await migrateSchema();
console.log(`🔍 Buscando lead com nome contendo "${nomeBuscado}"...`);

const items = await leadsRepo.listByNomeContains(nomeBuscado);
if (items.length === 0) {
  console.error(`❌ Nenhum lead encontrado com nome contendo "${nomeBuscado}".`);
  await closeMysql();
  process.exit(1);
}

if (items.length > 1) {
  console.log(`⚠️  Múltiplos leads encontrados (${items.length}). Usando o primeiro:`);
  items.forEach((it, i) => console.log(`  [${i}] id=${it.id} nome="${it.nome}" status="${it.status}"`));
}

const lead = items[0];
console.log(`\n✅ Lead encontrado:`);
console.log(`   ID: ${lead.id}`);
console.log(`   Nome: ${lead.nome}`);
console.log(`   Status: ${lead.status}`);
console.log(`   slaStatus: ${lead.slaStatus}`);

const now = new Date();
const oneMonthAgo = (n) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};
const futureMeio = new Date(now);
futureMeio.setDate(futureMeio.getDate() + 15);

const updates = {
  slaStatus: lead.slaStatus || "aceito",
  dataQualificado: lead.dataQualificado || lead.slaCheckinAt || oneMonthAgo(3),
  dataPrimeiraTentativa: oneMonthAgo(2.5),
  descricaoPrimeiraTentativa: "Primeira tentativa de contato — sem retorno (forçado por script)",
  statusPrimeiraTentativa: "Sem Retorno",
  adicionarSegundaTentativa: true,
  dataSegundaTentativa: oneMonthAgo(1.5),
  descricaoSegundaTentativa: "Segunda tentativa de contato — sem retorno (forçado por script)",
  statusSegundaTentativa: "Sem Retorno",
  adicionarTerceiraTentativa: true,
  dataTerceiraTentativa: oneMonthAgo(0.5),
  descricaoTerceiraTentativa: "Terceira tentativa de contato — sem retorno (forçado por script)",
  statusTerceiraTentativa: "Sem Retorno",
  adicionarQuartaTentativa: true,
  dataSolicitacaoQuartaTentativa: oneMonthAgo(0.4),
  motivoQuartaTentativa: "Quarta tentativa solicitada para teste do fluxo",
  dataQuartaTentativa: futureMeio.toISOString(),
  updatedAt: now.toISOString(),
};

console.log(`\n📝 Aplicando campos para quarta tentativa em aberto...`);
await leadsRepo.update(lead.id, updates);
console.log(`\n🎉 Feito! Lead "${lead.nome}" está agora na 4ª tentativa (em aberto, prazo: ${futureMeio.toLocaleDateString("pt-BR")}).`);
await closeMysql();
