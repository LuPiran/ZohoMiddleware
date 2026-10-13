import { ENV } from "../config/env.js";
import { chamarZohoApi } from "./zohoApi.js";
import {
  ZOHO_ATTEMPT_STATUS,
  ZOHO_LEAD_STATUS,
} from "../domain/leadStatus.js";
import { TIMEOUT_OBSERVACAO } from "../domain/leadAttempts.js";

export { ZOHO_ATTEMPT_STATUS, ZOHO_LEAD_STATUS };

const STATUS_ALIASES = {
  "novo lead": ZOHO_LEAD_STATUS.NOVO,
  novo: ZOHO_LEAD_STATUS.NOVO,
  "lead em oferta": ZOHO_LEAD_STATUS.EM_OFERTA,
  "em oferta": ZOHO_LEAD_STATUS.EM_OFERTA,
  "lead em qualificação": ZOHO_LEAD_STATUS.QUALIFICACAO,
  "lead em qualificacao": ZOHO_LEAD_STATUS.QUALIFICACAO,
  qualificado: ZOHO_LEAD_STATUS.QUALIFICACAO,
  "lead com interesse": ZOHO_LEAD_STATUS.COM_INTERESSE,
  "em contato": ZOHO_LEAD_STATUS.COM_INTERESSE,
  "lead sem contato": ZOHO_LEAD_STATUS.SEM_CONTATO,
  "lead sem interesse": ZOHO_LEAD_STATUS.SEM_INTERESSE,
  perdido: ZOHO_LEAD_STATUS.SEM_INTERESSE,
  "lead convertido": ZOHO_LEAD_STATUS.CONVERTIDO,
  convertido: ZOHO_LEAD_STATUS.CONVERTIDO,
  "lead rejeitado": ZOHO_LEAD_STATUS.REJEITADO,
  rejeitado: ZOHO_LEAD_STATUS.REJEITADO,
  "lead sem tratativa": ZOHO_LEAD_STATUS.SEM_TRATATIVA,
  "sem tratativa": ZOHO_LEAD_STATUS.SEM_TRATATIVA,
  "lead direcionado ao marketing": ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  "direcionado ao marketing": ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  "direcionado marketing": ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  // Nome antigo do picklist, antes do rename — leads já encaminhados
  // continuam reconhecidos.
  "lead encaminhado ao marketing": ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  "encaminhado ao marketing": ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  "encaminhado marketing": ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  "lead encaminhado à gestão": ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO,
  "lead encaminhado a gestao": ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO,
  "encaminhado à gestão": ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO,
  "encaminhado gestao": ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO,
  // Grafia antiga do Portal (com acento), que o picklist do Zoho não tem.
  "lead já atribuído": ZOHO_LEAD_STATUS.JA_ATRIBUIDO,
};

export function canonicalizeLeadStatus(raw, fallback = ZOHO_LEAD_STATUS.NOVO) {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (Object.values(ZOHO_LEAD_STATUS).includes(value)) return value;
  return STATUS_ALIASES[value.toLowerCase()] || value;
}

function field(name, value) {
  if (!name || value === undefined || value === null || value === "") return {};
  return { [name]: value };
}

/**
 * Renderiza lead.historico (a mesma timeline "Histórico de ações" que o
 * Portal mostra na tela do lead) num texto multi-linhas legível, pra quem
 * só olha o Zoho acompanhar a "obra completa" sem precisar abrir o Portal.
 * Mais recente primeiro — mesma ordem da tela. Reescreve o campo inteiro a
 * cada sync (não faz append incremental): como o historico já vem completo
 * em memória em todo ponto de sincronização, é mais simples e robusto do
 * que buscar o valor atual no Zoho só pra concatenar.
 */
