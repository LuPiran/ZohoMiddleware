import { QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

export function normalizeConsultorPerfil(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getConsultorPerfil(consultor) {
  return normalizeConsultorPerfil(
    consultor?.perfil ||
      consultor?.Perfil ||
      consultor?.role ||
      consultor?.cargo ||
      consultor?.Cargo,
  );
}

export function isPerfilGerencia(consultor) {
  const perfil = getConsultorPerfil(consultor);
  return perfil.includes("gerencia") || perfil.includes("gerente");
}

export function isPerfilGestao(consultor) {
  const perfil = getConsultorPerfil(consultor);
  return perfil.includes("gestao");
}

export function isPerfilAdminPainel(consultor) {
  const perfil = getConsultorPerfil(consultor);
  return perfil.includes("admin");
}

export function isPerfilConsultorFila(consultor) {
  return (
    !isPerfilGerencia(consultor) &&
    !isPerfilGestao(consultor) &&
    !isPerfilAdminPainel(consultor)
  );
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

/**
 * Consultores ativos (Scan). Usado pela fila SLA.
 */
export async function listActiveConsultores() {
  const items = [];
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "#ativo = :ativo",
        ExpressionAttributeNames: { "#ativo": "ativo" },
        ExpressionAttributeValues: { ":ativo": true },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

/**
 * Busca consultores ativos por região.
 */
export async function findConsultoresByRegiao(regiao) {
  if (!regiao) return [];
  const target = String(regiao).trim().toUpperCase();
  const items = await listActiveConsultores();
  return items.filter(
    (consultor) => String(consultor.regiao || "").trim().toUpperCase() === target,
  );
}

export async function findConsultoresGestao() {
  const items = await listActiveConsultores();
  return items.filter(isPerfilGestao);
}

/**
 * Atualiza timestamp de última atribuição do consultor (ponteiro round-robin).
 */
export async function updateConsultorUltimaAtribuicao(consultorId, isoDate) {
  await dynamoDocClient.send(
    new UpdateCommand({
      TableName: ENV.DYNAMODB_CONSULTORES_TABLE,
      Key: { id: String(consultorId) },
      UpdateExpression: "SET ultimaAtribuicao = :d",
      ExpressionAttributeValues: { ":d": isoDate },
    }),
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
