import { randomUUID } from "crypto";
import {
  notifyLeadAceito,
  notifyLeadConvertido,
  notifyLeadSemTratativa,
  notifyStatusChange,
  notifyTentativa,
} from "./emailService.js";
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
  decrementCargaAceita,
  findConsultorByEmail,
  findConsultoresByGerencia,
  getConsultorDisplayName,
  getConsultorGerencia,
  incrementCargaAceita,
} from "./consultores.js";
import {
  isSlaAccepted,
  isSlaOffered,
  offerLeadOnCreate,
  offeredStatusCondition,
  rejectLeadOffer,
} from "./slaOffers.js";
import {
  ZOHO_LEAD_STATUS,
  canonicalizeLeadStatus,
  syncZohoLeadAccepted,
  syncZohoLeadAttemptNoReturn,
  syncZohoLeadAttemptTreated,
  syncZohoLeadDistribuicao,
  syncZohoLeadFourthAttemptRequested,
  syncZohoLeadSemContato,
  syncZohoLeadSemInteresse,
  syncZohoLeadProtocolo,
} from "./zohoLeadSync.js";
import {
  ATTEMPT_ROUNDS,
  buildAttemptView,
  buildLeadTimeline,
  currentOpenAttemptRound,
  isAttemptWindowOpen,
  parseAttemptRound,
  qualificationStartIso,
  requestFourthAttemptUpdates,
  semContatoUpdates,
  semInteresseUpdates,
  timeoutAttemptUpdates,
  treatedAttemptUpdates,
} from "../domain/leadAttempts.js";
import {
  generateProtocolo,
  isValidProtocolo,
  normalizeProtocolo,
} from "../domain/leadProtocol.js";
import { persistLeadEvidencias } from "./leadEvidencias.js";
import { downloadWorkDriveFile, workDrivePreviewUrl } from "./workdrive.js";
import { buildDynamoUpdateParts } from "../utils/dynamoUpdate.js";
import { geocodeAddress } from "./geocoding.js";

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

function extractZohoStatusUpdateFields(source) {
  const rawStatus = pick(source, ["status", "Status", "Stage"]);
  const statusProvided = rawStatus !== undefined && rawStatus !== null && String(rawStatus).trim() !== "";

  const status = statusProvided
    ? canonicalizeLeadStatus(asString(rawStatus), ZOHO_LEAD_STATUS.NOVO)
    : undefined;

  const rawDataConversao = pick(source, [
    "dataConversao",
    "Data_Conversao",
    "convertedAt",
    "Converted_Date",
  ]);
  const dataConversaoProvided =
    rawDataConversao !== undefined &&
    rawDataConversao !== null &&
    String(rawDataConversao).trim() !== "";

  const dataConversao = dataConversaoProvided ? asIsoDate(rawDataConversao) : undefined;

  return {
    statusProvided,
    status,
    dataConversaoProvided,
    dataConversao,
  };
}

