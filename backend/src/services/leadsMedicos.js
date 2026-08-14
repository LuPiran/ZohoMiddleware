import { randomUUID } from "crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  findConsultorByEmail,
  getConsultorDisplayName,
  getConsultorGerencia,
} from "./consultores.js";

const TABLE = () => ENV.DYNAMODB_LEADS_TABLE;

/**
 * Normaliza chaves do payload (PT/EN, espaços, acentos) para lookup flexível.
 */
function normalizeKey(key) {
  return String(key || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function unwrapLookup(value, prefer = "name") {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value !== "object") return value;

  if (prefer === "id") {
    return (
      value.id ??
      value.ID ??
      value.name ??
      value.Nome ??
      value.Name ??
      undefined
    );
  }

  // Zoho lookup: { id, name }
  return (
    value.name ??
    value.Nome ??
    value.Name ??
    value.email ??
    value.Email ??
    value.id ??
    value.ID ??
    undefined
  );
}

function pick(payload, aliases = [], prefer = "name") {
  if (!payload || typeof payload !== "object") return undefined;

  const normalizedAliases = aliases.map(normalizeKey);
  const entries = Object.entries(payload);

  for (const alias of normalizedAliases) {
    for (const [key, value] of entries) {
      if (normalizeKey(key) === alias) {
        return unwrapLookup(value, prefer);
      }
    }
  }

  return undefined;
}

function asString(value) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim();
}

function asIsoDate(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return undefined;

  // dd/mm/yyyy ou dd-mm-yyyy
  const br = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = br;
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.000Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

/**
 * Mapeia o payload do Zoho para o item DynamoDB (portal_leads_medicos).
 *
 * Chaves alinhadas aos GSIs:
 * - gsi_zoho → idZoho
 * - gsi_consultor → consultorId (PK) + entradaEm (SK)
 */
export function mapZohoPayloadToLead(payload) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const idZoho = asString(
    pick(
      source,
      [
        "idZoho",
        "zohoId",
        "idDoZoho",
        "zoho_id",
        "Zoho_ID",
        "ZohoId",
        "id_do_zoho",
      ],
      "id",
    ),
  );

  // id da tabela é sempre nosso (UUID). idZoho fica separado (GSI).
  const id = randomUUID();

  const nome = asString(pick(source, ["nome", "name", "Nome", "Name"]));
  const email = asString(pick(source, ["email", "e-mail", "Email", "E_mail"]));
  const telefone = asString(pick(source, ["telefone", "phone", "Phone", "Tel"]));
  const celular = asString(
    pick(source, ["celular", "mobile", "Mobile", "Celular"]),
  );
  const numeroRegistro = asString(
    pick(source, [
      "numeroRegistro",
      "numeroDeRegistro",
      "crm",
      "cro",
      "CRM",
      "CRO",
      "Numero_de_Registro",
      "Numero_Registro",
    ]),
  );
  const ufCrm = asString(
    pick(source, ["ufCrm", "ufDoCrm", "uf_crm", "UF_CRM", "UF", "uf"]),
  );
  const evento = asString(pick(source, ["evento", "Evento", "event"]));

  const emailConsultor = asString(
    pick(source, [
      "emailConsultor",
      "consultorEmail",
      "email_consultor",
      "Email_Consultor",
    ]),
  );

  // Não usar Owner.id do Zoho como consultorId do portal.
  // Preferir id explícito do portal; senão resolve por e-mail depois.
  const consultorId = asString(
    pick(source, ["consultorId", "idConsultor", "id_consultor"], "id"),
  );
  const consultor = asString(
    pick(source, ["consultor", "Consultor", "consultorNome", "owner", "Owner"]),
  );

  const tipoLead = asString(
    pick(source, ["tipoLead", "tipoDeLead", "Tipo_Lead", "Tipo_de_Lead"]),
  );
  const gerencia = asString(
    pick(source, ["gerencia", "Gerencia", "gerência", "manager", "Manager"]),
  );
  const status =
    asString(pick(source, ["status", "Status", "Stage"])) || "Qualificado";
  const dataNovoLead = asIsoDate(
    pick(source, [
      "dataNovoLead",
      "dataNovo",
      "Created_Time",
      "createdTime",
      "Data_Novo_Lead",
      "entradaEm",
    ]),
  );
  const dataQualificado = asIsoDate(
    pick(source, [
      "dataQualificado",
      "dataQualificacao",
      "Data_Qualificado",
      "qualifiedAt",
    ]),
  );

  const now = new Date().toISOString();
  const entradaEm =
    asIsoDate(pick(source, ["entradaEm", "Entrada_Em"])) ||
    dataNovoLead ||
    now;

  return {
    id,
    nome,
    email,
    telefone,
    celular,
    numeroRegistro,
    ufCrm,
    evento,
    idZoho,
    consultorId: consultorId || undefined,
    consultor,
    emailConsultor,
    tipoLead,
    gerencia,
    status,
    entradaEm,
    dataNovoLead: dataNovoLead || now,
    dataConversao: null,
    dataQualificado: dataQualificado || now,
    dataSemInteresse: null,
    dataSemContato: null,
    dataEmContato: null,
    dataEmAquecimento: null,
    descricaoPrimeiraTentativa: null,
    dataPrimeiraTentativa: null,
    statusPrimeiraTentativa: null,
    adicionarSegundaTentativa: false,
    descricaoSegundaTentativa: null,
    dataSegundaTentativa: null,
    statusSegundaTentativa: null,
    adicionarTerceiraTentativa: false,
    descricaoTerceiraTentativa: null,
    dataTerceiraTentativa: null,
    statusTerceiraTentativa: null,
    createdAt: now,
    updatedAt: now,
    source: "zoho",
  };
}

