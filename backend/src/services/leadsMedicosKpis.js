import {
  findConsultorByEmail,
  getConsultorDisplayName,
  getConsultorGerencia,
} from "./consultores.js";
import { listLeadsForGerencia, resolveViewerRole, toLeadDetail } from "./leadsMedicos.js";
import { ATTEMPT_ROUNDS } from "../domain/leadAttempts.js";
import { ZOHO_ATTEMPT_STATUS } from "../domain/leadStatus.js";

const ROUND_NUMBERS = [1, 2, 3, 4];
const DAY_MS = 24 * 60 * 60 * 1000;

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  err.code = "FORBIDDEN";
  return err;
}

function daysBetweenIso(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const diff = Math.floor((to.getTime() - from.getTime()) / DAY_MS);
  return diff >= 0 ? diff : null;
}

function average(numbers) {
  const valid = numbers.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (!valid.length) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

function pct(part, total) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function countTentativasTratadas(lead) {
  return ROUND_NUMBERS.filter((n) => {
    const meta = ATTEMPT_ROUNDS[n];
    return lead?.[meta.status] === ZOHO_ATTEMPT_STATUS.TRATADO;
  }).length;
}

function bucketKeyFor(lead) {
  return String(lead.consultorId || lead.consultor || "sem-consultor");
}

/**
 * KPIs agregados da equipe de um gerente — extrai o máximo do que já existe
 * no lead (status, tentativas, agendamentos, compras vinculadas, histórico
 * de ações) mais os dois novos dados capturados nesta entrega
 * (`comprasVinculadas`, `primeiraOfertaEm`), que só existem pra leads
 * tratados/ofertados a partir do deploy desta feature.
 */
export async function buildEquipeKpis(user = {}) {
  const role = resolveViewerRole(user.perfil);
  if (role !== "gerente") {
    throw forbidden("Esta área é restrita a gerentes.");
  }

  const email = user.email || user.Email;
  const consultorRecord = email ? await findConsultorByEmail(email) : null;
  if (!consultorRecord) {
    throw forbidden("Cadastro de consultor não encontrado para este usuário.");
  }

  const { equipe, leads } = await listLeadsForGerencia(consultorRecord);

  const buckets = new Map();
  for (const membro of equipe) {
    const chave = String(membro.id || membro.nome);
    buckets.set(chave, {
      id: membro.id || null,
      nome: getConsultorDisplayName(membro) || membro.email || "—",
      email: membro.email || null,
      leads: [],
    });
  }

  for (const lead of leads) {
    const chave = bucketKeyFor(lead);
    if (!buckets.has(chave)) {
      buckets.set(chave, {
        id: lead.consultorId || null,
        nome: lead.consultor || "Sem consultor identificado",
        email: lead.emailConsultor || null,
        leads: [],
      });
    }
    buckets.get(chave).leads.push(lead);
  }

  const acoesGeral = new Map();

  const porConsultor = [...buckets.values()].map((bucket) => {
    const { leads: leadsDoConsultor } = bucket;
    const total = leadsDoConsultor.length;
    const statusCount = {};
    let convertidos = 0;
    let rejeitados = 0;
    let recusados = 0;
    let expirados = 0;
    let semTratativa = 0;
    let semInteresse = 0;
    let semContato = 0;
    let tentativasTratadas = 0;
    let agendamentos = 0;
    let comprasVinculadas = 0;
    const diasAte1aTentativa = [];
    const diasAteConversao = [];
    const diasAteAceite = [];
    const acoes = new Map();

    for (const lead of leadsDoConsultor) {
      const status = lead.status || "—";
      statusCount[status] = (statusCount[status] || 0) + 1;

      if (lead.dataConversao) convertidos += 1;
      if (lead.dataLeadRejeitado) {
        rejeitados += 1;
        // motivoRejeicao só existe pra leads rejeitados a partir desta
        // entrega — leads antigos contam em "rejeitados" mas não entram
        // em nenhum dos dois baldes abaixo (evita presumir qual foi o motivo).
        if (lead.motivoRejeicao === "expirado") expirados += 1;
        else if (lead.motivoRejeicao === "recusa") recusados += 1;
      }
      if (lead.dataLeadSemTratativa) semTratativa += 1;
      if (lead.dataSemInteresse) semInteresse += 1;
      if (lead.dataSemContato) semContato += 1;

      tentativasTratadas += countTentativasTratadas(lead);
      agendamentos += Array.isArray(lead.agendamentos) ? lead.agendamentos.length : 0;
      comprasVinculadas += Array.isArray(lead.comprasVinculadas)
        ? lead.comprasVinculadas.length
        : 0;

      const qualificadoEm = lead.dataQualificado || lead.slaCheckinAt || null;
      const d1a = daysBetweenIso(qualificadoEm, lead.dataPrimeiraTentativa);
      if (d1a !== null) diasAte1aTentativa.push(d1a);
      const dConv = daysBetweenIso(qualificadoEm, lead.dataConversao);
      if (dConv !== null) diasAteConversao.push(dConv);
      const dAceite = daysBetweenIso(lead.primeiraOfertaEm, lead.slaCheckinAt);
      if (dAceite !== null) diasAteAceite.push(dAceite);

      for (const entry of Array.isArray(lead.historico) ? lead.historico : []) {
        const action = entry?.action || "outro";
        acoes.set(action, (acoes.get(action) || 0) + 1);
        acoesGeral.set(action, (acoesGeral.get(action) || 0) + 1);
      }
    }

    return {
      id: bucket.id,
      nome: bucket.nome,
      email: bucket.email,
      totalLeads: total,
      convertidos,
      taxaConversao: pct(convertidos, total),
      rejeitados,
      taxaRejeicao: pct(rejeitados, total),
      recusados,
      expirados,
      semTratativa,
      taxaSemTratativa: pct(semTratativa, total),
      semInteresse,
      semContato,
      tentativasTratadas,
      agendamentos,
      comprasVinculadas,
      diasMedioAte1aTentativa: average(diasAte1aTentativa),
      diasMedioAteConversao: average(diasAteConversao),
      diasMedioAteAceite: average(diasAteAceite),
      statusCount,
      acoes: Object.fromEntries(acoes),
    };
  });

  porConsultor.sort((a, b) => b.totalLeads - a.totalLeads);

  const resumo = porConsultor.reduce(
    (acc, c) => {
      acc.totalLeads += c.totalLeads;
      acc.convertidos += c.convertidos;
      acc.rejeitados += c.rejeitados;
      acc.recusados += c.recusados;
      acc.expirados += c.expirados;
      acc.semTratativa += c.semTratativa;
      acc.agendamentos += c.agendamentos;
      acc.comprasVinculadas += c.comprasVinculadas;
      return acc;
    },
    {
      totalLeads: 0,
      convertidos: 0,
      rejeitados: 0,
      recusados: 0,
      expirados: 0,
      semTratativa: 0,
      agendamentos: 0,
      comprasVinculadas: 0,
    },
  );
  resumo.taxaConversao = pct(resumo.convertidos, resumo.totalLeads);
  resumo.consultores = porConsultor.length;

  return {
    gerencia: getConsultorGerencia(consultorRecord) || null,
    resumo,
    porConsultor,
    acoesGeral: Object.fromEntries(acoesGeral),
    leads: leads.map(toLeadDetail),
  };
}
