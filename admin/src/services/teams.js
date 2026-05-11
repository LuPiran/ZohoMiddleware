import { supabase } from "./supabaseClient";
import { authService } from "./auth";

const USERS_TABLES = ["Usuario", "usuario", "users"];
const TEAMS_TABLES = ["Equipe", "equipe", "teams"];

async function runOnFirstAvailableTable(candidates, runner) {
  let lastError = null;
  for (const table of candidates) {
    try {
      const result = await runner(table);
      if (!result?.error) {
        return { ...result, table };
      }
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Tabela não disponível");
}

function normalizeTipo(tipo) {
  return String(tipo || "")
    .trim()
    .toLowerCase();
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome || "",
    email: row.email || "",
    tipo: row.tipo || "",
    foto: row.foto || null,
    equipe_id: row.equipe_id ?? null,
    ativo: row.ativo !== false,
  };
}

async function getCurrentProfile() {
  const authUser = authService.getUser();
  const email = String(authUser?.email || "").trim().toLowerCase();
  if (!email) throw new Error("Usuário autenticado inválido");

  const { data, error } = await runOnFirstAvailableTable(USERS_TABLES, (table) =>
    supabase
      .from(table)
      .select("id, nome, email, tipo, foto, equipe_id, ativo")
      .eq("email", email)
      .maybeSingle(),
  );

  if (error || !data) throw new Error("Perfil do usuário não encontrado");
  return normalizeUser(data);
}

async function fetchUsersByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await runOnFirstAvailableTable(USERS_TABLES, (table) =>
    supabase
      .from(table)
      .select("id, nome, email, tipo, foto, equipe_id, ativo")
      .in("id", uniqueIds),
  );
  if (error) throw error;
  return (data || []).map(normalizeUser);
}

async function mapTeam(team) {
  const gerente = team.gerente_id
    ? (await fetchUsersByIds([team.gerente_id]))[0] || null
    : null;
  const { data: integrantesData } = await runOnFirstAvailableTable(
    USERS_TABLES,
    (table) =>
      supabase
        .from(table)
        .select("id, nome, email, tipo, foto, equipe_id, ativo")
        .eq("equipe_id", team.id)
        .eq("tipo", "Consultor")
        .order("nome", { ascending: true }),
  );
  const consultores = (integrantesData || []).map(normalizeUser);
  return {
    id: team.id,
    nome: team.nome || "",
    gerenteId: team.gerente_id || null,
    gerente,
    consultores,
    integrantesCount: consultores.length,
    created_at: team.created_at || null,
    updated_at: team.updated_at || null,
  };
}