function buildZohoLogText(lead) {
  const historico = Array.isArray(lead?.historico) ? lead.historico : [];
  if (!historico.length) return "Sem eventos registrados ainda.";
  return historico
    .map((entry) => {
      const quando = entry?.at
        ? new Date(entry.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
        : "—";
      const titulo = entry?.label || entry?.action || "Evento";
      return entry?.detail ? `[${quando}] ${titulo} — ${entry.detail}` : `[${quando}] ${titulo}`;
    })
    .join("\n");
}

function logField(lead) {
  return field(ENV.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD, buildZohoLogText(lead));
}

function consultorLookup(lead) {
  const name = String(lead?.consultor || "").trim();
  if (!name) return undefined;
  // Consultor_Tegra é Lista de opções no CRM — envia o nome como string pura.
  // O valor precisa existir no picklist do campo para ser gravado.
  return name;
}

function addNextAttemptFlags(round) {
  if (round === 1) {
    return field(ENV.ZOHO_LEAD_ADD_2A_FIELD, true);
  }
  if (round === 2) {
    return field(ENV.ZOHO_LEAD_ADD_3A_FIELD, true);
  }
  return {};
}

/**
 * Converte ISO 8601 → formato DataHora do Zoho ("2026-08-24T14:30:00+00:00").
 * Usado em campos do tipo DataHora (ex: Dist_Data_Atribuicao, Dist_Data_Checkin).
 */
export function toZohoDateTime(iso) {
  if (!iso) return undefined;
  const parsed = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  // Zoho não aceita milissegundos — usa os primeiros 19 chars + offset
  return parsed.toISOString().slice(0, 19) + "+00:00";
}

export function toZohoDate(iso) {
  if (!iso) return undefined;
  const parsed = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return parsed.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

function attemptFieldMap(round) {
  if (round === 2) {
    return {
      date: ENV.ZOHO_LEAD_DATA_2A_FIELD,
      obs: ENV.ZOHO_LEAD_OBS_2A_FIELD,
      status: ENV.ZOHO_LEAD_STATUS_2A_FIELD,
    };
  }
  if (round === 3) {
    return {
      date: ENV.ZOHO_LEAD_DATA_3A_FIELD,
      obs: ENV.ZOHO_LEAD_OBS_3A_FIELD,
      status: ENV.ZOHO_LEAD_STATUS_3A_FIELD,
    };
  }
  if (round === 4) {
    return {
      date: ENV.ZOHO_LEAD_DATA_4A_FIELD,
      obs: ENV.ZOHO_LEAD_OBS_4A_FIELD,
      status: ENV.ZOHO_LEAD_STATUS_4A_FIELD,
    };
  }
  return {
    date: ENV.ZOHO_LEAD_DATA_1A_FIELD,
    obs: ENV.ZOHO_LEAD_OBS_1A_FIELD,
    status: ENV.ZOHO_LEAD_STATUS_1A_FIELD,
  };
}

/**
 * PUT no registro do CRM. Falha não derruba a ação do portal.
 * `limpar`: campos que devem ser apagados no Zoho (vão como null).
 * `semGatilhos`: manda `trigger: []`, então o Zoho não roda regras de
 * fluxo/aprovação/blueprint por causa dessa gravação.
 */
export async function updateZohoLeadRecord(idZoho, fields, { limpar = [], semGatilhos = false } = {}) {
  const moduleName = ENV.ZOHO_LEADS_MODULE || "Leads_M_dicos";
  const id = String(idZoho || "").trim();
  if (!id) {
    console.warn("[ZOHO LEAD] Sync ignorado: lead sem idZoho");
    return { synced: false, reason: "sem idZoho" };
  }

  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      return true;
    }),
  );
  for (const name of limpar) {
    if (name && !Object.prototype.hasOwnProperty.call(payload, name)) {
      payload[name] = null;
    }
  }
  if (!Object.keys(payload).length) {
    return { synced: false, reason: "sem campos" };
  }

  if (ENV.ZOHO_LEAD_SYNC_DISABLED) {
    console.log(`[ZOHO LEAD] Sync DESLIGADO (dev) ${id} → ${JSON.stringify(payload)}`);
    return { synced: false, reason: "sync desligado" };
  }

  await chamarZohoApi("PUT", `/${moduleName}`, {
    data: [{ id, ...payload }],
    ...(semGatilhos ? { trigger: [] } : {}),
  });

  console.log(`[ZOHO LEAD] Sync ok ${id} → ${JSON.stringify(payload)}`);
  return { synced: true };
}

export function syncZohoLead(idZoho, fields, options) {
  void updateZohoLeadRecord(idZoho, fields, options).catch((error) => {
    console.error(
      "[ZOHO LEAD] Falha ao sincronizar",
      idZoho,
      error.response?.data || error.message,
    );
  });
}

