import { readProfileTipo } from "../routes/users.route.js";

const TEAM_TABLES = ["Equipe", "equipe", "teams"];
const USER_TABLES = ["Usuario", "usuario", "users", "Usuarios", "usuarios"];

function normalizeTipo(profile) {
  return String(readProfileTipo(profile) || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isAdminHistoricoTipo(tipo) {
  return ["admin", "admin painel", "diretoria"].includes(tipo);
}

/**
 * IDs de todos os usuários da equipe do gerente (inclui o próprio gerente).
 */
export async function getEquipeMemberIdsForGerente(supabase, gerenteId) {
  if (!supabase || !gerenteId) return [];

  let equipeId = null;
  for (const t of TEAM_TABLES) {
    const { data, error } = await supabase
      .from(t)
      .select("id")
      .eq("gerente_id", gerenteId)
      .maybeSingle();
    if (!error && data?.id) {
      equipeId = data.id;
      break;
    }
  }

  const ids = new Set([gerenteId]);
  if (!equipeId) {
    return [...ids];
  }

  for (const ut of USER_TABLES) {
    const { data: rows, error } = await supabase
      .from(ut)
      .select("id")
      .eq("equipe_id", equipeId);
    if (!error && rows?.length) {
      rows.forEach((r) => {
        if (r?.id) ids.add(r.id);
      });
      break;
    }
  }

  return [...ids];
}

/**
 * Lista { id, nome } para o filtro de consultor (gerente + integrantes da equipe).
 */
export async function listConsultoresEquipeParaFiltro(supabase, gerenteId) {
  const members = await getEquipeMemberIdsForGerente(supabase, gerenteId);
  if (!members.length) {
    return [];
  }

  const out = [];
  for (const ut of USER_TABLES) {
    const { data: rows, error } = await supabase
      .from(ut)
      .select("id, nome, Nome, tipo, Tipo")
      .in("id", members)
      .order("nome", { ascending: true });
    if (error || !rows?.length) continue;
    for (const r of rows) {
      const nome = r.nome ?? r.Nome ?? "";
      if (r.id) {
        out.push({ id: r.id, nome: nome || "—" });
      }
    }
    break;
  }

  out.sort((a, b) =>
    String(a.nome).localeCompare(String(b.nome), "pt-BR", {
      sensitivity: "base",
    }),
  );
  return out;
}

function sanitizeSearchTerm(raw) {
  return String(raw || "")
    .trim()
    .replace(/%/g, "")
    .replace(/,/g, " ")
    .slice(0, 200);
}

function normalizeDateParam(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Aplica regras de visibilidade e filtros à query Supabase (muta chain).
 */
export async function applyHistoricoAccessAndFilters(supabase, req, { profile }) {
  const tipo = normalizeTipo(profile);
  const profileId = profile.id ?? profile.Id;
  if (!profileId) {
    return { error: { status: 403, body: { success: false, error: "Perfil sem id" } } };
  }

  const consultorIdParam = String(req.query.consultor_id ?? "").trim();
  const search = sanitizeSearchTerm(req.query.search);
  const createdFromParam = normalizeDateParam(req.query.created_from);
  const createdToParam = normalizeDateParam(req.query.created_to);

  let teamMemberIds = null;
  if (tipo === "gerente") {
    teamMemberIds = await getEquipeMemberIdsForGerente(supabase, profileId);
  }

  const filters = [];

  if (isAdminHistoricoTipo(tipo)) {
    // vê todos
  } else if (tipo === "consultor") {
    filters.push({ type: "eq", col: "cadastro_usuario_id", val: profileId });
  } else if (tipo === "gerente") {
    const ids = teamMemberIds?.length ? teamMemberIds : [profileId];
    if (consultorIdParam === "equipe") {
      filters.push({ type: "in", col: "cadastro_usuario_id", vals: ids });
    } else {
      const target =
        consultorIdParam && consultorIdParam !== ""
          ? consultorIdParam
          : profileId;
      if (!ids.includes(target)) {
        return {
          error: {
            status: 403,
            body: {
              success: false,
              error: "Consultor não pertence à sua equipe",
              code: "CONSULTOR_INVALIDO",
            },
          },
        };
      }
      filters.push({ type: "eq", col: "cadastro_usuario_id", val: target });
    }
  } else {
    filters.push({ type: "eq", col: "cadastro_usuario_id", val: profileId });
  }

  if (createdFromParam) {
    filters.push({
      type: "gte",
      col: "created_at",
      val: `${createdFromParam}T00:00:00.000Z`,
    });
  }
  if (createdToParam) {
    filters.push({
      type: "lte",
      col: "created_at",
      val: `${createdToParam}T23:59:59.999Z`,
    });
  }

  return {
    filters,
    search,
    meta: {
      role: tipo,
      isGerente: tipo === "gerente",
      defaultConsultorId: tipo === "gerente" ? profileId : null,
    },
  };
}

export function applyFiltersToQuery(query, filters) {
  let q = query;
  for (const f of filters) {
    if (f.type === "eq") {
      q = q.eq(f.col, f.val);
    } else if (f.type === "in") {
      q = q.in(f.col, f.vals);
    } else if (f.type === "gte") {
      q = q.gte(f.col, f.val);
    } else if (f.type === "lte") {
      q = q.lte(f.col, f.val);
    }
  }
  return q;
}

/**
 * or=(a.ilike.%x%,b.ilike.%x%) — termo sem %
 */
export function applySearchOr(query, columns, search) {
  if (!search) return query;
  const term = `%${search}%`;
  const parts = columns.map((c) => `${c}.ilike.${term}`);
  return query.or(parts.join(","));
}

export { normalizeTipo };