export function validateCreateLeadInput(lead) {
  const errors = [];

  if (!lead.idZoho) errors.push("idZoho é obrigatório");
  if (!lead.nome) errors.push("Nome é obrigatório");
  if (!lead.consultorId && !lead.consultor && !lead.emailConsultor) {
    errors.push("consultor / emailConsultor é obrigatório");
  }
  if (!lead.entradaEm) errors.push("entradaEm é obrigatório");

  return errors;
}

function normalizeEmail(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveViewerRole(perfil) {
  const p = normalizeText(perfil);
  if (
    p === "admin painel" ||
    p === "admin portal" ||
    p === "admin" ||
    p.includes("admin")
  ) {
    return "admin";
  }
  if (p.includes("gerente")) return "gerente";
  return "consultor";
}

/**
 * Resolve consultorId a partir de portal_consultores (e-mail).
 * Fallback: usa nome do consultor para não quebrar o GSI enquanto o cadastro não existir.
 */
async function enrichLeadWithPortalConsultor(lead, payload) {
  const source =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const email =
    lead.emailConsultor ||
    asString(
      pick(source, [
        "emailConsultor",
        "consultorEmail",
        "email_consultor",
        "Email_Consultor",
      ]),
    );

  if (email) {
    lead.emailConsultor = normalizeEmail(email) || email;
    try {
      const record = await findConsultorByEmail(email);
      if (record?.id) {
        lead.consultorId = String(record.id);
        lead.consultor =
          getConsultorDisplayName(record) || lead.consultor;
        lead.gerencia = lead.gerencia || getConsultorGerencia(record);
        return lead;
      }
    } catch (error) {
      // Se o GSI de consultores falhar, ainda tenta gravar com fallback.
      console.warn("[LEADS] Lookup portal_consultores falhou:", error.message);
    }
  }

  if (!lead.consultorId) {
    lead.consultorId = lead.consultor;
  }

  return lead;
}

async function findLeadByZohoId(idZoho) {
  const indexName = ENV.DYNAMODB_LEADS_ZOHO_ID_INDEX || "gsi_zoho";
  const zohoAttr = ENV.DYNAMODB_LEADS_ZOHO_ID_ATTR || "idZoho";

  try {
    const byGsi = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: indexName,
        KeyConditionExpression: "#zohoAttr = :idZoho",
        ExpressionAttributeNames: { "#zohoAttr": zohoAttr },
        ExpressionAttributeValues: { ":idZoho": idZoho },
        Limit: 1,
      }),
    );
    if (byGsi.Items?.length) return byGsi.Items[0];
    return null;
  } catch (error) {
    if (
      error.name === "ValidationException" ||
      error.name === "ResourceNotFoundException"
    ) {
      const err = new Error(
        `Índice "${indexName}" indisponível ou partition key diferente de "${zohoAttr}". Confira o GSI gsi_zoho no Dynamo.`,
      );
      err.status = 503;
      err.code = "DYNAMO_GSI_MISSING";
      throw err;
    }
    throw error;
  }
}

