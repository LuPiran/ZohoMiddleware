import { randomUUID } from "crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import {
  findConsultorByEmail,
  getConsultorDisplayName,
  getConsultorGerencia,
} from "./consultores.js";
import {
  applyOfferToLead,
  isBusinessHours,
  isSlaAccepted,
  isSlaOffered,
  offerLeadOnCreate,
  offeredStatusCondition,
  reofferLead,
  slaOfferMinutes,
} from "./slaOffers.js";
import { notifyLeadOffer } from "./emailService.js";
import {
  ZOHO_ATTEMPT_STATUS,
  ZOHO_LEAD_STATUS,
  canonicalizeLeadStatus,
  syncZohoLeadAccepted,
  syncZohoLeadAttemptNoReturn,
  syncZohoLeadAttemptTreated,
  syncZohoLeadSemInteresse,
} from "./zohoLeadSync.js";

// Mapa UF → Região (fallback quando Zoho não envia Dist_Regiao)
const UF_REGIAO = {
  SP: "SUDESTE", RJ: "SUDESTE", MG: "SUDESTE", ES: "SUDESTE",
  RS: "SUL", SC: "SUL", PR: "SUL",
  BA: "NORDESTE", PE: "NORDESTE", CE: "NORDESTE", MA: "NORDESTE",
  PB: "NORDESTE", RN: "NORDESTE", AL: "NORDESTE", SE: "NORDESTE", PI: "NORDESTE",
  AM: "NORTE", PA: "NORTE", AC: "NORTE", RO: "NORTE", RR: "NORTE", AP: "NORTE", TO: "NORTE",
  MT: "CENTRO-OESTE", MS: "CENTRO-OESTE", GO: "CENTRO-OESTE", DF: "CENTRO-OESTE",
};

function resolveRegiaoFromUF(uf) {
  if (!uf) return null;
  return UF_REGIAO[String(uf).trim().toUpperCase()] || null;
}

const ATTEMPT_ROUNDS = {
  1: {
    n: 1,
    label: "Primeira tentativa",
    date: "dataPrimeiraTentativa",
    desc: "descricaoPrimeiraTentativa",
    status: "statusPrimeiraTentativa",
  },
  2: {
    n: 2,
    label: "Segunda tentativa",
    date: "dataSegundaTentativa",
    desc: "descricaoSegundaTentativa",
    status: "statusSegundaTentativa",
  },
  3: {
    n: 3,
    label: "Terceira tentativa",
    date: "dataTerceiraTentativa",
    desc: "descricaoTerceiraTentativa",
    status: "statusTerceiraTentativa",
  },
};