export const teamsService = {
  async getTeams({ page = 1, perPage = 10, search = "" } = {}) {
    const profile = await getCurrentProfile();
    const isAdmin = ["admin", "admin painel", "diretoria"].includes(
      normalizeTipo(profile.tipo),
    );
    const isGerente = normalizeTipo(profile.tipo) === "gerente";
    if (!isAdmin && !isGerente) throw new Error("Sem permissão para visualizar equipes");

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safePerPage = Number(perPage) > 0 ? Number(perPage) : 10;
    const from = (safePage - 1) * safePerPage;
    const to = from + safePerPage - 1;
    const searchTerm = String(search || "").trim();

    const { data, count, error } = await runOnFirstAvailableTable(TEAMS_TABLES, (table) => {
      let query = supabase
        .from(table)
        .select("id, nome, gerente_id, created_at, updated_at", { count: "exact" })
        .order("created_at", { ascending: false });

      if (isGerente) {
        query = query.eq("gerente_id", profile.id);
      }
      if (searchTerm) {
        query = query.ilike("nome", `%${searchTerm}%`);
      }
      return query.range(from, to);
    });

    if (error) throw error;

    const teamsMapped = await Promise.all((data || []).map((row) => mapTeam(row)));
    const total = count || 0;
    return {
      success: true,
      data: teamsMapped,
      profile,
      isAdmin,
      pagination: {
        page: safePage,
        perPage: safePerPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePerPage)),
      },
    };
  },

  async getAvailableManagers({ excludeTeamId = null } = {}) {
    const { data, error } = await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase
        .from(table)
        .select("id, nome, email, tipo, foto, equipe_id, ativo")
        .eq("tipo", "Gerente")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    );
    if (error) throw error;

    const allManagers = (data || []).map(normalizeUser);
    const { data: teamsData } = await runOnFirstAvailableTable(TEAMS_TABLES, (table) =>
      supabase.from(table).select("id, gerente_id"),
    );
    const occupied = new Set(
      (teamsData || [])
        .filter((t) => (excludeTeamId ? t.id !== excludeTeamId : true))
        .map((t) => t.gerente_id)
        .filter(Boolean),
    );
    return allManagers.filter((g) => !occupied.has(g.id));
  },

  async getAvailableConsultants({ excludeTeamId = null } = {}) {
    const { data, error } = await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase
        .from(table)
        .select("id, nome, email, tipo, foto, equipe_id, ativo")
        .eq("tipo", "Consultor")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    );
    if (error) throw error;
    return (data || [])
      .map(normalizeUser)
      .filter((u) => !u.equipe_id || (excludeTeamId && u.equipe_id === excludeTeamId));
  },

  async createTeam({ nome, gerenteId, consultorIds }) {
    const profile = await getCurrentProfile();
    const tipo = normalizeTipo(profile.tipo);
    if (!["admin", "admin painel", "diretoria"].includes(tipo)) {
      throw new Error("Apenas Admin pode criar equipe");
    }

    const teamName = String(nome || "").trim();
    const members = [...new Set((consultorIds || []).filter(Boolean))];
    if (!teamName || !gerenteId || !members.length) {
      throw new Error("Todos os campos obrigatórios devem ser preenchidos");
    }

    const { data: insertedTeam, error: teamError } = await runOnFirstAvailableTable(
      TEAMS_TABLES,
      (table) =>
        supabase
          .from(table)
          .insert({ nome: teamName, gerente_id: gerenteId })
          .select("id, nome, gerente_id, created_at, updated_at")
          .single(),
    );
    if (teamError || !insertedTeam?.id) throw teamError || new Error("Erro ao criar equipe");

    await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase.from(table).update({ equipe_id: insertedTeam.id }).eq("id", gerenteId),
    );
    await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase.from(table).update({ equipe_id: insertedTeam.id }).in("id", members),
    );
    return { success: true, data: await mapTeam(insertedTeam) };
  },

  async updateTeam(id, { nome, gerenteId, consultorIds }) {
    const teamId = id;
    const teamName = String(nome || "").trim();
    const members = [...new Set((consultorIds || []).filter(Boolean))];
    if (!teamName || !gerenteId || !members.length) {
      throw new Error("Todos os campos obrigatórios devem ser preenchidos");
    }

    const { data: existing, error: getErr } = await runOnFirstAvailableTable(
      TEAMS_TABLES,
      (table) =>
        supabase
          .from(table)
          .select("id, nome, gerente_id, created_at, updated_at")
          .eq("id", teamId)
          .maybeSingle(),
    );
    if (getErr || !existing) throw getErr || new Error("Equipe não encontrada");

    const { error: updErr } = await runOnFirstAvailableTable(TEAMS_TABLES, (table) =>
      supabase.from(table).update({ nome: teamName, gerente_id: gerenteId }).eq("id", teamId),
    );
    if (updErr) throw updErr;

    // Limpa vínculo atual e recria
    await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase.from(table).update({ equipe_id: null }).eq("equipe_id", teamId),
    );
    await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase.from(table).update({ equipe_id: teamId }).eq("id", gerenteId),
    );
    await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase.from(table).update({ equipe_id: teamId }).in("id", members),
    );

    const refreshed = { ...existing, nome: teamName, gerente_id: gerenteId };
    return { success: true, data: await mapTeam(refreshed) };
  },

  async deleteTeam(id) {
    const teamId = id;
    await runOnFirstAvailableTable(USERS_TABLES, (table) =>
      supabase.from(table).update({ equipe_id: null }).eq("equipe_id", teamId),
    );
    const { error } = await runOnFirstAvailableTable(TEAMS_TABLES, (table) =>
      supabase.from(table).delete().eq("id", teamId),
    );
    if (error) throw error;
    return { success: true };
  },

  async getTeamById(teamId, { search = "" } = {}) {
    const profile = await getCurrentProfile();
    const { data: team, error } = await runOnFirstAvailableTable(TEAMS_TABLES, (table) =>
      supabase
        .from(table)
        .select("id, nome, gerente_id, created_at, updated_at")
        .eq("id", teamId)
        .maybeSingle(),
    );
    if (error || !team) throw error || new Error("Equipe não encontrada");

    const isAdmin = ["admin", "admin painel", "diretoria"].includes(
      normalizeTipo(profile.tipo),
    );
    const isGerenteDaEquipe = team.gerente_id === profile.id;
    if (!isAdmin && !isGerenteDaEquipe) throw new Error("Sem permissão para visualizar equipe");

    const mapped = await mapTeam(team);
    const searchTerm = String(search || "").trim().toLowerCase();
    if (!searchTerm) return { success: true, data: mapped, profile, isAdmin };

    const filtered = mapped.consultores.filter((c) => {
      const nome = String(c.nome || "").toLowerCase();
      const email = String(c.email || "").toLowerCase();
      return nome.includes(searchTerm) || email.includes(searchTerm);
    });
    return {
      success: true,
      data: { ...mapped, consultores: filtered },
      profile,
      isAdmin,
    };
  },
};

