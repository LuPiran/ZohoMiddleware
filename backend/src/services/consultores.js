import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";

const TABLE = () => ENV.DYNAMODB_CONSULTORES_TABLE;

function asString(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function normalizeEmail(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca consultor em portal_consultores pelo e-mail (GSI gsi_email).
 */
export async function findConsultorByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const indexName = ENV.DYNAMODB_CONSULTORES_EMAIL_INDEX || "gsi_email";
  const emailAttr = ENV.DYNAMODB_CONSULTORES_EMAIL_ATTR || "email";

  try {
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: indexName,
        KeyConditionExpression: "#emailAttr = :email",
        ExpressionAttributeNames: { "#emailAttr": emailAttr },
        ExpressionAttributeValues: { ":email": normalized },
        Limit: 1,
      }),
    );

    if (result.Items?.length) return result.Items[0];

    // Alguns cadastros podem ter e-mail com caixa original
    const raw = asString(email);
    if (raw && raw !== normalized) {
      const retry = await dynamoDocClient.send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: indexName,
          KeyConditionExpression: "#emailAttr = :email",
          ExpressionAttributeNames: { "#emailAttr": emailAttr },
          ExpressionAttributeValues: { ":email": raw },
          Limit: 1,
        }),
      );
      if (retry.Items?.length) return retry.Items[0];
    }

    return null;
  } catch (error) {
    if (
      error.name === "ValidationException" ||
      error.name === "ResourceNotFoundException"
    ) {
      const err = new Error(
        `Índice "${indexName}" indisponível em ${TABLE()}. Confira gsi_email / atributo "${emailAttr}".`,
      );
      err.status = 503;
      err.code = "DYNAMO_CONSULTOR_GSI_MISSING";
      throw err;
    }
    throw error;
  }
}

export function getConsultorDisplayName(consultor) {
  if (!consultor) return undefined;
  return (
    asString(consultor.nome) ||
    asString(consultor.name) ||
    asString(consultor.Nome) ||
    asString(consultor.Name) ||
    undefined
  );
}

export function getConsultorGerencia(consultor) {
  if (!consultor) return undefined;
  const raw =
    consultor.gerencia ??
    consultor.Gerencia ??
    consultor.gerenciaId ??
    consultor.Gerencia_Id;
  if (raw && typeof raw === "object") {
    return asString(raw.name ?? raw.nome ?? raw.id);
  }
  return asString(raw);
}