/**
 * Mapeia o payload do Zoho para o item DynamoDB (portal_leads_medicos).
 *
 * Chaves alinhadas aos GSIs:
 * - gsi_zoho → idZoho
 * - gsi_consultor → consultorId (PK) + entradaEm (SK)
 * - gsi_sla → slaStatus (PK) + slaDeadline (SK)
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

  const protocolo = normalizeProtocolo(
    pick(source, [
      "protocolo",
      "Protocolo",
      "Protocolo_Portal",
      "protocoloPortal",
      "protocolo_portal",
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
    adicionarQuartaTentativa: false,
    dataSolicitacaoQuartaTentativa: null,
    motivoQuartaTentativa: null,
    descricaoQuartaTentativa: null,
    dataQuartaTentativa: null,
    statusQuartaTentativa: null,
    dataLeadRejeitado: null,
    dataLeadSemTratativa: null,
    slaDeadline: undefined,
    slaStatus: undefined,
    slaCheckinAt: undefined,
    slaRecusados: [],
    slaOfertaRound: 0,
    slaCicloRegional: regiao ? 1 : 0,
    slaFaseGestao: !regiao,
    protocolo: protocolo && isValidProtocolo(protocolo) ? protocolo : undefined,
    eventos: evento
      ? [
          {
            id: randomUUID(),
            nome: evento,
            idZoho: idZoho || undefined,
            dataEntrada: entradaEm || now,
            adicionadoEm: now,
          },
        ]
      : [],
    evidencias: [],
    workdriveFolderId: undefined,
    workdriveFolderName: undefined,
    createdAt: now,
    updatedAt: now,
    source: "zoho",
    historico: [
      {
        id: randomUUID(),
        at: now,
        action: "lead_criado",
        label: "Lead chegou ao portal",
        detail: regiao
          ? `Lead qualificado no Zoho CRM e enviado automaticamente para atribuição na região ${regiao}.`
          : "Lead qualificado no Zoho CRM. Sem região definida — encaminhado diretamente para a Gestão.",
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
    if (lead.slaStatus !== "expirado_ciclo" && lead.slaStatus !== "ofertado") {
      errors.push("consultor, emailConsultor ou regiao (round-robin) é obrigatório");
    }
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
  if (p.includes("gestao")) return "admin";
  if (p.includes("gerente") || p.includes("gerencia")) return "gerente";
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

async function findLeadByRegistroUf(numeroRegistro, ufCrm) {
  const reg = String(numeroRegistro || "").trim();
  const uf = String(ufCrm || "").trim().toUpperCase();
  if (!reg || !uf) return null;

  let lastKey;
  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "#nr = :nr AND #uf = :uf",
        ExpressionAttributeNames: { "#nr": "numeroRegistro", "#uf": "ufCrm" },
        ExpressionAttributeValues: { ":nr": reg, ":uf": uf },
        ExclusiveStartKey: lastKey,
      }),
    );
    if (page.Items?.length) return page.Items[0];
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return null;
}

async function findLeadByProtocolo(protocolo) {
  const code = normalizeProtocolo(protocolo);
  if (!code) return null;

  const indexName = ENV.DYNAMODB_LEADS_PROTOCOLO_INDEX || "gsi_protocolo";
  const attr = ENV.DYNAMODB_LEADS_PROTOCOLO_ATTR || "protocolo";

  try {
    const byGsi = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE(),
        IndexName: indexName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": attr },
        ExpressionAttributeValues: { ":pk": code },
        Limit: 1,
      }),
    );
    if (byGsi.Items?.length) return byGsi.Items[0];
    return null;
  } catch (error) {
    if (
      error.name !== "ValidationException" &&
      error.name !== "ResourceNotFoundException"
    ) {
      throw error;
    }
  }

  let lastKey;
  do {
    const page = await dynamoDocClient.send(
      new ScanCommand({
        TableName: TABLE(),
        FilterExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": attr },
        ExpressionAttributeValues: { ":pk": code },
        ExclusiveStartKey: lastKey,
        Limit: 1,
      }),
    );
    if (page.Items?.length) return page.Items[0];
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return null;
}

async function assignUniqueProtocolo(preferred) {
  const candidate = normalizeProtocolo(preferred);
  if (candidate && isValidProtocolo(candidate)) {
    const existing = await findLeadByProtocolo(candidate);
    if (!existing) return candidate;
  }

  for (let i = 0; i < 40; i += 1) {
    const generated = generateProtocolo();
    const existing = await findLeadByProtocolo(generated);
    if (!existing) return generated;
  }

  const err = new Error("Não foi possível gerar um protocolo único para o lead.");
  err.status = 503;
  err.code = "PROTOCOL_GENERATION_FAILED";
  throw err;
}

/**
 * Cria lead médico no DynamoDB a partir do payload Zoho.
 * Idempotente por idZoho (GSI gsi_zoho). id da tabela = UUID próprio.
 *
 * Com região: fila 24h (consultores, gerência por último).
 * Sem região: fila da Gestão.
 */