/**
 * Reenvio de um lead que já existe no Portal e não trouxe nada acionável
 * (sem Consultor Tegra, sem estar "Encaminhado à Gestão", sem atualização
 * de conversão) — avisa no Zoho que esse lead já está atribuído, em vez de
 * ficar em silêncio como se o webhook não tivesse feito nada. Não altera o
 * status interno do lead no Portal, só o que aparece pro Zoho.
 */
export function syncZohoLeadJaAtribuido(lead) {
  syncZohoLead(lead.idZoho, field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.JA_ATRIBUIDO));
}

/**
 * Fichas extras do mesmo médico: quando ele volta por outro evento, o Zoho
 * cria outro registro (outro idZoho), mas no Portal continua um lead só —
 * o idZoho de cada ficha fica em lead.eventos[]. Devolve os ids das fichas
 * extras (sem a principal, que já é lead.idZoho).
 */
function idsFichasExtras(lead) {
  const principal = String(lead?.idZoho || "").trim();
  const ids = (Array.isArray(lead?.eventos) ? lead.eventos : [])
    .map((evento) => String(evento?.idZoho || "").trim())
    .filter((id) => id && id !== principal);
  return [...new Set(ids)];
}

/**
 * Consultor que está tratando o médico, para aparecer nas fichas extras:
 * Consultor Tegra (o campo que o Marketing olha) + Dist_Consultor_*.
 * Consultor Tegra preenchido dispara a regra EnviarLeadPortalManual, então
 * toda gravação em ficha extra vai SEM_GATILHOS.
 */
function consultorVisivel(lead) {
  return {
    ...field(ENV.ZOHO_LEAD_CONSULTOR_FIELD, consultorLookup(lead)),
    ...field(ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD, lead?.emailConsultor),
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD, lead?.consultor),
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_EMAIL_FIELD, lead?.emailConsultor),
  };
}

const SEM_GATILHOS = { semGatilhos: true };

/**
 * Tabulação do consultor (aceite, tentativas, sem contato, sem interesse,
 * venda/marketing, agendamentos): grava na ficha principal e repete nas
 * fichas extras do mesmo médico, com o consultor que está tratando.
 */
function syncZohoLeadTabulacao(lead, fields) {
  syncZohoLead(lead.idZoho, fields);
  espelharNasFichasExtras(lead, { ...fields, ...consultorVisivel(lead) });
}

function espelharNasFichasExtras(lead, fields) {
  for (const id of idsFichasExtras(lead)) {
    syncZohoLead(id, fields, SEM_GATILHOS);
  }
}

// Status que já são tabulação do consultor: uma ficha extra que chega
// depois já nasce com ele. Os demais (oferta, gestão, rejeitado, retido)
// ainda não têm tabulação e a ficha extra fica "Já Atribuído".
const STATUS_TABULADOS = new Set([
  ZOHO_LEAD_STATUS.QUALIFICACAO,
  ZOHO_LEAD_STATUS.COM_INTERESSE,
  ZOHO_LEAD_STATUS.ENCAMINHADO_MKT,
  ZOHO_LEAD_STATUS.SEM_CONTATO,
  ZOHO_LEAD_STATUS.SEM_INTERESSE,
  ZOHO_LEAD_STATUS.SEM_TRATATIVA,
  ZOHO_LEAD_STATUS.CONVERTIDO,
]);

/**
 * Lead novo do Zoho (outro idZoho) de um médico que já tem lead no Portal
 * (mesmo registro + UF): o Portal só soma o evento no lead existente e não
 * distribui de novo. Responde no registro novo do Zoho para ele não ficar
 * parado em "Enviar Lead Portal": marcado como processado, com o consultor
 * que está tratando, a tabulação atual (ou "Já Atribuído", se ainda não
 * houver) e o log apontando para o lead original.
 */
