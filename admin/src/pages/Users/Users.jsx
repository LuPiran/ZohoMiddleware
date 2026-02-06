import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { usersService } from "../../services/users";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { useLoading } from "../../contexts/LoadingContext";
import Avatar from "../../components/ui/Avatar";
import Input from "../../components/ui/Input";
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
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
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

  const fetchUsers = useCallback(async (search = "", showGlobalLoading = false) => {
    try {
      setLocalLoading(true);
      // Só ativa loading global se solicitado (não durante busca manual)
      if (showGlobalLoading) {
        setLoading(true);
      }
      
      const response = await usersService.getUsers({
        page: currentPage,
        perPage: 10, // Sempre 10 itens por página
        search: search,
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
        // Só desativa loading global se foi ativado
        if (showGlobalLoading) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              setLoading(false);
            }, 150);
          });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      if (error.status === 429) {
        showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
      } else {
        showToast("❌ Erro ao carregar usuários", "error");
      }
      setLocalLoading(false);
      if (showGlobalLoading) {
        setLoading(false);
      }
    }
  }, [currentPage, showToast, setLoading]);

  // Carrega usuários apenas quando a página muda (não busca automaticamente)
  // Este useEffect só carrega usuários quando não há busca ativa
  useEffect(() => {
    // IMPORTANTE: Não executa se houver busca ativa - a busca manual cuida disso
    if (isSearchActive) {
      return; // Sai imediatamente se há busca ativa
    }
    
    // Só busca automaticamente se não houver termo de busca
    // Usa showGlobalLoading=true apenas no carregamento inicial
    if (!searchTerm.trim()) {
      fetchUsers("", true);
    }
  }, [currentPage, searchTerm, isSearchActive]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Função para buscar usuário por nome (ao clicar no ícone de lupa)
  const handleBuscarUsuario = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      // Se não há termo de busca, carrega todos os usuários
      setCurrentPage(1);
      setIsSearchActive(false); // Remove busca ativa
      setBuscandoUsuario(true);
      setLocalLoading(true);
      try {
        const response = await usersService.getUsers({
          page: 1,
          perPage: 10,
          search: "",
        });

        if (response.success) {
          setUsuarios(response.data || []);
          setPagination(
            response.pagination || {
              page: 1,
              perPage: 10,
              total: 0,
              totalPages: 1,
            },
          );
          setLocalLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        setLocalLoading(false);
      } finally {
        setBuscandoUsuario(false);
      }
      return;
    }

    // Marca busca ativa ANTES de mudar a página para evitar que o useEffect execute
    setIsSearchActive(true);
    setBuscandoUsuario(true);
    setCurrentPage(1);
    setLocalLoading(true);

    try {
      // showGlobalLoading=false para não mostrar splash screen, apenas o overlay
      const response = await usersService.getUsers({
        page: 1,
        perPage: 10,
        search: searchTerm.trim(),
      });

      if (response.success) {
        const usuariosEncontrados = response.data || [];
        
        // Atualiza a lista de usuários com os resultados da busca
        setUsuarios(usuariosEncontrados);
        setPagination(
          response.pagination || {
            page: 1,
            perPage: 10,
            total: usuariosEncontrados.length,
            totalPages: 1,
          },
        );

        // Desativa loading
        setLocalLoading(false);
        setBuscandoUsuario(false);
        // Mantém isSearchActive como true para evitar que o useEffect sobrescreva

        // Mostra toast baseado no resultado
        if (usuariosEncontrados.length > 0) {
          showToast("✅ Usuário encontrado", "success", 2000);
        } else {
          showToast("❌ Usuário não encontrado", "error", 3000);
        }
      } else {
        setUsuarios([]);
        setLocalLoading(false);
        setBuscandoUsuario(false);
        setIsSearchActive(false);
        showToast("❌ Usuário não encontrado", "error", 3000);
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      setUsuarios([]);
      setLocalLoading(false);
      setBuscandoUsuario(false);
      setIsSearchActive(false);
      if (error.status === 429) {
        showToast("⏱️ Muitas requisições. Aguarde um momento.", "warning");
      } else {
        showToast("❌ Usuário não encontrado", "error", 3000);
      }
    }
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
      {/* Overlay de loading ao buscar usuário */}
      {buscandoUsuario && (
        <div className="cpf-loading-overlay" aria-live="polite">
          <div className="cpf-loading-glass" role="status">
            <div className="cpf-loading-spinner" />
            <p className="cpf-loading-text">Buscando usuário...</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Cabeçalho com título e busca */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">
            Usuários
          </h1>

          {/* Barra de busca e filtro */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial sm:w-64">
              <Input
                label=""
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  // Apenas atualiza o valor, não busca automaticamente
                  setSearchTerm(e.target.value);
                }}
                placeholder="Buscar por nome..."
                icon={<MdSearch className="text-xl" />}
                iconRight={<MdSearch className="text-xl" />}
                onIconClick={(e) => {
                  e.preventDefault();
                  if (!buscandoUsuario) {
                    handleBuscarUsuario(e);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!buscandoUsuario) {
                      handleBuscarUsuario(e);
                    }
                  }
                }}
                disabled={buscandoUsuario}
              />
            </div>
            <button
              className="p-2 border-2 border-tegra-blue-dark rounded-lg text-tegra-blue-dark hover:bg-tegra-blue-light transition"
              title="Filtrar"
            >
              <MdFilterList className="text-lg sm:text-xl" />
            </button>
          </div>
        </div>

        {/* Tabela/Cards */}
        <div className="bg-tegra-bg-primary rounded-lg shadow-md overflow-hidden">
          {buscandoUsuario ? (
            <div className="p-6 sm:p-8 text-center text-tegra-text-secondary text-sm sm:text-base">
              Buscando usuário...
            </div>
          ) : localLoading && usuarios.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-tegra-text-secondary text-sm sm:text-base">
              Carregando usuários...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-tegra-text-secondary text-sm sm:text-base">
              Nenhum usuário encontrado
            </div>
          ) : (
            <>
              {/* Versão Mobile: Cards */}
              <div className="md:hidden">
                <div className="p-3 space-y-3">
                  {usuarios.map((usuario) => {
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
                      status = "inativo";
                    }

                    return (
                      <div
                        key={usuario.id}
                        className="bg-white border border-tegra-gray-medium rounded-lg p-4 shadow-sm"
                      >
                        {/* Cabeçalho do card: Avatar + Nome + Status */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar
                              user={usuario.raw || usuario}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-tegra-text-primary truncate">
                                {usuario.nome || "Sem nome"}
                              </h3>
                              <p className="text-xs text-tegra-text-secondary truncate">
                                {usuario.email || "Sem email"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              status === "ativo"
                                ? "bg-tegra-success-light text-tegra-success"
                                : "bg-tegra-error-light text-tegra-error"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {/* Informações adicionais */}
                        <div className="space-y-2 mb-3 text-xs text-tegra-text-secondary">
                          {criado.date !== "-" && (
                            <div className="flex items-center gap-2">
                              <span>Criado:</span>
                              <span className="text-tegra-text-primary">
                                {criado.date}
                                {criado.time && ` ${criado.time}`}
                              </span>
                            </div>
                          )}
                          {modificado.date !== "-" && (
                            <div className="flex items-center gap-2">
                              <span>Modificado:</span>
                              <span className="text-tegra-text-primary">
                                {modificado.date}
                                {modificado.time && ` ${modificado.time}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-tegra-gray-medium">
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
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Versão Desktop: Tabela */}
              <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full">
                    {/* Cabeçalho da tabela */}
                    <thead>
                      <tr className="bg-tegra-blue-dark text-tegra-text-inverse">
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold">
                          Usuário
                        </th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold">
                          Status
                        </th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold">
                          Criado
                        </th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-bold hidden lg:table-cell">
                          Modificado
                        </th>
                        <th className="px-4 md:px-6 py-4 text-center text-sm font-bold">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    {/* Corpo da tabela */}
                    <tbody>
                      {usuarios.map((usuario) => {
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
                          status = "inativo";
                        }

                        return (
                          <tr
                            key={usuario.id}
                            className="border-b border-tegra-gray-medium hover:bg-tegra-gray-light transition"
                          >
                            {/* Usuário com Avatar */}
                            <td className="px-4 md:px-6 py-4">
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
                            <td className="px-4 md:px-6 py-4">
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
                            <td className="px-4 md:px-6 py-4 text-sm text-tegra-text-primary">
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
                            <td className="px-4 md:px-6 py-4 text-sm text-tegra-text-primary hidden lg:table-cell">
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
                            <td className="px-4 md:px-6 py-4">
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginação - Sempre exibida quando há dados */}
              {usuarios.length > 0 && (
                <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-tegra-gray-medium flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-tegra-blue-dark font-medium">
                    Página {pagination.page} de {pagination.totalPages || 1}
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Primeira página"
                    >
                      <MdFirstPage className="text-lg sm:text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Página anterior"
                    >
                      <MdChevronLeft className="text-lg sm:text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Próxima página"
                    >
                      <MdChevronRight className="text-lg sm:text-xl" />
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={currentPage === pagination.totalPages}
                      className="p-1.5 sm:px-3 sm:py-1 border-2 border-tegra-blue-dark rounded text-tegra-blue-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tegra-blue-light transition"
                      aria-label="Última página"
                    >
                      <MdLastPage className="text-lg sm:text-xl" />
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