export async function createLeadFromZoho(payload) {
  let lead = mapZohoPayloadToLead(payload);
  lead.consultorId = undefined;

  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const zohoStatusUpdate = extractZohoStatusUpdateFields(source);
  const now = new Date().toISOString();

  const existing = await findLeadByZohoId(lead.idZoho);
  if (existing) {
    const updates = {};

    const statusIsConverted =
      zohoStatusUpdate.statusProvided &&
      zohoStatusUpdate.status === ZOHO_LEAD_STATUS.CONVERTIDO;

    if (statusIsConverted && zohoStatusUpdate.status !== existing.status) {
      updates.status = zohoStatusUpdate.status;
    } else if (zohoStatusUpdate.dataConversaoProvided) {
      // Se veio data de conversão, assume que o lead deve estar como convertido.
      if (ZOHO_LEAD_STATUS.CONVERTIDO !== existing.status) {
        updates.status = ZOHO_LEAD_STATUS.CONVERTIDO;
      }
    }

    if (zohoStatusUpdate.dataConversaoProvided) {
      if (zohoStatusUpdate.dataConversao && zohoStatusUpdate.dataConversao !== existing.dataConversao) {
        updates.dataConversao = zohoStatusUpdate.dataConversao;
      }
    } else if (statusIsConverted && !existing.dataConversao) {
      // Fallback para não deixar o campo vazio quando o Zoho informa conversão sem data.
      updates.dataConversao = now;
    }

    const hasAnyUpdate = Object.keys(updates).length > 0;
    if (!hasAnyUpdate) {
      return {
        created: false,
        alreadyExists: true,
        lead: existing,
      };
    }

    const newStatus = updates.status ?? existing.status;
    const newConvertedAt = updates.dataConversao ?? existing.dataConversao ?? null;

    const historico = appendHistorico(existing, {
      action: "status_zoho_atualizado",
      label: "Status sincronizado com o CRM",
      detail: `O Zoho CRM atualizou o status deste lead para: ${newStatus}.${newConvertedAt ? ` Data de conversão: ${newConvertedAt}.` : ""}`,
      by: "zoho",
    });

    const updated = await updateLeadItem(existing.id, {
      ...updates,
      updatedAt: now,
      historico,
    });

    return {
      created: false,
      alreadyExists: true,
      statusUpdated: true,
      lead: updated,
    };
  }

  const duplicateByRegistro = await findLeadByRegistroUf(lead.numeroRegistro, lead.ufCrm);
  if (duplicateByRegistro) {
    const novoEvento = {
      id: randomUUID(),
      nome: lead.evento || "Sem evento",
      idZoho: lead.idZoho,
      dataEntrada: lead.entradaEm || now,
      adicionadoEm: now,
    };

    const eventos = Array.isArray(duplicateByRegistro.eventos)
      ? [...duplicateByRegistro.eventos, novoEvento]
      : [novoEvento];

    const historicoEntry = {
      id: randomUUID(),
      at: now,
      action: "evento_agregado",
      label: `Novo evento: ${novoEvento.nome}`,
      detail: `Este médico já tem cadastro no portal (CRM ${duplicateByRegistro.numeroRegistro}/${duplicateByRegistro.ufCrm}). O evento "${novoEvento.nome}" foi adicionado ao histórico existente.`,
      by: "sistema",
    };

    const updates = {
      eventos,
      updatedAt: now,
    };

    const statusUpdatesToApply = {};
    const statusIsConverted =
      zohoStatusUpdate.statusProvided &&
      zohoStatusUpdate.status === ZOHO_LEAD_STATUS.CONVERTIDO;

    if (statusIsConverted && zohoStatusUpdate.status !== duplicateByRegistro.status) {
      statusUpdatesToApply.status = zohoStatusUpdate.status;
    } else if (zohoStatusUpdate.dataConversaoProvided) {
      if (ZOHO_LEAD_STATUS.CONVERTIDO !== duplicateByRegistro.status) {
        statusUpdatesToApply.status = ZOHO_LEAD_STATUS.CONVERTIDO;
      }
    }

    if (zohoStatusUpdate.dataConversaoProvided) {
      if (
        zohoStatusUpdate.dataConversao &&
        zohoStatusUpdate.dataConversao !== duplicateByRegistro.dataConversao
      ) {
        statusUpdatesToApply.dataConversao = zohoStatusUpdate.dataConversao;
      }
    } else if (statusIsConverted && !duplicateByRegistro.dataConversao) {
      statusUpdatesToApply.dataConversao = now;
    }

    const shouldAddStatusHistorico = Object.keys(statusUpdatesToApply).length > 0;
    if (shouldAddStatusHistorico) {
      updates.status = statusUpdatesToApply.status ?? duplicateByRegistro.status;
      updates.dataConversao =
        statusUpdatesToApply.dataConversao ?? duplicateByRegistro.dataConversao ?? null;
    }

    const historicoEntries = [historicoEntry];
    if (shouldAddStatusHistorico) {
      historicoEntries.push({
        action: "status_zoho_atualizado",
        label: "Status sincronizado com o CRM",
        detail: `O Zoho CRM atualizou o status deste lead para: ${updates.status}.${updates.dataConversao ? ` Data de conversão: ${updates.dataConversao}.` : ""}`,
        by: "zoho",
      });
    }

    updates.historico = appendHistorico(duplicateByRegistro, historicoEntries);

    const updated = await updateLeadItem(duplicateByRegistro.id, updates);

    return {
      created: false,
      alreadyExists: true,
      eventAdded: true,
      lead: updated,
    };
  }

  const protocolo = await assignUniqueProtocolo(lead.protocolo);
  lead.protocolo = protocolo;
  lead.historico = [
    {
      id: randomUUID(),
      at: new Date().toISOString(),
      action: "protocolo_gerado",
      label: `Protocolo de atendimento gerado`,
      detail: `Código de protocolo: ${protocolo}. Use este código para identificar e rastrear este atendimento.`,
      by: "sistema",
    },
    ...(lead.historico || []),
  ];

  // Geocodifica localização do lead para distribuição geográfica (fire-and-forget style:
  // falha não bloqueia a criação — apenas desativa o ranking por distância neste lead)
  if (!lead.lat && (lead.cidade || lead.cep)) {
    try {
      const coords = await geocodeAddress({
        cidade: lead.cidade,
        estado: lead.estado,
        cep: lead.cep,
      });
      if (coords) {
        lead.lat = coords.lat;
        lead.lng = coords.lng;
        // CEP válido (8 dígitos) foi o input usado na geocodificação → método
        // exato. Sem CEP, o Google geocodificou por cidade/estado → aproximado.
        const cepDigits = String(lead.cep || "").replace(/\D/g, "");
        lead.geoMetodo = cepDigits.length === 8 ? "cep" : "google";
      } else {
        lead.erroSync =
          "Não foi possível geocodificar o endereço do lead (CEP/cidade não encontrados pelo Google Maps).";
      }
    } catch (geoErr) {
      console.warn("[LEADS] Geocoding do lead falhou:", geoErr.message);
      lead.erroSync = `Erro na API de geocodificação: ${geoErr.message}`;
    }
  }
  // Reflete no Zoho (Dist_Geo_Metodo) como o lead foi localizado geograficamente.
  if (!lead.geoMetodo) {
    lead.geoMetodo = lead.regiao ? "uf" : null;
  }

  // offerLeadOnCreate pode complementar lead.erroSync (ex.: "sem destinatário
  // para a oferta") — ver slaOffers.js.
  lead = await offerLeadOnCreate(lead);
  if (!lead.erroSync) {
    lead.erroSync = "Sem erros — geocodificação e distribuição concluídas normalmente.";
  }

  const errors = validateCreateLeadInput(lead);
  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
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

  syncZohoLeadProtocolo(lead);
  syncZohoLeadDistribuicao(lead); // Dist_Consultor_Nome/Email/Id, Dist_Regiao, Dist_Fila, Dist_Status, Dist_Rodadas

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
    protocolo: lead.protocolo || null,
    eventos: Array.isArray(lead.eventos) ? lead.eventos : [],
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
    // Carrega a equipe do gerente via scan em memória
    const equipe = [];
    if (viewer.gerencia) {
      try {
        const membros = await findConsultoresByGerencia(viewer.gerencia);
        equipe.push(...membros);
      } catch (err) {
        console.warn("[LEADS] Lookup equipe do gerente:", err.message);
      }
    }

    const collected = new Map();

    // Query via GSI (gsi_consultor) por cada membro — evita full scan
    for (const membro of equipe) {
      const keys = new Set(
        [membro.id, membro.nome].filter(Boolean).map(String),
      );
      for (const key of keys) {
        const rows = await queryLeadsByConsultorId(key);
        for (const row of rows) {
          if (row?.id && (!row.slaStatus || isSlaAccepted(row))) {
            collected.set(row.id, row);
          }
        }
      }
    }

    // Fallback: scan para leads que tenham campo gerencia preenchido
    // (leads criados antes do novo rodízio, sem consultorId indexado)
    if (viewer.gerencia) {
      const all = await scanAllLeads();
      for (const row of all) {
        if (row?.id && leadMatchesGerencia(row, viewer.gerencia)) {
          collected.set(row.id, row);
        }
      }
    }

    leads = [...collected.values()];
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

  const gerencia = getConsultorGerencia(consultorRecord);

  // Para gerente: pré-carrega equipe para checar acesso ao lead individual
  let equipe = [];
  if (role === "gerente" && gerencia) {
    try {
      equipe = await findConsultoresByGerencia(gerencia);
    } catch (err) {
      console.warn("[LEADS] Lookup equipe do gerente:", err.message);
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
      gerencia,
      perfil: user.perfil,
      equipe, // lista de membros da equipe (apenas para gerente)
    },
  };
}

