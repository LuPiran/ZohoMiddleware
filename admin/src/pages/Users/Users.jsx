import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { usersService } from "../../services/users";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { useLoading } from "../../contexts/LoadingContext";
import Avatar from "../../components/ui/Avatar";
import {
  MdSearch,
  MdFilterList,
  MdEdit,
  MdLock,
  MdLockOpen,
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";

export default function Users() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const [usuarios, setUsuarios] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    // Verifica autenticação
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Verifica permissão de Admin Painel
    if (!hasAdminPanelPermission()) {
      showToast("❌ Você não tem permissão para acessar esta página", "error");
      navigate(ROUTES.DASHBOARD);
      return;
    }
  }, [navigate, showToast]);

  const fetchUsers = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLoading(true); // Ativa loading global
      const response = await usersService.getUsers({
        page: currentPage,
        perPage: 10, // Sempre 10 itens por página
        search: searchTerm,
      });

      if (response.success) {
        setUsuarios(response.data || []);
        setPagination(
          response.pagination || {
            page: currentPage,
            perPage: 10,
            total: 0,
            totalPages: 1,
          },
        );

        // Desativa loading após dados serem processados
        setLocalLoading(false);
        // Aguarda um frame para garantir que os dados foram renderizados antes de esconder splash
        requestAnimationFrame(() => {
          setTimeout(() => {
            setLoading(false); // Desativa loading global após dados aparecerem
          }, 150);
        });
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      if (error.status === 429) {
        showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
      } else {
        showToast("❌ Erro ao carregar usuários", "error");
      }
      setLocalLoading(false);
      setLoading(false); // Desativa loading mesmo em caso de erro
    }
  }, [currentPage, searchTerm, showToast, setLoading]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]); // Dependências diretas, não o callback

  // Formata data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const options = { month: "short", day: "numeric", year: "numeric" };
      const dateStr = date.toLocaleDateString("pt-BR", options);
      const timeStr = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return { date: dateStr, time: timeStr };
    } catch (error) {
      return { date: "-", time: "" };
    }
  };

  // Manipula busca
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // Manipula paginação
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Alterna o status do usuário
  const handleToggleStatus = async (usuario) => {
    try {
      const currentStatusBoolean =
        usuario.statusBoolean !== undefined
          ? usuario.statusBoolean
          : usuario.status === "ativo";

      const response = await usersService.toggleUserStatus(
        usuario.id,
        currentStatusBoolean,
      );

      if (response.success) {
        // Atualiza o usuário na lista local
        setUsuarios((prevUsuarios) =>
          prevUsuarios.map((u) =>
            u.id === usuario.id
              ? {
                  ...u,
                  status: response.data.status ? "ativo" : "inativo",
                  statusBoolean: response.data.status,
                }
              : u,
          ),
        );

        showToast(
          response.data.status
            ? "✅ Usuário ativado com sucesso"
            : "✅ Usuário desativado com sucesso",
          "success",
          2500,
        );
      }
    } catch (error) {
      console.error("Erro ao alternar status:", error);
      if (error.status === 429) {
        showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
      } else {
        showToast("❌ Erro ao alterar status do usuário", "error");
      }
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho com título e busca */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-tegra-text-primary">
            Usuários
          </h1>

          {/* Barra de busca e filtro */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form onSubmit={handleSearch} className="flex-1 sm:flex-initial">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-4 pr-10 py-2 border border-tegra-gray-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-tegra-blue-dark focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-tegra-text-secondary hover:text-tegra-blue-dark"
                >
                  <MdSearch className="text-xl" />
                </button>
              </div>
            </form>
            <button
              className="p-2 border-2 border-tegra-blue-dark rounded-lg text-tegra-blue-dark hover:bg-tegra-blue-light transition"
              title="Filtrar"
            >
              <MdFilterList className="text-xl" />
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-tegra-bg-primary rounded-lg shadow-md overflow-hidden">
          {localLoading && usuarios.length === 0 ? (
            <div className="p-8 text-center text-tegra-text-secondary">
              Carregando usuários...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Cabeçalho da tabela */}
                  <thead>
                    <tr className="bg-tegra-blue-dark text-tegra-text-inverse">
                      <th className="px-6 py-4 text-left text-sm font-bold">
                        Usuário
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold">
                        Criado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold">
                        Modificado
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  {/* Corpo da tabela */}
                  <tbody>
                    {usuarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-8 text-center text-tegra-text-secondary"
                        >
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((usuario) => {
                        const criado = formatDate(usuario.criado);
                        const modificado = formatDate(usuario.modificado);

                        // Garante que status seja sempre string
                        let status = "inativo";
                        if (typeof usuario.status === "string") {
                          status =
                            usuario.status.toLowerCase() === "ativo" ||
                            usuario.status.toLowerCase() === "active"
                              ? "ativo"
                              : "inativo";
                        } else if (typeof usuario.status === "boolean") {
                          status = usuario.status ? "ativo" : "inativo";
                        } else {
                          // Se não for string nem boolean, assume inativo
                          status = "inativo";
                        }

                        return (
                          <tr
                            key={usuario.id}
                            className="border-b border-tegra-gray-medium hover:bg-tegra-gray-light transition"
                          >
                            {/* Usuário com Avatar */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  user={usuario.raw || usuario}
                                  size="sm"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-tegra-text-primary">
                                    {usuario.nome || "Sem nome"}
                                  </span>
                                  <span className="text-xs text-tegra-text-secondary">
                                    {usuario.email || "Sem email"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                  status === "ativo"
                                    ? "bg-tegra-success-light text-tegra-success"
                                    : "bg-tegra-error-light text-tegra-error"
                                }`}
                              >
                                {status}
                              </span>
                            </td>

                            {/* Criado */}
                            <td className="px-6 py-4 text-sm text-tegra-text-primary">
                              <div className="flex flex-col">
                                <span>{criado.date}</span>
                                {criado.time && (
                                  <span className="text-xs text-tegra-text-secondary">
                                    {criado.time}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Modificado */}
                            <td className="px-6 py-4 text-sm text-tegra-text-primary">
                              <div className="flex flex-col">
                                <span>{modificado.date}</span>
                                {modificado.time && (
                                  <span className="text-xs text-tegra-text-secondary">
                                    {modificado.time}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Ações */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="p-2 text-tegra-blue-dark hover:bg-tegra-blue-light rounded transition"
                                  title="Editar"
                                  aria-label="Editar usuário"
                                >
                                  <MdEdit className="text-lg" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(usuario)}
                                  className={`p-2 rounded transition ${
                                    status === "ativo"
                                      ? "text-tegra-success hover:bg-tegra-success-light"
                                      : "text-tegra-error hover:bg-tegra-error-light"
                                  }`}
                                  title={
                                    status === "ativo"
                                      ? "Desativar usuário"
                                      : "Ativar usuário"
                                  }
                                  aria-label={
                                    status === "ativo"
                                      ? "Desativar usuário"
                                      : "Ativar usuário"
                                  }
                                >
                                  {status === "ativo" ? (
                                    <MdLockOpen className="text-lg" />
                                  ) : (
                                    <MdLock className="text-lg" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação - Sempre exibida quando há dados */}
              {usuarios.length > 0 && (
                <div className="px-6 py-4 border-t border-tegra-gray-medium flex justify-between items-center">
                  <div className="text-sm text-tegra-blue-dark font-medium">
                    Página {pagination.page} de {pagination.totalPages || 1}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Primeira página"
                    >
                      <MdFirstPage className="text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Página anterior"
                    >
                      <MdChevronLeft className="text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Próxima página"
                    >
                      <MdChevronRight className="text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={currentPage === pagination.totalPages}
                      className="px-3 py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Última página"
                    >
                      <MdLastPage className="text-xl" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