/**
 * Cria lead médico no DynamoDB a partir do payload Zoho.
 * Idempotente por idZoho (GSI gsi_zoho). id da tabela = UUID próprio.
 */
export async function createLeadFromZoho(payload) {
  let lead = mapZohoPayloadToLead(payload);
  lead = await enrichLeadWithPortalConsultor(lead, payload);

  const errors = validateCreateLeadInput(lead);
  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (!lead.consultorId) {
    const err = new Error(
      "consultorId não resolvido. Cadastre o consultor em portal_consultores ou envie consultor/emailConsultor.",
    );
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const existing = await findLeadByZohoId(lead.idZoho);
  if (existing) {
    return {
      created: false,
      alreadyExists: true,
      lead: existing,
    };
  }

  try {
    await dynamoDocClient.send(
      new PutCommand({
        TableName: TABLE(),
        Item: lead,
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      const current = await dynamoDocClient.send(
        new GetCommand({
          TableName: TABLE(),
          Key: { id: lead.id },
        }),
      );
      return {
        created: false,
        alreadyExists: true,
        lead: current.Item || lead,
      };
    }
    throw error;
  }

  return {
    created: true,
    alreadyExists: false,
    lead,
  };
}

async function scanAllLeads() {
  const items = [];
  let ExclusiveStartKey;

  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        ExclusiveStartKey,
      }),
    );
    items.push(...(page.Items || []));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items;
}

