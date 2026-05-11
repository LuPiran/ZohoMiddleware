import { getAdminProfileByRequest } from "../routes/users.route.js";

const TEAM_TABLES = ["Equipe", "equipe", "teams"];
const USER_TABLES = ["Usuario", "usuario", "users", "Usuarios", "usuarios"];

function readNomeUsuario(row) {
  if (!row) return "";
  return row.nome ?? row.Nome ?? "";
}

function readEquipeId(row) {
  return row.equipe_id ?? row.equipeId ?? null;
}

function readId(row) {
  return row.id ?? row.Id ?? null;
}

/**
 * Resolve usuário logado (tabela Usuario) e gerente da equipe vinculada.
 */
export async function resolveCadastroEquipe(supabase, req) {
  const empty = {
    cadastro_usuario_id: null,
    cadastro_usuario_nome: null,
    gerente_usuario_id: null,
    gerente_nome: null,
  };

  if (!supabase || !req) return empty;

  const profile = await getAdminProfileByRequest(req);
  if (!profile) return empty;

  const cadastroId = readId(profile);
  const cadastroNome = readNomeUsuario(profile) || null;
  const equipeId = readEquipeId(profile);

  let gerenteId = null;
  let gerenteNome = null;

  if (equipeId) {
    for (const t of TEAM_TABLES) {
      const { data: team, error } = await supabase
        .from(t)
        .select("gerente_id")
        .eq("id", equipeId)
        .maybeSingle();
      if (!error && team?.gerente_id) {
        gerenteId = team.gerente_id;
        break;
      }
    }

    if (gerenteId) {
      for (const t of USER_TABLES) {
        const { data: g, error: ge } = await supabase
          .from(t)
          .select("id, nome, Nome")
          .eq("id", gerenteId)
          .maybeSingle();
        if (!ge && g) {
          gerenteNome = readNomeUsuario(g) || null;
          break;
        }
      }
    }
  }

  return {
    cadastro_usuario_id: cadastroId,
    cadastro_usuario_nome: cadastroNome,
    gerente_usuario_id: gerenteId,
    gerente_nome: gerenteNome,
  };
}
