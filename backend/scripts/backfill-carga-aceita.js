/**
 * Backfill único: recalcula cargaAceita de cada consultor a partir dos leads aceitos.
 *
 * Uso (na pasta backend):
 *   node scripts/backfill-carga-aceita.js
 *
 * Requer AWS credentials e variáveis de ambiente do backend (.env).
 */
import dotenv from "dotenv";
import { ScanCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../src/config/dynamodb.js";
import { ENV } from "../src/config/env.js";

dotenv.config();

const CONSULTORES_TABLE = ENV.DYNAMODB_CONSULTORES_TABLE;
const LEADS_TABLE = ENV.DYNAMODB_LEADS_TABLE;
const CONSULTOR_INDEX = ENV.DYNAMODB_LEADS_CONSULTOR_INDEX || "gsi_consultor";
const CONSULTOR_PK = ENV.DYNAMODB_LEADS_CONSULTOR_ATTR || "consultorId";

function isAccepted(lead) {
  const s = String(lead?.slaStatus || "");
  return s === "aceito" || s === "confirmado";
}

async function countAcceptedForConsultor(consultorId) {
  let count = 0;
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new QueryCommand({
        TableName: LEADS_TABLE,
        IndexName: CONSULTOR_INDEX,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": CONSULTOR_PK },
        ExpressionAttributeValues: { ":pk": String(consultorId) },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of page.Items || []) {
      if (isAccepted(item)) count += 1;
    }
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return count;
}

async function scanAllConsultores() {
  const items = [];
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: CONSULTORES_TABLE,
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function main() {
  console.log("[BACKFILL] Recalculando cargaAceita...");
  const consultores = await scanAllConsultores();
  let updated = 0;

  for (const consultor of consultores) {
    if (!consultor?.id) continue;
    const carga = await countAcceptedForConsultor(consultor.id);
    const atual = Number(consultor.cargaAceita);
    if (Number.isFinite(atual) && atual === carga) continue;

    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: CONSULTORES_TABLE,
        Key: { id: String(consultor.id) },
        UpdateExpression: "SET cargaAceita = :carga",
        ExpressionAttributeValues: { ":carga": carga },
      }),
    );
    updated += 1;
    console.log(
      `[BACKFILL] ${consultor.email || consultor.id}: cargaAceita = ${carga}`,
    );
  }

  console.log(`[BACKFILL] Concluído. ${updated} consultor(es) atualizado(s).`);
}

main().catch((error) => {
  console.error("[BACKFILL] Falha:", error);
  process.exit(1);
});