async function queryLeadsByConsultorId(consultorId) {
  if (!consultorId) return [];

  const indexName = ENV.DYNAMODB_LEADS_CONSULTOR_INDEX || "gsi_consultor";
  const pkAttr = ENV.DYNAMODB_LEADS_CONSULTOR_ATTR || "consultorId";
  const items = [];
  let ExclusiveStartKey;

  try {
    do {
      const page = await dynamoDocClient.send(
        new QueryCommand({
          TableName: TABLE(),
          IndexName: indexName,
          KeyConditionExpression: "#pk = :pk",
          ExpressionAttributeNames: { "#pk": pkAttr },
          ExpressionAttributeValues: { ":pk": String(consultorId) },
          ScanIndexForward: false,
          ExclusiveStartKey,
        }),
      );
      items.push(...(page.Items || []));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
  } catch (error) {
    if (
      error.name === "ValidationException" ||
      error.name === "ResourceNotFoundException"
    ) {
      const err = new Error(
        `Índice "${indexName}" indisponível ou partition key diferente de "${pkAttr}".`,
      );
      err.status = 503;
      err.code = "DYNAMO_GSI_MISSING";
      throw err;
    }
    throw error;
  }

  return items;
}

function leadMatchesConsultor(lead, viewer) {
  const ids = new Set(
    [viewer.id, viewer.consultorId]
      .filter(Boolean)
      .map((v) => String(v)),
  );
  const names = new Set(
    [viewer.nome, viewer.name, viewer.consultor]
      .filter(Boolean)
      .map(normalizeText),
  );
  const emails = new Set(
    [viewer.email, viewer.emailConsultor]
      .filter(Boolean)
      .map(normalizeEmail),
  );

  if (lead.consultorId && ids.has(String(lead.consultorId))) return true;
  if (lead.consultor && names.has(normalizeText(lead.consultor))) return true;
  if (lead.consultorId && names.has(normalizeText(lead.consultorId))) return true;
  if (lead.emailConsultor && emails.has(normalizeEmail(lead.emailConsultor))) {
    return true;
  }
  return false;
}

function leadMatchesGerencia(lead, gerencia) {
  if (!gerencia) return false;
  return normalizeText(lead.gerencia) === normalizeText(gerencia);
}

/**
 * DTO para a lista do portal (tabela + dashboard).
 */
export function toLeadListItem(lead) {
  return {
    id: lead.id,
    idZoho: lead.idZoho || null,
    nome: lead.nome || "",
    email: lead.email || "",
    telefone: lead.telefone || "",
    celular: lead.celular || "",
    criadoEm: lead.dataNovoLead || lead.createdAt || lead.entradaEm || null,
    entradaEm: lead.entradaEm || lead.dataQualificado || lead.createdAt || null,
    status: lead.status || "—",
    especialidade: lead.tipoLead || "",
    uf: lead.ufCrm || "",
    cidade: "",
    origem: lead.evento || lead.source || "",
    prioridade: "",
    importado: Boolean(lead.importado),
    consultor: lead.consultor || "",
    consultorId: lead.consultorId || "",
    gerencia: lead.gerencia || "",
    numeroRegistro: lead.numeroRegistro || "",
  };
}

/**
 * Lista leads conforme regra de negócio:
 * - admin: todos
 * - gerente: leads da mesma gerência (+ os próprios)
 * - consultor: apenas os seus
 */
export async function listLeadsForUser(user = {}) {
  const role = resolveViewerRole(user.perfil);
  const email = user.email || user.Email;
  let consultorRecord = null;

  if (email) {
    try {
      consultorRecord = await findConsultorByEmail(email);
    } catch (error) {
      console.warn("[LEADS] Lookup consultor na listagem:", error.message);
    }
  }

  const viewer = {
    id: consultorRecord?.id || user.id,
    email,
    nome:
      getConsultorDisplayName(consultorRecord) ||
      user.nome ||
      user.Nome ||
      user.name,
    gerencia: getConsultorGerencia(consultorRecord),
    perfil: user.perfil,
  };

  let leads = [];

  if (role === "admin") {
    leads = await scanAllLeads();
  } else if (role === "gerente") {
    const all = await scanAllLeads();
    leads = all.filter(
      (lead) =>
        leadMatchesConsultor(lead, viewer) ||
        leadMatchesGerencia(lead, viewer.gerencia),
    );
  } else {
    const keys = new Set(
      [viewer.id, viewer.nome].filter(Boolean).map((v) => String(v)),
    );
    const collected = new Map();

    for (const key of keys) {
      const rows = await queryLeadsByConsultorId(key);
      for (const row of rows) {
        if (row?.id) collected.set(row.id, row);
      }
    }

    if (collected.size === 0) {
      const all = await scanAllLeads();
      for (const row of all) {
        if (leadMatchesConsultor(row, viewer) && row?.id) {
          collected.set(row.id, row);
        }
      }
    }

    leads = [...collected.values()];
  }

  leads.sort((a, b) => {
    const da = new Date(a.entradaEm || a.dataNovoLead || a.createdAt || 0).getTime();
    const db = new Date(b.entradaEm || b.dataNovoLead || b.createdAt || 0).getTime();
    return db - da;
  });

  return {
    role,
    viewer: {
      id: viewer.id || null,
      email: viewer.email || null,
      nome: viewer.nome || null,
      gerencia: viewer.gerencia || null,
    },
    leads: leads.map(toLeadListItem),
  };
}
