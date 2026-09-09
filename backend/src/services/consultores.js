import { geocodeAddress } from "./geocoding.js";
import * as consultoresRepo from "../db/consultoresRepo.js";

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
 * Busca consultor em portal_consultores pelo e-mail.
 */
export async function findConsultorByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const byNormalized = await consultoresRepo.findByEmail(normalized);
  if (byNormalized) return byNormalized;

  const raw = asString(email);
  if (raw && raw !== normalized) {
    return consultoresRepo.findByEmail(raw);
  }
  return null;
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
 * Consultores ativos. Usado pela fila SLA.
 */
export async function listActiveConsultores() {
  return consultoresRepo.listActive();
}

function normalizeRegiao(regiao) {
  return String(regiao || "").trim().toUpperCase();
}

/**
 * Busca consultores ativos por região.
 */
export async function findConsultoresByRegiao(regiao) {
  if (!regiao) return [];
  return consultoresRepo.listActiveByRegiao(normalizeRegiao(regiao));
}

export async function findConsultoresGestao() {
  const items = await listActiveConsultores();
  return items.filter(isPerfilGestao);
}

/**
 * Busca consultores ativos cuja gerência bate com o parâmetro.
 * Usa scan + filtro em memória (tabela pequena, ~50 registros).
 */
export async function findConsultoresByGerencia(gerencia) {
  if (!gerencia) return [];
  const target = String(gerencia).trim().toLowerCase();
  const items = await listActiveConsultores();
  return items.filter(
    (c) => String(c.gerencia || "").trim().toLowerCase() === target,
  );
}

/**
 * Equipe de um gerente — tenta 2 estratégias de match e une o resultado
 * (dedupe por id), porque não sabemos de antemão qual convenção o campo
 * "Gerencia" do Zoho segue nos registros dos consultores:
 *   1) `consultor.gerencia === gerente.gerencia` — cobre o caso de um nome
 *      de time compartilhado entre o gerente e sua equipe.
 *   2) `consultor.gerencia === nome do gerente` — cobre o caso (mais comum
 *      em CRM) de o campo guardar o nome do gerente/responsável direto.
 * Aditivo: se a estratégia 1 já bastava, a 2 não muda nada.
 */
export async function findEquipeDoGerente(gerente) {
  const items = await listActiveConsultores();
  const porGerencia = String(gerente?.gerencia || "").trim().toLowerCase();
  const nomeGerente = String(getConsultorDisplayName(gerente) || "")
    .trim()
    .toLowerCase();

  const byId = new Map();
  for (const c of items) {
    const gerenciaConsultor = String(c.gerencia || "").trim().toLowerCase();
    if (!gerenciaConsultor) continue;
    const matchPorGerencia = porGerencia && gerenciaConsultor === porGerencia;
    const matchPorNome = nomeGerente && gerenciaConsultor === nomeGerente;
    if (matchPorGerencia || matchPorNome) {
      byId.set(c.id, c);
    }
  }
  return [...byId.values()];
}

/**
 * E-mails do(s) gerente(s) responsáveis pela gerência informada — hoje o
 * único nível de escalonamento em notificações (não existe perfil Gestão
 * separado para esse fim). Depende de `gerencia` estar sincronizada no
 * registro do próprio gerente (feito automaticamente no login via
 * `syncConsultorZohoPerfil`, a partir do campo "Gerencia" do Zoho).
 */
export async function findGerenteEmailsByGerencia(gerencia) {
  if (!gerencia) return [];
  const membros = await findConsultoresByGerencia(gerencia);
  return membros
    .filter(isPerfilGerencia)
    .map((c) => asString(c.email))
    .filter(Boolean);
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
    await consultoresRepo.incrementCargaAceita(consultorId);
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
    await consultoresRepo.decrementCargaAceita(consultorId);
  } catch (error) {
    console.warn("[CONSULTORES] Falha ao decrementar cargaAceita:", error.message);
  }
}

/**
 * Atualiza timestamp de última atribuição do consultor (ponteiro round-robin).
 */