function userCanAccessLead(lead, role, viewer) {
  if (role === "admin") return true;
  if (role === "gerente") {
    if (leadMatchesConsultor(lead, viewer)) return true;
    if (leadMatchesGerencia(lead, viewer.gerencia)) return true;
    // Verifica se o consultor do lead é da equipe do gerente
    const equipe = Array.isArray(viewer.equipe) ? viewer.equipe : [];
    for (const membro of equipe) {
      if (lead.consultorId && String(lead.consultorId) === String(membro.id))
        return true;
      if (
        lead.emailConsultor &&
        membro.email &&
        normalizeEmail(lead.emailConsultor) === normalizeEmail(membro.email)
      )
        return true;
    }
    return false;
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

function normalizeHistoricoEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const action = entry.action || entry.tipo || "";
  const at = entry.at || entry.data || null;
  const by = entry.by || entry.autor || null;
  const label = entry.label || entry.descricao || action || "Ação no lead";
  const detail =
    entry.detail ||
    (entry.label && entry.descricao ? entry.descricao : undefined);
  return {
    id: entry.id,
    action,
    at,
    by,
    label,
    detail,
  };
}

function appendHistorico(lead, entries) {
  const historico = Array.isArray(lead.historico) ? [...lead.historico] : [];
  const list = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
  for (let i = 0; i < list.length; i += 1) {
    historico.unshift({
      id: randomUUID(),
      at: new Date(Date.now() + i).toISOString(),
      ...list[i],
    });
  }
  return historico.slice(0, 200);
}

function publicEvidencias(lead) {
  const items = Array.isArray(lead?.evidencias) ? lead.evidencias : [];
  return items.map((item) => {
    const previewUrl =
      item.previewUrl || workDrivePreviewUrl(item.workdriveFileId);
    return {
      id: item.id,
      n: item.n,
      acao: item.acao || null,
      round: item.round || null,
      fileName: item.fileName,
      mimeType: item.mimeType,
      url: previewUrl || item.url || null,
      previewUrl: previewUrl || null,
      zohoAttachmentId: item.zohoAttachmentId || null,
      uploadedAt: item.uploadedAt || null,
      uploadedBy: item.uploadedBy || null,
    };
  });
}

function evidenceHistoryDetail(note, uploaded) {
  const names = (uploaded || []).map((item) => item.fileName).join(", ");
  if (!note) return names ? `Evidências: ${names}` : "";
  return names ? `${note}\n\nEvidências: ${names}` : note;
}

export { buildLeadTimeline };

export function toLeadDetail(lead) {
  const qualificadoEm = qualificationStartIso(lead);
  const attempt = buildAttemptView(lead);

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
    adicionarQuartaTentativa: Boolean(lead.adicionarQuartaTentativa),
    dataSolicitacaoQuartaTentativa: lead.dataSolicitacaoQuartaTentativa || null,
    motivoQuartaTentativa: lead.motivoQuartaTentativa || "",
    descricaoQuartaTentativa: lead.descricaoQuartaTentativa || "",
    dataQuartaTentativa: lead.dataQuartaTentativa || null,
    statusQuartaTentativa: lead.statusQuartaTentativa || null,
    dataLeadRejeitado: lead.dataLeadRejeitado || null,
    dataLeadSemTratativa: lead.dataLeadSemTratativa || null,
    createdAt: lead.createdAt || null,
    updatedAt: lead.updatedAt || null,
    historico: (Array.isArray(lead.historico) ? lead.historico : [])
      .map(normalizeHistoricoEntry)
      .filter(Boolean),
    evidencias: publicEvidencias(lead),
    eventos: Array.isArray(lead.eventos) ? lead.eventos : [],
    workdriveFolderId: lead.workdriveFolderId || null,
    protocolo: lead.protocolo || null,
    lat: lead.lat ?? null,
    lng: lead.lng ?? null,
    geoMetodo: lead.geoMetodo ?? null,
    timeline: buildLeadTimeline(lead),
    attempt: {
      ...attempt,
      daysSinceQualification: daysBetween(qualificadoEm),
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

export async function getEvidenceFileForUser(leadId, evidenciaId, user = {}) {
  const { role, viewer } = await resolveViewerContext(user);
  const result = await dynamoDocClient.send(
    new GetCommand({
      TableName: TABLE(),
      Key: { id: String(leadId || "").trim() },
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

  const evidencia = (result.Item.evidencias || []).find(
    (item) => String(item.id) === String(evidenciaId),
  );
  if (!evidencia?.workdriveFileId) {
    const err = new Error("Evidência não encontrada");
    err.status = 404;
    err.code = "NOT_FOUND";
    throw err;
  }

  const file = await downloadWorkDriveFile(evidencia.workdriveFileId);
  return {
    ...file,
    fileName: evidencia.fileName || "evidencia.jpg",
    mimeType: evidencia.mimeType || file.contentType,
  };
}

async function updateLeadItem(leadId, updates, condition) {
  const built = buildDynamoUpdateParts(updates);
  const names = { ...built.names, ...(condition?.names || {}) };
  const values = { ...built.values, ...(condition?.values || {}) };

  const exists = "attribute_exists(id)";
  const conditionExpression = condition?.expression
    ? `${exists} AND ${condition.expression}`
    : exists;

  try {
    const result = await dynamoDocClient.send(
      new UpdateCommand({
        TableName: TABLE(),
        Key: { id: leadId },
        UpdateExpression: built.updateExpression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
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
export async function registerContactAttempt(leadId, user, round, { observacao, files } = {}) {
  await getLeadForUser(leadId, user);
  const now = new Date().toISOString();
  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  const { n, note, updates } = treatedAttemptUpdates(raw, round, {
    observacao,
    at: now,
  });
  const evidence = await persistLeadEvidencias(raw, files, {
    acao: "tentativa",
    round: n,
    user,
  });
  const meta = ATTEMPT_ROUNDS[n];
  const actor = user.email || user.id || "usuario";
  const alreadyInteresse =
    normalizeText(raw.status).includes("interesse") &&
    !normalizeText(raw.status).includes("sem");
  const historico = appendHistorico(raw, [
    {
      action:
        n === 1
          ? "primeira_tentativa"
          : n === 2
            ? "segunda_tentativa"
            : "terceira_tentativa",
      label: `${n}ª tentativa de contato realizada`,
      detail: evidenceHistoryDetail(note, evidence.uploaded),
      by: actor,
    },
    alreadyInteresse
      ? null
      : {
          action: "lead_com_interesse",
          label: "Médico demonstrou interesse!",
          detail: "O médico sinalizou interesse durante o contato. Lead avançando no funil de atendimento.",
          by: actor,
        },
  ]);

  const updated = await updateLeadItem(leadId, {
    ...updates,
    historico,
    evidencias: evidence.evidencias,
    workdriveFolderId: evidence.workdriveFolderId,
    workdriveFolderName: evidence.workdriveFolderName,
    protocolo: evidence.protocolo,
  });
  if (!raw.protocolo && evidence.protocolo) {
    syncZohoLeadProtocolo(updated);
  }
  syncZohoLeadAttemptTreated(updated, n, { observacao: note, at: now });
  void notifyTentativa(updated, n, user);
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
  const now = new Date().toISOString();
  const updates = timeoutAttemptUpdates(raw, round, now);
  if (!updates) return null;

  const n = parseAttemptRound(round);
  const meta = ATTEMPT_ROUNDS[n];
  // 3ª (sem pedido de 4ª) e 4ª são terminais: o lead inteiro vira "Lead Sem Tratativa".
  const leadTerminal = n === 3 || n === 4;
  const observacao = updates[meta.desc];

  const historico = appendHistorico(raw, {
    action: leadTerminal ? "lead_sem_tratativa" : "tentativa_sem_retorno",
    label: leadTerminal
      ? `Lead sem tratativa (${n}ª tentativa vencida sem ação)`
      : `Médico não retornou (${n}ª tentativa)`,
    detail: observacao,
    by: "sistema",
  });

  const updated = await updateLeadItem(raw.id, { ...updates, historico });
  syncZohoLeadAttemptNoReturn(updated, n, {
    at: now,
    observacao,
    leadTerminal,
  });
  if (leadTerminal) void notifyLeadSemTratativa(updated);
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
export async function markLeadSemInteresse(leadId, user, { observacao, files } = {}) {
  await getLeadForUser(leadId, user);
  const now = new Date().toISOString();
  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  const { note, round, updates } = semInteresseUpdates(raw, {
    observacao,
    at: now,
  });
  const evidence = await persistLeadEvidencias(raw, files, {
    acao: "sem_interesse",
    round,
    user,
  });
  const meta = round ? ATTEMPT_ROUNDS[round] : null;
  const historico = appendHistorico(raw, {
    action: "sem_interesse",
    label: meta
      ? `Médico sem interesse (${round}ª tentativa)`
      : "Médico sem interesse",
    detail: evidenceHistoryDetail(note, evidence.uploaded),
    by: user.email || user.id || "usuario",
  });

  const updated = await updateLeadItem(leadId, {
    ...updates,
    historico,
    evidencias: evidence.evidencias,
    workdriveFolderId: evidence.workdriveFolderId,
    workdriveFolderName: evidence.workdriveFolderName,
    protocolo: evidence.protocolo,
  });
  if (!raw.protocolo && evidence.protocolo) {
    syncZohoLeadProtocolo(updated);
  }
  syncZohoLeadSemInteresse(updated, {
    at: now,
    observacao: note,
    round,
  });
  if (isSlaAccepted(raw)) {
    void decrementCargaAceita(raw.consultorId);
  }
  void notifyStatusChange(updated, user, "Lead Sem Interesse");
  return toLeadDetail(updated);
}

/**
 * Consultor marca o lead como sem contato (status do lead + data).
 */
export async function markLeadSemContato(leadId, user, { files } = {}) {
  await getLeadForUser(leadId, user);
  const now = new Date().toISOString();
  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  const { updates } = semContatoUpdates(raw, { at: now });
  const evidence = await persistLeadEvidencias(raw, files, {
    acao: "sem_contato",
    user,
  });
  const historico = appendHistorico(raw, {
    action: "sem_contato",
    label: "Médico não foi localizado",
    detail: evidenceHistoryDetail(
      "Consultor registrou que não foi possível contato com o lead.",
      evidence.uploaded,
    ),
    by: user.email || user.id || "usuario",
  });

  const updated = await updateLeadItem(leadId, {
    ...updates,
    historico,
    evidencias: evidence.evidencias,
    workdriveFolderId: evidence.workdriveFolderId,
    workdriveFolderName: evidence.workdriveFolderName,
    protocolo: evidence.protocolo,
  });
  if (!raw.protocolo && evidence.protocolo) {
    syncZohoLeadProtocolo(updated);
  }
  syncZohoLeadSemContato(updated, { at: now });
  if (isSlaAccepted(raw)) {
    void decrementCargaAceita(raw.consultorId);
  }
  void notifyStatusChange(updated, user, "Lead Sem Contato");
  return toLeadDetail(updated);
}

/**
 * Consultor solicita a 4ª tentativa durante a janela da 3ª — sem aprovação
 * de gerência. Exige data-alvo (até 1 mês), motivo e ao menos 1 evidência.
 */
export async function requestFourthAttempt(
  leadId,
  user,
  { dataQuartaTentativa, motivo, files } = {},
) {
  await getLeadForUser(leadId, user);
  const now = new Date().toISOString();
  const raw = (
    await dynamoDocClient.send(
      new GetCommand({ TableName: TABLE(), Key: { id: leadId } }),
    )
  ).Item;

  const { note, updates } = requestFourthAttemptUpdates(raw, {
    dataQuartaTentativa,
    motivo,
    at: now,
  });
  const evidence = await persistLeadEvidencias(raw, files, {
    acao: "solicitacao_4a_tentativa",
    round: 4,
    user,
  });
  const dataFormatada = new Date(updates.dataQuartaTentativa).toLocaleDateString("pt-BR");
  const historico = appendHistorico(raw, {
    action: "solicitacao_4a_tentativa",
    label: "4ª tentativa solicitada pelo consultor",
    detail: evidenceHistoryDetail(
      `${note}\n\nData combinada para a 4ª tentativa: ${dataFormatada}`,
      evidence.uploaded,
    ),
    by: user.email || user.id || "usuario",
  });

  let updated;
  try {
    updated = await updateLeadItem(
      leadId,
      {
        ...updates,
        historico,
        evidencias: evidence.evidencias,
        workdriveFolderId: evidence.workdriveFolderId,
        workdriveFolderName: evidence.workdriveFolderName,
        protocolo: evidence.protocolo,
      },
      // Protege contra corrida com o sweeper: se a 3ª tentativa já foi
      // fechada (por timeout) entre o snapshot acima e este write, aborta
      // em vez de gravar um pedido de 4ª sobre um lead já "Sem Tratativa".
      {
        expression: "attribute_not_exists(#dataTerceira)",
        names: { "#dataTerceira": "dataTerceiraTentativa" },
      },
    );
  } catch (error) {
    if (error.code === "OFFER_GONE") {
      const err = new Error(
        "O prazo da 3ª tentativa encerrou antes do pedido ser processado. Não é mais possível solicitar a 4ª tentativa.",
      );
      err.status = 409;
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    throw error;
  }

  if (!raw.protocolo && evidence.protocolo) {
    syncZohoLeadProtocolo(updated);
  }
  syncZohoLeadFourthAttemptRequested(updated, {
    at: now,
    dataQuartaTentativa: updates.dataQuartaTentativa,
    motivo: note,
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

  if (lead.slaStatus === "rejeitado") {
    const err = new Error(
      "Este lead foi rejeitado (recusa ou prazo de 48h vencido) e devolvido ao Zoho. Não retorna à fila.",
    );
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
      await rejectLeadOffer(raw, {
        reason: "Prazo de 48h para aceite expirado no momento da confirmação.",
        by: user.email || user.id || "usuario",
      });
    }

    const err = new Error(
      "Prazo de 48h para aceite expirado. Este lead foi encerrado e devolvido ao Zoho como rejeitado.",
    );
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
    label: "Lead aceito — atendimento iniciado",
    detail: "Você confirmou o recebimento deste lead. Ele está na sua carteira e em processo de qualificação.",
    by: user.email || user.id || "usuario",
  });

  const offered = offeredStatusCondition();
  const updated = await updateLeadItem(
    leadId,
    {
      slaStatus: "aceito",
      slaCheckinAt: now,
      slaDeadline: null,
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
  void incrementCargaAceita(updated.consultorId);
  void notifyLeadAceito(updated, user);
  return toLeadDetail(updated);
}

/**
 * Consultor recusa a oferta — o lead é encerrado no Portal (Lead Rejeitado)
 * e devolvido ao Zoho. Não segue para o próximo da fila.
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

  const updated = await rejectLeadOffer(raw, {
    reason: `Consultor recusou a oferta (${user.email || user.id || "usuario"}).`,
    by: user.email || user.id || "usuario",
  });

  if (!updated) {
    const err = new Error("Esta oferta não está mais disponível.");
    err.status = 409;
    err.code = "OFFER_GONE";
    throw err;
  }

  // Notificação ao gerente já é disparada dentro de rejectLeadOffer (cobre
  // tanto essa recusa explícita quanto o timeout de 48h do sweeper).
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

  if (isSlaAccepted(existing)) {
    void decrementCargaAceita(existing.consultorId);
  }
  void notifyLeadConvertido(updated);

  return {
    updated: true,
    alreadyConverted: false,
    lead: updated,
  };
}
