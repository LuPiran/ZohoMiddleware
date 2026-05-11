import { startOfDay, endOfDay } from "date-fns";
import { supabase } from "./supabaseClient";
import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Aplica filtros de intervalo de data em uma coluna (created_at / updated_at).
 * Uma única data em "de" ou "até" filtra aquele dia inteiro.
 */
function applyDateRangeFilter(query, column, fromRaw, toRaw) {
  let from = toDate(fromRaw);
  let to = toDate(toRaw);
  if (from && !to) to = from;
  if (!from && to) {
    return query.lte(column, endOfDay(to).toISOString());
  }
  if (from && to) {
    return query
      .gte(column, startOfDay(from).toISOString())
      .lte(column, endOfDay(to).toISOString());
  }
  return query;
}

/**
 * Serviço para gerenciar usuários
 */
export const usersService = {
  /**
   * Busca lista de usuários com paginação e busca
   * @param {Object} params - Parâmetros de busca
   * @param {number} params.page - Página atual (padrão: 1)
   * @param {number} params.perPage - Itens por página (padrão: 10)
   * @param {string} params.search - Termo de busca (opcional)
   * @param {"all"|"ativo"|"inativo"} [params.statusFilter] - Filtro por status
   * @param {Date|string|null} [params.createdFrom]
   * @param {Date|string|null} [params.createdTo]
   * @param {Date|string|null} [params.modifiedFrom]
   * @param {Date|string|null} [params.modifiedTo]
   * @returns {Promise<Object>}
   */
  async getUsers({
    page = 1,
    perPage = 10,
    search = "",
    statusFilter = "all",
    createdFrom = null,
    createdTo = null,
    modifiedFrom = null,
    modifiedTo = null,
  } = {}) {
    try {
      const safePage = Number(page) > 0 ? Number(page) : 1;
      const safePerPage = Number(perPage) > 0 ? Number(perPage) : 10;
      const from = (safePage - 1) * safePerPage;
      const to = from + safePerPage - 1;

      const tableCandidates = ["Usuario", "usuario", "users"];
      let queryError = null;
      let usersData = [];
      let total = 0;

      for (const tableName of tableCandidates) {
        let query = supabase
          .from(tableName)
          .select("id, nome, email, tipo, ativo, foto, created_at, updated_at", {
            count: "exact",
          })
          .neq("tipo", "Admin")
          .order("created_at", { ascending: false });

        if (search?.trim()) {
          query = query.or(
            `nome.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`,
          );
        }

        if (statusFilter === "ativo") {
          query = query.eq("ativo", true);
        } else if (statusFilter === "inativo") {
          query = query.eq("ativo", false);
        }

        query = applyDateRangeFilter(
          query,
          "created_at",
          createdFrom,
          createdTo,
        );
        query = applyDateRangeFilter(
          query,
          "updated_at",
          modifiedFrom,
          modifiedTo,
        );

        const { data, error, count } = await query.range(from, to);
        if (!error) {
          usersData = data || [];
          total = count || 0;
          queryError = null;
          break;
        }
        queryError = error;
      }

      if (queryError) {
        throw queryError;
      }

      const normalizedData = usersData.map((user) => ({
        id: user.id,
        nome: user.nome || "",
        email: user.email || "",
        tipo: user.tipo || "",
        status: user.ativo ? "ativo" : "inativo",
        statusBoolean: !!user.ativo,
        criado: user.created_at || null,
        modificado: user.updated_at || null,
        foto: user.foto || null,
        raw: user,
      }));

      const totalPages = Math.max(1, Math.ceil(total / safePerPage));

      return {
        success: true,
        data: normalizedData,
        pagination: {
          page: safePage,
          perPage: safePerPage,
          total,
          totalPages,
        },
      };
    } catch (error) {
      const errorData = {
        error: error.message || "Erro ao buscar usuarios",
        message: error.message,
        status: error.status,
      };
      throw errorData;
    }
  },

  async createUser({ nome, email, senha, tipo }) {
    try {
      const response = await api.post(API_ENDPOINTS.USERS.CREATE, {
        nome,
        email,
        senha,
        tipo,
      });
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      throw {
        error: data?.error || error.message,
        message: error.message,
        status: error.response?.status,
        code: data?.code,
        tipoLido: data?.tipoLido,
      };
    }
  },

  /**
   * Atualiza usuário (tabela + Auth quando e-mail/senha mudam)
   * @param {string} id - id da linha na tabela Usuario
   * @param {{ nome: string, email: string, tipo: string, senha?: string }} payload
   */
  async updateUser(id, { nome, email, tipo, senha }) {
    try {
      const body = { nome, email, tipo };
      if (senha && String(senha).trim()) {
        body.senha = senha;
      }
      const response = await api.patch(
        `${API_ENDPOINTS.USERS.LIST}/${encodeURIComponent(id)}`,
        body,
      );
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      throw {
        error: data?.error || error.message,
        message: error.message,
        status: error.response?.status,
        code: data?.code,
        tipoLido: data?.tipoLido,
      };
    }
  },

  /**
   * Alterna o status do usuário (ativo/inativo)
   * @param {string} userId - ID do usuário
   * @param {boolean} currentStatus - Status atual do usuário
   * @returns {Promise<Object>}
   */
  async toggleUserStatus(userId, currentStatus) {
    try {
      const newStatus = !currentStatus; // Inverte o status
      const tableCandidates = ["Usuario", "usuario", "users"];
      let updateError = null;
      let updatedRecord = null;

      for (const tableName of tableCandidates) {
        const { data, error } = await supabase
          .from(tableName)
          .update({ ativo: newStatus })
          .eq("id", userId)
          .neq("tipo", "Admin")
          .select("id, ativo")
          .single();

        if (!error && data) {
          updatedRecord = data;
          updateError = null;
          break;
        }
        updateError = error;
      }

      if (updateError || !updatedRecord) {
        throw updateError || new Error("Usuario nao encontrado para atualizacao");
      }

      return {
        success: true,
        data: {
          id: updatedRecord.id,
          status: !!updatedRecord.ativo,
        },
      };
    } catch (error) {
      const errorData = {
        error: error.message || "Erro ao alterar status",
        message: error.message,
        status: error.status,
      };
      throw errorData;
    }
  },
};
