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

function normalizeRegiao(regiao) {
  return String(regiao || "").trim().toUpperCase();
}

function isMissingRegiaoIndex(error) {
  return (
    error?.name === "ValidationException" ||
    error?.name === "ResourceNotFoundException"
  );
}

async function queryConsultoresByRegiao(regiao) {
  const indexName = ENV.DYNAMODB_CONSULTORES_REGIAO_INDEX || "gsi_regiao";
  const regiaoAttr = ENV.DYNAMODB_CONSULTORES_REGIAO_ATTR || "regiao";
  const target = normalizeRegiao(regiao);
  const items = [];
  let lastKey;

  do {
    const page = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: indexName,
        KeyConditionExpression: "#regiao = :regiao",
        FilterExpression: "#ativo = :ativo",
        ExpressionAttributeNames: {
          "#regiao": regiaoAttr,
          "#ativo": "ativo",
        },
        ExpressionAttributeValues: {
          ":regiao": target,
          ":ativo": true,
        },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(page.Items || []));
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

/**
 * Busca consultores ativos por região (GSI gsi_regiao).
 */
export async function findConsultoresByRegiao(regiao) {
  if (!regiao) return [];
  const target = normalizeRegiao(regiao);

  try {
    return await queryConsultoresByRegiao(target);
  } catch (error) {
    if (!isMissingRegiaoIndex(error)) throw error;
    console.warn(
      "[CONSULTORES] gsi_regiao indisponível — fallback Scan + filtro em memória.",
    );
    const items = await listActiveConsultores();
    return items.filter(
      (consultor) => normalizeRegiao(consultor.regiao) === target,
    );
  }
}

export async function findConsultoresGestao() {
  const items = await listActiveConsultores();
  return items.filter(isPerfilGestao);
}

export function getConsultorCargaAceita(consultor) {
  const n = Number(consultor?.cargaAceita);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Incrementa carteira ativa após aceite de lead.
 */
export async function incrementCargaAceita(consultorId) {
  if (!consultorId) return;
  try {
    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id: String(consultorId) },
        UpdateExpression: "ADD cargaAceita :one",
        ExpressionAttributeValues: { ":one": 1 },
      }),
    );
  } catch (error) {
    console.warn("[CONSULTORES] Falha ao incrementar cargaAceita:", error.message);
  }
}

/**
 * Decrementa carteira quando o lead sai do funil ativo.
 */
export async function decrementCargaAceita(consultorId) {
  if (!consultorId) return;
  try {
    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id: String(consultorId) },
        UpdateExpression: "ADD cargaAceita :minus",
        ConditionExpression: "attribute_exists(cargaAceita) AND cargaAceita > :zero",
        ExpressionAttributeValues: { ":minus": -1, ":zero": 0 },
      }),
    );
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") {
      console.warn("[CONSULTORES] Falha ao decrementar cargaAceita:", error.message);
    }
  }
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