export function syncZohoLeadDuplicado(idZohoNovo, original, { evento, consultorTentado } = {}) {
  if (!idZohoNovo) return;
  const quando = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const dono = original.consultor
    ? `com o consultor ${original.consultor}`
    : "ainda sem consultor";
  const bloqueio = consultorTentado
    ? `[${quando}] Envio bloqueado — Tentaram direcionar este médico para ${consultorTentado}, ` +
      `mas ele já está ${dono}. O lead foi mantido com o consultor atual.\n`
    : "";
  const cabecalho =
    bloqueio +
    `[${quando}] Médico já cadastrado no Portal — ` +
    `Este médico (registro ${original.numeroRegistro}/${original.ufCrm}) já está no Portal ` +
    `pelo protocolo ${original.protocolo || "—"}, ${dono} (status: ${original.status}). ` +
    `O evento "${evento || "Sem evento"}" foi adicionado ao histórico desse lead. ` +
    `Este registro não foi distribuído de novo e recebe as tabulações do consultor.`;
  const status = STATUS_TABULADOS.has(original.status)
    ? original.status
    : ZOHO_LEAD_STATUS.JA_ATRIBUIDO;

  syncZohoLead(idZohoNovo, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, status),
    ...field(ENV.ZOHO_LEAD_EVENTO_TRATADO_FIELD, true),
    ...field(ENV.ZOHO_LEAD_NOME_EVENTO_FIELD, evento),
    ...consultorVisivel(original),
    ...field(
      ENV.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD,
      `${cabecalho}\n\n${buildZohoLogText(original)}`,
    ),
  }, SEM_GATILHOS);
}

/**
 * Admin tirou o lead (ou só um evento dele) do Portal: a ficha do Zoho volta
 * a "Novo Lead", como se nunca tivesse sido enviada, e o log explica quem
 * tirou e por quê. Vai sem gatilhos, para nenhuma regra do Leads - Médicos
 * reenviar a ficha ao Portal. O Consultor Tegra só é limpo quando foi o
 * Portal que preencheu (se o Marketing escolheu o consultor, fica).
 */
export function syncZohoLeadRemovidoDoPortal(idZoho, { motivo, por, manterConsultor = false } = {}) {
  if (!idZoho) return;
  const quando = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const limpar = [
    ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD,
    ENV.ZOHO_LEAD_DIST_CONSULTOR_EMAIL_FIELD,
    ENV.ZOHO_LEAD_DIST_CONSULTOR_ID_FIELD,
    ENV.ZOHO_LEAD_DIST_DATA_ATRIBUICAO_FIELD,
    ENV.ZOHO_LEAD_DIST_DATA_CHECKIN_FIELD,
    ENV.ZOHO_LEAD_DIST_STATUS_FIELD,
    ENV.ZOHO_LEAD_DIST_FILA_FIELD,
    ENV.ZOHO_LEAD_DIST_RODADAS_FIELD,
    ENV.ZOHO_LEAD_DATA_QUALIFICADO_FIELD,
    ...(manterConsultor
      ? []
      : [ENV.ZOHO_LEAD_CONSULTOR_FIELD, ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD]),
  ].filter(Boolean);

  void updateZohoLeadRecord(
    idZoho,
    {
      ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.NOVO),
      ...field(ENV.ZOHO_LEAD_EVENTO_TRATADO_FIELD, false),
      ...field(
        ENV.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD,
        `[${quando}] Removido do Portal por ${por || "um administrador"}` +
          (motivo ? ` — ${motivo}` : "") +
          ". A ficha voltou para Novo Lead e pode ser enviada de novo.",
      ),
    },
    { limpar, semGatilhos: true },
  ).catch((error) => {
    console.error(
      "[ZOHO LEAD] Falha ao devolver ficha removida do Portal",
      idZoho,
      error.response?.data || error.message,
    );
  });
}

export function syncZohoLeadProtocolo(lead) {
  if (!lead?.protocolo) return;
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_PROTOCOLO_FIELD, lead.protocolo),
  });
}

/**
 * Converte a região interna do Portal (SUDESTE, SUL, NORDESTE, NORTE,
 * CENTRO-OESTE — em caixa alta, usada pra decidir a fila de consultores)
 * para o rótulo exato do picklist Dist_Regiao no Zoho (Title Case).
 */
const DIST_REGIAO_LABELS = {
  SUDESTE: "Sudeste",
  SUL: "Sul",
  NORDESTE: "Nordeste",
  NORTE: "Norte",
  "CENTRO-OESTE": "Centro-Oeste",
};

