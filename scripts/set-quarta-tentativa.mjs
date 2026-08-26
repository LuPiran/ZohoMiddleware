/**
 * set-quarta-tentativa.mjs
 *
 * Coloca um lead na quarta tentativa (em aberto) diretamente no DynamoDB.
 * Uso: node scripts/set-quarta-tentativa.mjs "Teste Distribuição 1"
 *
 * Executa na VPS:
 *   cd /root/ZohoMiddleware && node scripts/set-quarta-tentativa.mjs "Teste Distribuição 1"
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Carrega .env do backend ─────────────────────────────────────────────────
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

const TABLE = process.env.DYNAMODB_LEADS_TABLE || "portal_leads_medicos";
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-2";

const client = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(client);

const nomeBuscado = process.argv[2];
if (!nomeBuscado) {
  console.error("❌ Informe o nome do lead: node scripts/set-quarta-tentativa.mjs \"Teste Distribuição 1\"");
  process.exit(1);
}

// ── Busca o lead pelo nome ──────────────────────────────────────────────────
console.log(`🔍 Buscando lead com nome contendo "${nomeBuscado}" na tabela ${TABLE}...`);

const scanResult = await dynamo.send(new ScanCommand({
  TableName: TABLE,
  FilterExpression: "contains(#nome, :nome)",
  ExpressionAttributeNames: { "#nome": "nome" },
  ExpressionAttributeValues: { ":nome": nomeBuscado },
}));

const items = scanResult.Items || [];
if (items.length === 0) {
  console.error(`❌ Nenhum lead encontrado com nome contendo "${nomeBuscado}".`);
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

// ── Monta os campos para quarta tentativa ───────────────────────────────────
const now = new Date();
const oneMonthAgo = (n) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};
const futureMeio = new Date(now);
futureMeio.setDate(futureMeio.getDate() + 15); // prazo: daqui a 15 dias

const updates = {
  // Garante lead aceito
  slaStatus:       lead.slaStatus || "aceito",
  dataQualificado: lead.dataQualificado || lead.slaCheckinAt || oneMonthAgo(3),

  // 1ª tentativa — Sem Retorno
  dataPrimeiraTentativa:    oneMonthAgo(2.5),
  descricaoPrimeiraTentativa: "Primeira tentativa de contato — sem retorno (forçado por script)",
  statusPrimeiraTentativa:  "Sem Retorno",
  adicionarSegundaTentativa: true,

  // 2ª tentativa — Sem Retorno
  dataSegundaTentativa:     oneMonthAgo(1.5),
  descricaoSegundaTentativa: "Segunda tentativa de contato — sem retorno (forçado por script)",
  statusSegundaTentativa:   "Sem Retorno",
  adicionarTerceiraTentativa: true,

  // 3ª tentativa — Sem Retorno (abre a 4ª)
  dataTerceiraTentativa:    oneMonthAgo(0.5),
  descricaoTerceiraTentativa: "Terceira tentativa de contato — sem retorno (forçado por script)",
  statusTerceiraTentativa:  "Sem Retorno",

  // 4ª tentativa — solicitada, em aberto
  adicionarQuartaTentativa:         true,
  dataSolicitacaoQuartaTentativa:   oneMonthAgo(0.4),
  motivoQuartaTentativa:            "Quarta tentativa solicitada para teste do fluxo",
  dataQuartaTentativa:              futureMeio.toISOString(), // prazo = daqui 15 dias
  // statusQuartaTentativa: NÃO definido → 4ª tentativa ainda aberta

  updatedAt: now.toISOString(),
};

// Remove campos undefined/null
const cleanUpdates = Object.fromEntries(
  Object.entries(updates).filter(([, v]) => v !== undefined && v !== null)
);

// Monta UpdateExpression
const keys   = Object.keys(cleanUpdates);
const setExp = keys.map((k) => `#f_${k} = :v_${k}`).join(", ");
const exprNames  = Object.fromEntries(keys.map((k) => [`#f_${k}`, k]));
const exprValues = Object.fromEntries(keys.map((k) => [`:v_${k}`, cleanUpdates[k]]));

console.log(`\n📝 Aplicando ${keys.length} campos para quarta tentativa em aberto...`);

await dynamo.send(new UpdateCommand({
  TableName: TABLE,
  Key: { id: lead.id },
  UpdateExpression: `SET ${setExp}`,
  ExpressionAttributeNames: exprNames,
  ExpressionAttributeValues: exprValues,
}));

console.log(`\n🎉 Feito! Lead "${lead.nome}" está agora na 4ª tentativa (em aberto, prazo: ${futureMeio.toLocaleDateString("pt-BR")}).`);
console.log(`   Abra no portal para conferir.`);