export async function updateConsultorUltimaAtribuicao(consultorId, isoDate) {
  await consultoresRepo.update(String(consultorId), { ultimaAtribuicao: isoDate });
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

/**
 * Extrai um campo do objeto Zoho tentando múltiplas variantes de nome
 * (Zoho substitui acentos por "_" no nome da API).
 */
function zohoField(obj, ...candidates) {
  for (const key of candidates) {
    const val = asString(obj[key]);
    if (val) return val;
  }
  return undefined;
}

/**
 * Sincroniza dados de perfil do Zoho → MySQL portal_consultores.
 * Cria o registro se não existir; atualiza os campos de perfil se já existir.
 * Disparado no login do consultor — fire-and-forget, nunca bloqueia a resposta.
 */
export async function syncConsultorZohoPerfil(email, dadosZoho) {
  if (!email || !dadosZoho) return;

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  // Lê campos do objeto Zoho — tenta variantes com e sem acento no nome da API
  const nome       = zohoField(dadosZoho, "Name", "Nome", "name", "nome");
  const gerencia   = zohoField(dadosZoho, "Gerencia", "gerencia");
  const regiao     = zohoField(dadosZoho, "Regi_o", "Regiao", "Região", "regiao")
                      ?.trim().toUpperCase() || undefined;
  const telefone   = zohoField(dadosZoho, "Telefone", "telefone");
  const endereco   = zohoField(dadosZoho, "Endere_o", "Endereco", "Endereço", "endereco");
  const bairro     = zohoField(dadosZoho, "Bairro", "bairro");
  const cidade     = zohoField(dadosZoho, "Cidade", "cidade");
  const estado     = zohoField(dadosZoho, "Estado", "estado");
  const cep        = zohoField(dadosZoho, "CEP", "Cep", "cep");
  const emailPess  = zohoField(dadosZoho, "E_mail_Pessoal", "Email_Pessoal", "E-mail Pessoal");
  const cargo      = zohoField(dadosZoho, "Cargo", "cargo", "Perfil", "perfil");
  const zohoId     = asString(dadosZoho.id || dadosZoho.ID);
  const agora      = new Date().toISOString();

  let consultorId = null; // capturado para o geocoding posterior

  try {
    const existing = await findConsultorByEmail(normalizedEmail);

    if (existing) {
      // Monta UpdateExpression dinamicamente (só campos presentes)
      const fieldPairs = [
        ["nome",         nome],
        ["gerencia",     gerencia],
        ["regiao",       regiao],
        ["telefone",     telefone],
        ["endereco",     endereco],
        ["bairro",       bairro],
        ["cidade",       cidade],
        ["estado",       estado],
        ["cep",          cep],
        ["emailPessoal", emailPess],
        ["cargo",        cargo],
        ["syncZohoEm",   agora],
      ].filter(([, v]) => v !== undefined);

      if (!fieldPairs.length) return;

      const updates = Object.fromEntries(fieldPairs);
      await consultoresRepo.update(String(existing.id), updates);

      consultorId = String(existing.id);
      console.log(`[SYNC PERFIL] ✓ ${normalizedEmail} atualizado no MySQL`);
    } else {
      // Cria registro: usa o ID do Zoho como chave
      const newId = zohoId || String(Date.now());
      const item  = Object.fromEntries(
        [
          ["id",           newId],
          ["email",        normalizedEmail],
          ["ativo",        true],
          ["cargaAceita",  0],
          ["nome",         nome],
          ["gerencia",     gerencia],
          ["regiao",       regiao],
          ["telefone",     telefone],
          ["endereco",     endereco],
          ["bairro",       bairro],
          ["cidade",       cidade],
          ["estado",       estado],
          ["cep",          cep],
          ["emailPessoal", emailPess],
          ["cargo",        cargo],
          ["syncZohoEm",   agora],
        ].filter(([, v]) => v !== undefined),
      );

      await consultoresRepo.putIfNotExists(item);

      consultorId = newId;
      console.log(`[SYNC PERFIL] ✓ ${normalizedEmail} criado no MySQL (id: ${newId})`);
    }
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      // Registro criado concorrentemente pelo roteador — sem problema
      console.log(`[SYNC PERFIL] Consultor ${normalizedEmail} já criado por outro processo — OK`);
      return;
    }
    console.warn(`[SYNC PERFIL] ✗ Falha ao sincronizar ${normalizedEmail}:`, error.message);
    return;
  }

  // ── Geocodificação do endereço do consultor (fire-and-forget) ──────────────
  // Salva lat/lng no MySQL para o algoritmo de distribuição por proximidade.
  // Só refaz se o endereço mudou (compara pelo endereçoChave) ou se nunca foi feito.
  if (consultorId && (cidade || cep)) {
    void (async () => {
      try {
        const enderecoCompleto =
          endereco && cidade && estado ? `${endereco}, ${cidade}, ${estado}` : undefined;

        const coords = await geocodeAddress({ cidade, estado, cep, enderecoCompleto });
        if (!coords) return;

        await consultoresRepo.update(consultorId, {
          lat: coords.lat,
          lng: coords.lng,
          geoAtualizadoEm: new Date().toISOString(),
        });

        console.log(
          `[GEO] ✓ Consultor ${normalizedEmail} → lat=${coords.lat.toFixed(4)}, lng=${coords.lng.toFixed(4)}`,
        );
      } catch (geoErr) {
        console.warn(`[GEO] Falha ao geocodificar consultor ${normalizedEmail}:`, geoErr.message);
      }
    })();
  }
}