function distRegiaoLabel(regiao) {
  const key = String(regiao || "").trim().toUpperCase();
  return DIST_REGIAO_LABELS[key] || "Não Identificada";
}

/**
 * Converte o método interno de localização (geoMetodo) para o rótulo do
 * picklist Dist_Geo_Metodo no Zoho. "DDD" nunca é produzido pelo código
 * hoje — a inferência de região por DDD do desenho antigo não existe mais.
 */
const DIST_GEO_METODO_LABELS = {
  cep: "CEP",
  google: "Geolocalização Google",
  uf: "UF informada",
};

function distGeoMetodoLabel(geoMetodo) {
  return DIST_GEO_METODO_LABELS[geoMetodo] || "Nao identificada";
}

/**
 * Dist_Status desse momento da distribuição: "Sem consultor" quando não
 * sobrou destinatário nenhum (slaStatus expirado_ciclo), "Escalado gestor"
 * quando caiu na fila da Gestão, "Oferecido" no caso normal (consultor da
 * fila regional ou geo).
 */
function distStatusForOffer(lead) {
  if (lead.slaStatus === "expirado_ciclo") return "Sem consultor";
  if (lead.slaFaseGestao) return "Escalado gestor";
  return "Oferecido";
}

/**
 * Sincroniza campos Dist_* imediatamente após a distribuição do lead no portal.
 * Chamado em createLeadFromZoho logo após gravar no MySQL.
 * Fire-and-forget — não bloqueia o fluxo de criação.
 */
export function syncZohoLeadDistribuicao(lead) {
  if (!lead?.idZoho) return;
  const fila = lead.slaFaseGestao ? "Gestao" : "Consultor";
  syncZohoLead(lead.idZoho, {
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD, lead.consultor),
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_EMAIL_FIELD, lead.emailConsultor),
    ...field(ENV.ZOHO_LEAD_DIST_CONSULTOR_ID_FIELD, lead.consultorId ? String(lead.consultorId) : undefined),
    ...field(ENV.ZOHO_LEAD_DIST_DATA_ATRIBUICAO_FIELD, toZohoDateTime(lead.entradaEm)),
    ...field(ENV.ZOHO_LEAD_DIST_REGIAO_FIELD, distRegiaoLabel(lead.regiao)),
    ...field(ENV.ZOHO_LEAD_DIST_GEO_METODO_FIELD, distGeoMetodoLabel(lead.geoMetodo)),
    ...logField(lead),
    // Confirma no próprio registro que o lead passou pelo Portal, e de qual
    // evento ele veio (além das evidências indiretas dos campos Dist_*).
    ...field(ENV.ZOHO_LEAD_EVENTO_TRATADO_FIELD, true),
    ...field(ENV.ZOHO_LEAD_NOME_EVENTO_FIELD, lead.evento),
    ...field(ENV.ZOHO_LEAD_DIST_FILA_FIELD, fila),
    ...field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, distStatusForOffer(lead)),
    // Campo principal "Status" — antes ficava em "Novo Lead" durante toda a
    // janela de oferta, indistinguível de um lead que acabou de chegar.
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, lead.status),
    ...(lead.slaOfertaRound != null
      ? field(ENV.ZOHO_LEAD_DIST_RODADAS_FIELD, Number(lead.slaOfertaRound))
      : {}),
  });
}

export function syncZohoLeadAccepted(lead) {
  const now =
    lead.slaCheckinAt || lead.dataQualificado || new Date().toISOString();
  const qualificationDate = toZohoDate(now);

  // Status + data qualificação + Dist checkin no mesmo PUT
  syncZohoLeadTabulacao(lead, {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.QUALIFICACAO),
    ...field(ENV.ZOHO_LEAD_DATA_QUALIFICADO_FIELD, qualificationDate),
    ...field(ENV.ZOHO_LEAD_DIST_DATA_CHECKIN_FIELD, toZohoDateTime(now)),
    ...field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, "Aceito"),
    ...logField(lead),
  });

  const consultor = consultorLookup(lead);
  const email = lead.emailConsultor;
  if (consultor || email) {
    syncZohoLead(lead.idZoho, {
      ...field(ENV.ZOHO_LEAD_CONSULTOR_FIELD, consultor),
      ...field(ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD, email),
    });
  }
}