function parseAttemptRound(round) {
  const n = Number(round);
  if (![1, 2, 3].includes(n)) {
    const err = new Error("Tentativa inválida. Use 1, 2 ou 3.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return n;
}

const ATTEMPT_WINDOW_MONTHS = 1;

function isLeadClosed(lead) {
  return (
    Boolean(lead?.dataSemInteresse) ||
    Boolean(lead?.dataConversao) ||
    normalizeText(lead?.status).includes("convert") ||
    normalizeText(lead?.status).includes("sem interesse")
  );
}

function isAttemptRoundDone(lead, round) {
  const meta = ATTEMPT_ROUNDS[round];
  return Boolean(lead?.[meta.date]);
}

function isAttemptTreated(lead, round) {
  return normalizeText(lead?.[ATTEMPT_ROUNDS[round].status]).includes("tratado");
}

function isAttemptNoReturn(lead, round) {
  return normalizeText(lead?.[ATTEMPT_ROUNDS[round].status]).includes("retorno");
}

function qualificationStartIso(lead) {
  return lead?.dataQualificado || lead?.slaCheckinAt || null;
}

function addCalendarMonths(iso, months) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

function attemptDeadlineAt(lead, round) {
  const start = qualificationStartIso(lead);
  if (!start || !round) return null;
  return addCalendarMonths(start, round * ATTEMPT_WINDOW_MONTHS);
}

function daysUntil(iso) {
  if (!iso) return null;
  const target = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function isAttemptWindowOpen(lead, round) {
  const deadline = attemptDeadlineAt(lead, round);
  if (!deadline) return false;
  return Date.now() <= deadline.getTime();
}

/**
 * Próxima tentativa em aberto.
 * A 2ª/3ª só existem se a anterior venceu o prazo (Sem Retorno).
 * Tentativa tratada no prazo encerra a cadeia.
 */
function currentOpenAttemptRound(lead) {
  if (isLeadClosed(lead) || !isSlaAccepted(lead)) return null;
  for (const round of [1, 2, 3]) {
    if (isAttemptRoundDone(lead, round)) {
      if (isAttemptTreated(lead, round)) return null;
      continue;
    }
    if (round === 1) return 1;
    if (isAttemptNoReturn(lead, round - 1)) return round;
    return null;
  }
  return null;
}

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

const MIN_OBSERVACAO = 10;

function requireObservacao(observacao) {
  const note = asString(observacao);
  if (!note) {
    const err = new Error(
      "Para enviar uma tentativa ou lead sem interesse, adicione uma observação",
    );
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (note.length < MIN_OBSERVACAO) {
    const err = new Error(
      "Observação da tentativa deve ter pelo menos 10 caracteres",
    );
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return note;
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

  const rua = asString(
    pick(source, [
      "rua",
      "Rua",
      "logradouro",
      "Logradouro",
      "street",
      "Street",
      "endereco",
      "Endereco",
      "Endereço",
      "Mailing_Street",
    ]),
  );
  const numero = asString(
    pick(source, ["numero", "Número", "Numero", "number", "Number", "nro", "Nro"]),
  );
  const complemento = asString(
    pick(source, [
      "complemento",
      "Complemento",
      "complement",
      "Complement",
      "Mailing_Street_2",
    ]),
  );
  const bairro = asString(
    pick(source, ["bairro", "Bairro", "neighborhood", "Neighborhood", "district"]),
  );
  const cidade = asString(
    pick(source, [
      "cidade",
      "Cidade",
      "city",
      "City",
      "Mailing_City",
      "municipio",
      "Municipio",
    ]),
  );
  const estado = asString(
    pick(source, [
      "estado",
      "Estado",
      "state",
      "State",
      "ufEndereco",
      "UF_Endereco",
      "Mailing_State",
      "uf",
      "UF",
    ]),
  );
  const cep = asString(
    pick(source, [
      "cep",
      "CEP",
      "Cep",
      "zip",
      "Zip",
      "zipCode",
      "Zip_Code",
      "Mailing_Zip",
      "codigoPostal",
    ]),
  );

  const regiaoRaw = asString(
    pick(source, ["regiao", "Regiao", "Dist_Regiao", "dist_regiao", "region"]),
  );
  const regiao =
    (regiaoRaw ? String(regiaoRaw).trim().toUpperCase() : null) ||
    resolveRegiaoFromUF(ufCrm || estado) ||
    null;

  const status = canonicalizeLeadStatus(
    asString(pick(source, ["status", "Status", "Stage"])),
    ZOHO_LEAD_STATUS.NOVO,
  );
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
    regiao,
    tipoLead,
    gerencia,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado: estado || ufCrm,
    cep,
    status,
    entradaEm,
    dataNovoLead: dataNovoLead || now,
    dataConversao: null,
    dataQualificado: dataQualificado || null,
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
    slaDeadline: undefined,
    slaStatus: isBusinessHours() ? undefined : "aguardando_horario",
    slaCheckinAt: undefined,
    slaRecusados: [],
    slaOfertaRound: 0,
    createdAt: now,
    updatedAt: now,
    source: "zoho",
    historico: [
      {
        id: randomUUID(),
        at: now,
        action: "lead_criado",
        label: "Lead recebido do Zoho",
        detail: "Lead qualificado e enviado ao portal",
        by: "zoho",
      },
    ],
  };
}

export function validateCreateLeadInput(lead) {
  const errors = [];

  if (!lead.idZoho) errors.push("idZoho é obrigatório");
  if (!lead.nome) errors.push("Nome é obrigatório");
  if (!lead.consultorId && !lead.consultor && !lead.emailConsultor && !lead.regiao) {
    errors.push("consultor, emailConsultor ou regiao (round-robin) é obrigatório");
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
async function offerLeadWithoutRegion(lead) {
  if (!lead.consultorId) return lead;

  try {
    const record = lead.emailConsultor
      ? await findConsultorByEmail(lead.emailConsultor)
      : null;
    if (!record?.id) {
      lead.slaStatus = isBusinessHours() ? "ofertado" : "aguardando_horario";
      if (isBusinessHours()) {
        lead.slaDeadline = new Date(
          Date.now() + slaOfferMinutes() * 60 * 1000,
        ).toISOString();
        lead.consultorIdOferta = String(lead.consultorId);
      }
      return lead;
    }

    if (!isBusinessHours()) {
      lead.consultorId = String(record.id);
      lead.consultor = getConsultorDisplayName(record) || lead.consultor;
      lead.emailConsultor = record.email || lead.emailConsultor;
      lead.gerencia = lead.gerencia || getConsultorGerencia(record);
      lead.slaStatus = "aguardando_horario";
      lead.slaDeadline = null;
      return lead;
    }

    applyOfferToLead(lead, record, {
      reason: "Oferecido pelo e-mail do consultor (lead sem região).",
    });
    void notifyLeadOffer(lead, record);
  } catch (error) {
    console.warn("[SLA] Oferta por e-mail falhou:", error.message);
  }

  return lead;
}

/**
 * Cria lead médico no DynamoDB a partir do payload Zoho.
 * Idempotente por idZoho (GSI gsi_zoho). id da tabela = UUID próprio.
 *
 * Com região: entra na fila SLA (menor carteira). O consultor do Zoho não vira dono.
 * Sem região: fallback por e-mail do consultor.
 */
export async function createLeadFromZoho(payload) {
  let lead = mapZohoPayloadToLead(payload);

  if (lead.regiao) {
    lead.consultorId = undefined;
    if (isBusinessHours()) {
      lead = await offerLeadOnCreate(lead);
    } else {
      lead.slaStatus = "aguardando_horario";
      lead.slaDeadline = null;
    }
  } else {
    lead = await enrichLeadWithPortalConsultor(lead, payload);
    lead = await offerLeadWithoutRegion(lead);
  }

  const errors = validateCreateLeadInput(lead);
  if (errors.length) {
    const err = new Error(errors.join("; "));
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
    uf: lead.estado || lead.ufCrm || "",
    origem: lead.evento || lead.source || "",
    prioridade: "",
    importado: Boolean(lead.importado),
    consultor: lead.consultor || "",
    consultorId: lead.consultorId || "",
    gerencia: lead.gerencia || "",
    regiao: lead.regiao || "",
    numeroRegistro: lead.numeroRegistro || "",
    rua: lead.rua || "",
    numero: lead.numero || "",
    complemento: lead.complemento || "",
    bairro: lead.bairro || "",
    cidade: lead.cidade || "",
    estado: lead.estado || lead.ufCrm || "",
    cep: lead.cep || "",
    slaDeadline: lead.slaDeadline || null,
    slaStatus: lead.slaStatus || null,
    slaCheckinAt: lead.slaCheckinAt || null,
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

    leads = [...collected.values()].filter(
      (lead) => !lead.slaStatus || isSlaAccepted(lead),
    );
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

function viewerOwnsOffer(lead, viewer) {
  return leadMatchesConsultor(lead, viewer);
}

/**
 * Ofertas SLA ainda pendentes para o consultor logado (não entram na carteira).
 */
export async function listPendingOffersForUser(user = {}) {
  const { role, viewer } = await resolveViewerContext(user);
  if (!viewer.id && !viewer.email) {
    return {
      role,
      viewer: {
        id: viewer.id || null,
        email: viewer.email || null,
        nome: viewer.nome || null,
        gerencia: viewer.gerencia || null,
      },
      offers: [],
    };
  }

  const keys = new Set(
    [viewer.id, viewer.nome].filter(Boolean).map((v) => String(v)),
  );
  const collected = new Map();

  for (const key of keys) {
    const rows = await queryLeadsByConsultorId(key);
    for (const row of rows) {
      if (row?.id && isSlaOffered(row) && viewerOwnsOffer(row, viewer)) {
        collected.set(row.id, row);
      }
    }
  }

  if (collected.size === 0) {
    const all = await scanAllLeads();
    for (const row of all) {
      if (row?.id && isSlaOffered(row) && viewerOwnsOffer(row, viewer)) {
        collected.set(row.id, row);
      }
    }
  }

  const offers = [...collected.values()].sort((a, b) => {
    const da = new Date(a.slaDeadline || 0).getTime();
    const db = new Date(b.slaDeadline || 0).getTime();
    return da - db;
  });

  return {
    role,
    viewer: {
      id: viewer.id || null,
      email: viewer.email || null,
      nome: viewer.nome || null,
      gerencia: viewer.gerencia || null,
    },
    offers: offers.map(toLeadListItem),
  };
}

async function resolveViewerContext(user = {}) {
  const role = resolveViewerRole(user.perfil);
  const email = user.email || user.Email;
  let consultorRecord = null;

  if (email) {
    try {
      consultorRecord = await findConsultorByEmail(email);
    } catch (error) {
      console.warn("[LEADS] Lookup consultor:", error.message);
    }
  }

  return {
    role,
    viewer: {
      id: consultorRecord?.id || user.id,
      email,
      nome:
        getConsultorDisplayName(consultorRecord) ||
        user.nome ||
        user.Nome ||
        user.name,
      gerencia: getConsultorGerencia(consultorRecord),
      perfil: user.perfil,
    },
  };
}

function userCanAccessLead(lead, role, viewer) {
  if (role === "admin") return true;
  if (role === "gerente") {
    return (
      leadMatchesConsultor(lead, viewer) ||
      leadMatchesGerencia(lead, viewer.gerencia)
    );
  }
  return leadMatchesConsultor(lead, viewer);
}

function daysBetween(fromIso, toDate = new Date()) {
  if (!fromIso) return null;
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return null;
  const ms = toDate.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function appendHistorico(lead, entry) {
  const historico = Array.isArray(lead.historico) ? [...lead.historico] : [];
  historico.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    ...entry,
  });
  return historico.slice(0, 200);
}

export function buildLeadTimeline(lead) {
  const lost =
    Boolean(lead.dataSemInteresse) ||
    normalizeText(lead.status).includes("sem interesse");
  const converted = Boolean(
    lead.dataConversao || normalizeText(lead.status).includes("convert"),
  );
  const treatedRound = [1, 2, 3].find((round) => isAttemptTreated(lead, round)) || null;
  const interesseDate =
    lead.dataEmAquecimento ||
    lead.dataEmContato ||
    (treatedRound ? lead[ATTEMPT_ROUNDS[treatedRound].date] : null) ||
    (normalizeText(lead.status).includes("interesse") &&
    !normalizeText(lead.status).includes("sem")
      ? lead.updatedAt
      : null);

  const stages = [
    {
      id: "criado",
      label: "Criado",
      date: lead.dataNovoLead || lead.createdAt || null,
    },
    {
      id: "qualificado",
      label: "Qualificado",
      date: lead.dataQualificado || lead.slaCheckinAt || null,
    },
  ];

  const attemptLabels = {
    1: { id: "tentativa1", label: "Primeira Tentativa", date: lead.dataPrimeiraTentativa },
    2: { id: "tentativa2", label: "Segunda Tentativa", date: lead.dataSegundaTentativa },
    3: { id: "tentativa3", label: "Terceira Tentativa", date: lead.dataTerceiraTentativa },
  };

  const qualified = Boolean(
    lead.dataQualificado || lead.slaCheckinAt || isSlaAccepted(lead),
  );

  if (qualified || treatedRound || lost || isAttemptRoundDone(lead, 1)) {
    const maxAttemptShown = treatedRound
      ? treatedRound
      : isAttemptNoReturn(lead, 3) || isAttemptRoundDone(lead, 3)
        ? 3
        : isAttemptNoReturn(lead, 2) || isAttemptRoundDone(lead, 2)
          ? 3
          : isAttemptNoReturn(lead, 1) || isAttemptRoundDone(lead, 1)
            ? 2
            : 1;

    for (let round = 1; round <= maxAttemptShown; round += 1) {
      if (treatedRound && round > treatedRound) break;
      stages.push(attemptLabels[round]);
    }

    if (lost) {
      stages.push({
        id: "semInteresse",
        label: "Lead Sem Interesse",
        date: lead.dataSemInteresse || lead.updatedAt || null,
      });
    } else if (treatedRound || interesseDate) {
      stages.push({
        id: "interesse",
        label: "Lead Com Interesse",
        date: interesseDate,
      });
      stages.push({
        id: "convertido",
        label: "Convertido",
        date: converted ? lead.dataConversao || lead.updatedAt : null,
      });
    } else if (!isAttemptNoReturn(lead, 3)) {
      stages.push({
        id: "interesse",
        label: "Lead Com Interesse",
        date: null,
      });
      stages.push({
        id: "convertido",
        label: "Convertido",
        date: null,
      });
    }
  }

  if (!stages[0].date && lead.createdAt) {
    stages[0].date = lead.createdAt;
  }

  let currentIndex = -1;
  for (let i = 0; i < stages.length; i += 1) {
    if (stages[i].date) currentIndex = i;
  }

  return {
    lost,
    lostAt: lead.dataSemInteresse || null,
    stages: stages.map((stage, index) => {
      let state = "pending";
      if (stage.date) state = "done";
      else if (lost) state = index < stages.length - 1 ? "pending" : "done";
      else if (index === currentIndex + 1) state = "current";
      else if (currentIndex < 0 && index === 0) state = "current";
      return { ...stage, state };
    }),
  };
}

export function toLeadDetail(lead) {
  const qualificadoEm = qualificationStartIso(lead);
  const hasFirstAttempt = Boolean(lead.dataPrimeiraTentativa);
  const hasSecondAttempt = Boolean(lead.dataSegundaTentativa);
  const hasThirdAttempt = Boolean(lead.dataTerceiraTentativa);
  const hasSemInteresse = Boolean(lead.dataSemInteresse);
  const converted = Boolean(
    lead.dataConversao || normalizeText(lead.status).includes("convert"),
  );
  const currentRound = currentOpenAttemptRound(lead);
  const deadlineAt = currentRound ? attemptDeadlineAt(lead, currentRound) : null;
  const daysRemaining = daysUntil(deadlineAt);
  const expired = Boolean(
    currentRound && deadlineAt && Date.now() > deadlineAt.getTime(),
  );
  const treatedOnTime =
    !currentRound &&
    (isAttemptTreated(lead, 1) ||
      isAttemptTreated(lead, 2) ||
      isAttemptTreated(lead, 3));

  const windowLabels = {
    1: "1ª tentativa — 1 mês a partir da qualificação",
    2: "2ª tentativa — aberta porque a 1ª não foi feita no prazo",
    3: "3ª tentativa — aberta porque a 2ª não foi feita no prazo",
  };

  return {
    ...toLeadListItem(lead),
    evento: lead.evento || "",
    tipoLead: lead.tipoLead || "",
    ufCrm: lead.ufCrm || "",
    dataQualificado: lead.dataQualificado || null,
    dataConversao: lead.dataConversao || null,
    dataSemInteresse: lead.dataSemInteresse || null,
    dataSemContato: lead.dataSemContato || null,
    dataEmContato: lead.dataEmContato || null,
    dataEmAquecimento: lead.dataEmAquecimento || null,
    descricaoPrimeiraTentativa: lead.descricaoPrimeiraTentativa || "",
    dataPrimeiraTentativa: lead.dataPrimeiraTentativa || null,
    statusPrimeiraTentativa: lead.statusPrimeiraTentativa || null,
    descricaoSegundaTentativa: lead.descricaoSegundaTentativa || "",
    dataSegundaTentativa: lead.dataSegundaTentativa || null,
    statusSegundaTentativa: lead.statusSegundaTentativa || null,
    descricaoTerceiraTentativa: lead.descricaoTerceiraTentativa || "",
    dataTerceiraTentativa: lead.dataTerceiraTentativa || null,
    statusTerceiraTentativa: lead.statusTerceiraTentativa || null,
    createdAt: lead.createdAt || null,
    updatedAt: lead.updatedAt || null,
    historico: Array.isArray(lead.historico) ? lead.historico : [],
    timeline: buildLeadTimeline(lead),
    attempt: {
      daysSinceQualification: daysBetween(qualificadoEm),
      daysRemaining,
      deadlineAt: deadlineAt ? deadlineAt.toISOString() : null,
      expired,
      treatedOnTime,
      currentRound,
      canRegisterAttempt: currentRound !== null && !expired,
      canRegisterFirstAttempt: currentRound === 1 && !expired,
      hasFirstAttempt,
      hasSecondAttempt,
      hasThirdAttempt,
      hasSemInteresse,
      converted,
      windowLabel: expired
        ? "Prazo de 1 mês encerrado. Sem retorno será aplicado automaticamente."
        : treatedOnTime
          ? "Tentativa registrada no prazo. A próxima não será aberta."
          : windowLabels[currentRound] || "Tentativas de contato",
    },
  };
}

export async function getLeadForUser(leadId, user = {}) {
  const id = String(leadId || "").trim();
  if (!id) {
    const err = new Error("ID do lead é obrigatório");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const { role, viewer } = await resolveViewerContext(user);
  const result = await dynamoDocClient.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { id },
    }),
  );

  if (!result.Item) {
    const err = new Error("Lead não encontrado");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!userCanAccessLead(result.Item, role, viewer)) {
    const err = new Error("Você não tem permissão para ver este lead");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  return {
    role,
    viewer: {
      id: viewer.id || null,
      email: viewer.email || null,
      nome: viewer.nome || null,
      gerencia: viewer.gerencia || null,
    },
    lead: toLeadDetail(result.Item),
  };
}

async function updateLeadItem(leadId, updates, condition) {
  const names = { ...(condition?.names || {}) };
  const values = { ...(condition?.values || {}) };
  const parts = [];
  let i = 0;

  for (const [key, value] of Object.entries(updates)) {
    const nk = `#k${i}`;
    const vk = `:v${i}`;
    names[nk] = key;
    values[vk] = value;
    parts.push(`${nk} = ${vk}`);
    i += 1;
  }

  const exists = "attribute_exists(id)";
  const conditionExpression = condition?.expression
    ? `${exists} AND ${condition.expression}`
    : exists;

  try {
    const result = await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id: leadId },
        UpdateExpression: `SET ${parts.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: conditionExpression,
        ReturnValues: "ALL_NEW",
      }),
    );
    return result.Attributes;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      const err = new Error("Esta oferta não está mais disponível.");
      err.status = 409;
      err.code = "OFFER_GONE";
      throw err;
    }
    throw error;
  }
}

/**
 * Registra tentativa de contato (1, 2 ou 3) como "Tratado Pelo Consultor".
 */
export async function registerContactAttempt(leadId, user, round, { observacao } = {}) {
  const n = parseAttemptRound(round);
  const meta = ATTEMPT_ROUNDS[n];
  const detail = await getLeadForUser(leadId, user);
  const lead = detail.lead;

  if (lead.attempt.converted || lead.attempt.hasSemInteresse) {
    const err = new Error("Lead já encerrado (sem interesse / convertido).");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (lead.attempt.currentRound !== n) {
    const err = new Error(
      n === 1
        ? "Primeira tentativa já registrada ou lead ainda não aceito."
        : `${meta.label} não está disponível neste momento.`,
    );
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (!isAttemptWindowOpen(lead, n)) {
    const err = new Error(
      "O prazo de 1 mês desta tentativa já encerrou. Sem retorno será aplicado automaticamente.",
    );
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const note = requireObservacao(observacao);

  const now = new Date().toISOString();
  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  const historico = appendHistorico(raw, {
    action: n === 1 ? "primeira_tentativa" : n === 2 ? "segunda_tentativa" : "terceira_tentativa",
    label: `${meta.label} — tratado pelo consultor`,
    detail: note,
    by: user.email || user.id || "usuario",
  });

  const updates = {
    [meta.desc]: note,
    [meta.date]: now,
    [meta.status]: ZOHO_ATTEMPT_STATUS.TRATADO,
    status: ZOHO_LEAD_STATUS.COM_INTERESSE,
    dataEmContato: raw.dataEmContato || now,
    dataEmAquecimento: raw.dataEmAquecimento || now,
    updatedAt: now,
    historico,
  };

  const updated = await updateLeadItem(leadId, updates);
  syncZohoLeadAttemptTreated(updated, n, { observacao: note, at: now });
  return toLeadDetail(updated);
}

export async function registerFirstAttempt(leadId, user, payload = {}) {
  return registerContactAttempt(leadId, user, 1, payload);
}

/**
 * Sem retorno é automático ao vencer o prazo de 1 mês.
 * Consultores não disparam esta ação.
 */
export async function markAttemptSemRetorno() {
  const err = new Error(
    "Sem retorno é aplicado automaticamente quando o prazo de 1 mês da tentativa vence.",
  );
  err.status = 400;
  err.code = "VALIDATION_ERROR";
  throw err;
}

async function applyAttemptTimeout(raw, round) {
  const n = parseAttemptRound(round);
  const meta = ATTEMPT_ROUNDS[n];
  if (isLeadClosed(raw) || isAttemptRoundDone(raw, n)) return null;
  if (currentOpenAttemptRound(raw) !== n) return null;
  if (isAttemptWindowOpen(raw, n)) return null;

  const now = new Date().toISOString();
  const historico = appendHistorico(raw, {
    action: "tentativa_sem_retorno",
    label: `${meta.label} — sem retorno`,
    detail: "Prazo de 1 mês encerrado sem registro da tentativa.",
    by: "sistema",
  });

  const updates = {
    [meta.date]: now,
    [meta.status]: ZOHO_ATTEMPT_STATUS.SEM_RETORNO,
    status: ZOHO_LEAD_STATUS.SEM_CONTATO,
    dataSemContato: now,
    updatedAt: now,
    historico,
  };
  if (n === 1) updates.adicionarSegundaTentativa = true;
  if (n === 2) updates.adicionarTerceiraTentativa = true;

  const updated = await updateLeadItem(raw.id, updates);
  syncZohoLeadAttemptNoReturn(updated, n, { at: now });
  return updated;
}

/**
 * Varre leads aceitos cujo prazo da tentativa aberta já venceu.
 */
export async function expireOverdueAttempts() {
  const items = [];
  for (const status of ["aceito", "confirmado"]) {
    let lastKey;
    do {
      const page = await dynamoDocClient.send(
        new ScanCommand({
          TableName: TABLE(),
          FilterExpression: "#ss = :status",
          ExpressionAttributeNames: { "#ss": "slaStatus" },
          ExpressionAttributeValues: { ":status": status },
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...(page.Items || []));
      lastKey = page.LastEvaluatedKey;
    } while (lastKey);
  }

  let expired = 0;
  for (const lead of items) {
    const round = currentOpenAttemptRound(lead);
    if (!round) continue;
    if (isAttemptWindowOpen(lead, round)) continue;
    try {
      const updated = await applyAttemptTimeout(lead, round);
      if (updated) expired += 1;
    } catch (error) {
      console.warn(
        `[TENTATIVAS] Falha ao expirar lead ${lead.id}:`,
        error.message,
      );
    }
  }
  return expired;
}

/**
 * Marca lead como sem interesse.
 * Se houver tentativa aberta (1, 2 ou 3), grava também status/data/observação dela.
 */
export async function markLeadSemInteresse(leadId, user, { observacao } = {}) {
  const detail = await getLeadForUser(leadId, user);
  const lead = detail.lead;

  if (lead.attempt.hasSemInteresse || lead.attempt.converted) {
    const err = new Error("Lead já encerrado.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (lead.attempt.treatedOnTime) {
    const err = new Error(
      "Tentativa já registrada no prazo. O lead está com interesse.",
    );
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const now = new Date().toISOString();
  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  const round = currentOpenAttemptRound(raw);
  const meta = round ? ATTEMPT_ROUNDS[round] : null;
  const note = requireObservacao(observacao);

  const historico = appendHistorico(raw, {
    action: "sem_interesse",
    label: meta
      ? `Lead sem interesse — ${meta.label.toLowerCase()}`
      : "Lead sem interesse",
    detail: note,
    by: user.email || user.id || "usuario",
  });

  const updates = {
    status: ZOHO_LEAD_STATUS.SEM_INTERESSE,
    dataSemInteresse: now,
    updatedAt: now,
    historico,
  };

  if (meta) {
    updates[meta.desc] = note;
    updates[meta.date] = now;
    updates[meta.status] = ZOHO_ATTEMPT_STATUS.TRATADO;
  }

  const updated = await updateLeadItem(leadId, updates);
  syncZohoLeadSemInteresse(updated, {
    at: now,
    observacao: note,
    round,
  });
  return toLeadDetail(updated);
}

/**
 * Consultor aceita a oferta (vira dono). Alias do check-in antigo.
 */
export async function checkinLead(leadId, user) {
  const { role, viewer, lead } = await getLeadForUser(leadId, user);

  if (isSlaAccepted(lead)) {
    const err = new Error("Este lead já foi aceito.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (
    lead.slaStatus === "expirado" ||
    lead.slaStatus === "reatribuido" ||
    lead.slaStatus === "expirado_ciclo"
  ) {
    const err = new Error("Esta oferta expirou e o lead já foi redistribuído.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (!isSlaOffered(lead)) {
    const err = new Error("Este lead não está aguardando aceite.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (role !== "admin" && !viewerOwnsOffer(lead, viewer)) {
    const err = new Error("Esta oferta não é sua.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  const now = new Date().toISOString();

  if (lead.slaDeadline && new Date(lead.slaDeadline) < new Date()) {
    const raw = (
      await dynamoDocClient.send(
        new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
      )
    ).Item;

    if (raw && isSlaOffered(raw)) {
      await reofferLead(raw, {
        reason: "Prazo de aceite expirado no momento da confirmação.",
        by: user.email || user.id || "usuario",
      });
    }

    const err = new Error("Prazo de aceite expirado. O lead foi oferecido ao próximo consultor.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  if (!raw || !isSlaOffered(raw)) {
    const err = new Error("Esta oferta não está mais disponível.");
    err.status = 409;
    err.code = "OFFER_GONE";
    throw err;
  }

  const historico = appendHistorico(raw, {
    action: "sla_aceito",
    label: "Lead aceito",
    detail: "Consultor aceitou a oferta e passou a ser o dono do lead.",
    by: user.email || user.id || "usuario",
  });

  const offered = offeredStatusCondition();
  const updated = await updateLeadItem(
    leadId,
    {
      slaStatus: "aceito",
      slaCheckinAt: now,
      status: ZOHO_LEAD_STATUS.QUALIFICACAO,
      dataQualificado: now,
      updatedAt: now,
      historico,
    },
    {
      expression: `${offered.expression} AND #cidCond = :cidCond`,
      names: { ...offered.names, "#cidCond": "consultorId" },
      values: { ...offered.values, ":cidCond": String(raw.consultorId) },
    },
  );

  syncZohoLeadAccepted(updated);
  return toLeadDetail(updated);
}

/**
 * Consultor recusa a oferta — o lead segue para o próximo da região.
 */
export async function recusarLead(leadId, user) {
  const { role, viewer, lead } = await getLeadForUser(leadId, user);

  if (!isSlaOffered(lead)) {
    const err = new Error("Este lead não está aguardando aceite.");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (role !== "admin" && !viewerOwnsOffer(lead, viewer)) {
    const err = new Error("Esta oferta não é sua.");
    err.status = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  if (!raw || !isSlaOffered(raw)) {
    const err = new Error("Esta oferta não está mais disponível.");
    err.status = 409;
    err.code = "OFFER_GONE";
    throw err;
  }

  const updated = await reofferLead(raw, {
    reason: `Consultor recusou a oferta (${user.email || user.id || "usuario"}).`,
    by: user.email || user.id || "usuario",
  });

  if (!updated) {
    const err = new Error("Esta oferta não está mais disponível.");
    err.status = 409;
    err.code = "OFFER_GONE";
    throw err;
  }

  return toLeadDetail(updated);
}

/**
 * Zoho informa que o lead foi convertido.
 */
export async function markLeadConvertedFromZoho(payload) {
  const source =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const idZoho = asString(
    pick(source, ["idZoho", "zohoId", "id", "id_do_zoho", "Zoho_ID"], "id"),
  );

  if (!idZoho) {
    const err = new Error("idZoho é obrigatório");
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const existing = await findLeadByZohoId(idZoho);
  if (!existing) {
    const err = new Error("Lead não encontrado para este idZoho");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const already =
    Boolean(existing.dataConversao) ||
    normalizeText(existing.status).includes("convert");
  if (already) {
    return {
      updated: false,
      alreadyConverted: true,
      lead: existing,
    };
  }

  const now = new Date().toISOString();
  const convertedAt =
    asIsoDate(
      pick(source, [
        "dataConversao",
        "Data_Conversao",
        "convertedAt",
        "Converted_Date",
      ]),
    ) || now;

  const historico = appendHistorico(existing, {
    action: "lead_convertido",
    label: "Lead convertido",
    detail: "Status recebido do Zoho CRM: Lead Convertido.",
    by: "zoho",
  });

  const updated = await updateLeadItem(existing.id, {
    status: ZOHO_LEAD_STATUS.CONVERTIDO,
    dataConversao: convertedAt,
    updatedAt: now,
    historico,
  });

  return {
    updated: true,
    alreadyConverted: false,
    lead: updated,
  };
}