export function syncZohoLeadAttemptTreated(lead, round, { observacao, at, destino } = {}) {
  syncZohoLeadTabulacao(lead, buildZohoAttemptTreatedFields(lead, round, { observacao, at, destino }));
}

export function buildZohoAttemptTreatedFields(lead, round, { observacao, at, destino = "venda" } = {}) {
  const fields = attemptFieldMap(round);
  const firstAt = lead.dataPrimeiraTentativa || at;
  const firstObs = lead.descricaoPrimeiraTentativa || observacao;
  const isMkt = destino === "mkt";

  return {
    ...field(
      ENV.ZOHO_LEAD_STATUS_FIELD,
      isMkt ? ZOHO_LEAD_STATUS.ENCAMINHADO_MKT : ZOHO_LEAD_STATUS.COM_INTERESSE,
    ),
    ...(isMkt
      ? field(ENV.ZOHO_LEAD_DATA_ENCAMINHADO_MKT_FIELD, toZohoDate(at))
      : field(ENV.ZOHO_LEAD_DATA_INTERESSE_FIELD, toZohoDate(at))),
    // Lead sai da carteira do Portal ao ir pro Marketing — não há valor
    // dedicado no picklist Dist_Status pra esse caso, reaproveita "Sem
    // consultor" (ninguém do Portal está mais com esse lead).
    ...(isMkt ? field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, "Sem consultor") : {}),
    ...field(ENV.ZOHO_LEAD_DATA_1A_FIELD, toZohoDate(firstAt)),
    ...field(ENV.ZOHO_LEAD_OBS_1A_FIELD, firstObs),
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, observacao),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.TRATADO),
    ...logField(lead),
  };
}

export function syncZohoLeadAttemptNoReturn(lead, round, { at, observacao, leadTerminal } = {}) {
  syncZohoLeadTabulacao(
    lead,
    buildZohoAttemptNoReturnFields(lead, round, { at, observacao, leadTerminal }),
  );
}

export function buildZohoAttemptNoReturnFields(
  lead,
  round,
  { at, observacao, leadTerminal } = {},
) {
  const fields = attemptFieldMap(round);
  const note = observacao || TIMEOUT_OBSERVACAO;
  return {
    ...field(fields.date, toZohoDate(at)),
    ...field(fields.obs, note),
    ...field(fields.status, ZOHO_ATTEMPT_STATUS.SEM_RETORNO),
    ...addNextAttemptFlags(round),
    // Rodada 3 (sem pedido de 4ª) ou rodada 4 vencidas: o lead inteiro vira
    // "Lead Sem Tratativa" — sincroniza no mesmo PUT em vez de uma 2ª chamada.
    ...(leadTerminal
      ? {
          ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_TRATATIVA),
          ...field(ENV.ZOHO_LEAD_DATA_SEM_TRATATIVA_FIELD, toZohoDate(at)),
        }
      : {}),
    ...logField(lead),
  };
}

/**
 * Consultor solicitou a 4ª tentativa (data-alvo + motivo). Não altera o
 * status do lead — continua "Lead Em Qualificação".
 */
export function syncZohoLeadFourthAttemptRequested(lead, { at, dataQuartaTentativa, motivo } = {}) {
  syncZohoLeadTabulacao(
    lead,
    buildZohoFourthAttemptRequestedFields(lead, { at, dataQuartaTentativa, motivo }),
  );
}

export function buildZohoFourthAttemptRequestedFields(
  lead,
  { dataQuartaTentativa, motivo } = {},
) {
  return {
    ...field(ENV.ZOHO_LEAD_ADD_4A_FIELD, true),
    ...field(ENV.ZOHO_LEAD_DATA_4A_FIELD, toZohoDate(dataQuartaTentativa)),
    ...field(ENV.ZOHO_LEAD_MOTIVO_4A_FIELD, motivo),
    ...logField(lead),
  };
}

const AGENDAMENTO_FIELDS = {
  1: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_1_FIELD,
  2: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_2_FIELD,
  3: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_3_FIELD,
  4: () => ENV.ZOHO_LEAD_DATA_AGENDAMENTO_4_FIELD,
};

/**
 * Agendamento é independente do fluxo de tentativa formal — só guarda a data
 * de próximo contato previsto (até 4 por lead), sem mexer em status/rodada.
 */
export function syncZohoLeadAgendamento(lead, { n, data } = {}) {
  syncZohoLeadTabulacao(lead, buildZohoAgendamentoFields(lead, { n, data }));
}

export function buildZohoAgendamentoFields(lead, { n, data } = {}) {
  const fieldName = AGENDAMENTO_FIELDS[n]?.();
  return {
    ...(fieldName ? field(fieldName, toZohoDate(data)) : {}),
    ...logField(lead),
  };
}

/**
 * Consultor recusou ou não aceitou dentro do prazo. `lead.status` já vem
 * decidido por quem chamou (rejectLeadOffer): "Lead Encaminhado à Gestão"
 * se ainda sobra alguém pra tentar na região, "Lead Rejeitado" (terminal)
 * se a região se esgotou. Registra também quem estava com a oferta e se
 * foi recusa explícita ou timeout (Dist_Motivo_Rejeicao).
 */
export function syncZohoLeadRejected(lead, { at } = {}) {
  const fields = buildZohoRejectedFields(lead, { at });
  syncZohoLead(lead.idZoho, fields);
  // Recusa vale para todas as fichas do médico (regra do Júlio, 13/10), mas
  // sem o consultor que recusou: as extras não ficam com o nome dele.
  const semConsultor = new Set([
    ENV.ZOHO_LEAD_CONSULTOR_FIELD,
    ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD,
  ]);
  espelharNasFichasExtras(
    lead,
    Object.fromEntries(Object.entries(fields).filter(([name]) => !semConsultor.has(name))),
  );
}

export function buildZohoRejectedFields(lead, { at } = {}) {
  const motivoLabel =
    lead.motivoRejeicao === "expirado" ? "Timeout" : "Recusa explícita";
  // "Rejeitado" só no encerramento definitivo — enquanto ainda sobra alguém
  // na região pra tentar (status fica "Lead Encaminhado à Gestão", à espera
  // do Zoho reenviar o webhook), é "Repassado": recusou, mas vai adiante.
  const distStatus =
    lead.status === ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO ? "Repassado" : "Rejeitado";
  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, lead.status || ZOHO_LEAD_STATUS.REJEITADO),
    ...field(ENV.ZOHO_LEAD_DATA_REJEITADO_FIELD, toZohoDate(at)),
    ...field(ENV.ZOHO_LEAD_CONSULTOR_FIELD, consultorLookup(lead)),
    ...field(ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD, lead.emailConsultor),
    ...field(ENV.ZOHO_LEAD_DIST_STATUS_FIELD, distStatus),
    ...field(ENV.ZOHO_LEAD_DIST_MOTIVO_REJEICAO_FIELD, motivoLabel),
    ...logField(lead),
  };
}

export function syncZohoLeadSemContato(lead, { at } = {}) {
  syncZohoLeadTabulacao(lead, buildZohoSemContatoFields(lead, { at }));
}

export function buildZohoSemContatoFields(lead, { at } = {}) {
  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_CONTATO),
    ...field(ENV.ZOHO_LEAD_DATA_SEM_CONTATO_FIELD, toZohoDate(at)),
    ...logField(lead),
  };
}

export function syncZohoLeadSemInteresse(lead, { at, observacao, round } = {}) {
  syncZohoLeadTabulacao(lead, buildZohoSemInteresseFields(lead, { at, observacao, round }));
}

export function buildZohoSemInteresseFields(lead, { at, observacao, round } = {}) {
  const n = Number(round);
  const attemptFields = [1, 2, 3, 4].includes(n) ? attemptFieldMap(n) : null;

  return {
    ...field(ENV.ZOHO_LEAD_STATUS_FIELD, ZOHO_LEAD_STATUS.SEM_INTERESSE),
    ...field(ENV.ZOHO_LEAD_DATA_SEM_INTERESSE_FIELD, toZohoDate(at)),
    ...(attemptFields
      ? {
          ...field(attemptFields.date, toZohoDate(at)),
          ...field(attemptFields.obs, observacao),
          ...field(attemptFields.status, ZOHO_ATTEMPT_STATUS.TRATADO),
        }
      : {}),
    ...logField(lead),
  };
}
