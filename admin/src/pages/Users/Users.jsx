import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdSearch,
  MdFilterList,
  MdEdit,
  MdPersonAdd,
  MdLock,
  MdLockOpen,
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
  MdRefresh,
} from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { authService } from "../../services/auth";
import { usersService } from "../../services/users";
import { ROUTES } from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { useLoading } from "../../contexts/LoadingContext";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import UserFormModal from "./UserFormModal";
import UsersDashboard from "./UsersDashboard";
import UsersFilterSidebar, { EMPTY_USER_FILTERS, countUserFilters } from "./UsersFilterSidebar";

const PER_PAGE = 10;

function contarPor(usuarios, pegarNome, vazio) {
  const mapa = new Map();
  usuarios.forEach((usuario) => {
    const nome = String(pegarNome(usuario) || "").trim() || vazio;
    mapa.set(nome, (mapa.get(nome) || 0) + 1);
  });
  return [...mapa.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
}

function formatDate(dateString) {
  if (!dateString) return { date: "—", time: "" };
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "" };
  return {
    date: date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function StatusBadge({ ativo }) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
        ativo ? "bg-tegra-success-light text-tegra-success" : "bg-tegra-error-light text-tegra-error"
      }`}
    >
      {ativo ? "ativo" : "inativo"}
    </span>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setLoading } = useLoading();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLocalLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_USER_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_USER_FILTERS);
  const [formAberto, setFormAberto] = useState(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState(null);

  const loadUsers = useCallback(async (showGlobalLoading = false) => {
    try {
      setLocalLoading(true);
      setLoadError("");
      if (showGlobalLoading) setLoading(true);
      const response = await usersService.getUsers({ all: true });
      setUsuarios(response.data || []);
    } catch (error) {
      setLoadError(
        error?.status === 429
          ? "Muitas requisições. Aguarde um momento."
          : error?.error || "Não foi possível carregar os usuários.",
      );
    } finally {
      setLocalLoading(false);
      if (showGlobalLoading) setLoading(false);
    }
  }, [setLoading]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }
    if (!hasAdminPanelPermission()) {
      showToast("Você não tem permissão para acessar esta página", "error");
      navigate(ROUTES.DASHBOARD);
      return;
    }
    loadUsers(true);
    // A checagem de acesso roda uma vez; recarregar fica no botão Atualizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const cadastro = usuario.cadastro || {};
      const matchesSearch =
        !query ||
        String(usuario.nome || "").toLowerCase().includes(query) ||
        String(usuario.email || "").toLowerCase().includes(query);
      const matchesPerfil =
        appliedFilters.perfis.length === 0 || appliedFilters.perfis.includes(cadastro.perfil);
      const matchesSituacao =
        !appliedFilters.situacao ||
        (appliedFilters.situacao === "ativo" ? usuario.status === "ativo" : usuario.status !== "ativo");
      const matchesGerencia = !appliedFilters.gerencia || cadastro.gerencia === appliedFilters.gerencia;
      const matchesRegiao = !appliedFilters.regiao || cadastro.regiao === appliedFilters.regiao;
      const matchesRecebe =
        !appliedFilters.recebeLeads ||
        (appliedFilters.recebeLeads === "sim" ? cadastro.recebeLeads !== false : cadastro.recebeLeads === false);
      const matchesParceria =
        !appliedFilters.parceria ||
        (appliedFilters.parceria === "sim" ? Boolean(cadastro.parceria) : !cadastro.parceria);
      return matchesSearch && matchesPerfil && matchesSituacao && matchesGerencia && matchesRegiao && matchesRecebe && matchesParceria;
    });
  }, [usuarios, searchTerm, appliedFilters]);

  const perfilData = useMemo(
    () => contarPor(filteredUsers, (usuario) => usuario.cadastro?.perfil, "Sem perfil"),
    [filteredUsers],
  );
  const gerenciaData = useMemo(
    () => contarPor(filteredUsers, (usuario) => usuario.cadastro?.gerencia, "Sem gerência"),
    [filteredUsers],
  );
  const regiaoData = useMemo(
    () => contarPor(filteredUsers, (usuario) => usuario.cadastro?.regiao, "Sem região"),
    [filteredUsers],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PER_PAGE;
  const pageUsers = filteredUsers.slice(pageStart, pageStart + PER_PAGE);
  const activeFilterCount = countUserFilters(appliedFilters);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, appliedFilters]);

  async function handleToggleStatus(usuario) {
    const atual = usuario.statusBoolean !== undefined ? usuario.statusBoolean : usuario.status === "ativo";
    try {
      const response = await usersService.toggleUserStatus(usuario.id, atual);
      if (!response.success) return;
      setUsuarios((lista) =>
        lista.map((item) =>
          item.id === usuario.id
            ? {
                ...item,
                status: response.data.status ? "ativo" : "inativo",
                statusBoolean: response.data.status,
                cadastro: { ...item.cadastro, ativo: response.data.status },
              }
            : item,
        ),
      );
      showToast(response.data.status ? "Usuário ativado" : "Usuário desativado", "success", 2500);
    } catch (error) {
      showToast(error?.error || "Erro ao alterar status do usuário", "error");
    }
  }

  function clearFilters() {
    setDraftFilters(EMPTY_USER_FILTERS);
    setAppliedFilters(EMPTY_USER_FILTERS);
    setFilterOpen(false);
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <header className="mb-5 sm:mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">Usuários</h1>
            <p className="mt-1 text-sm text-tegra-text-secondary max-w-2xl">
              Cadastro do portal. A lista, os gráficos e os filtros usam os usuários gravados no banco.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUsuarioEdicao(null);
                setFormAberto(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-tegra-blue-dark px-3 py-2 text-sm font-medium text-white hover:bg-tegra-blue"
            >
              <MdPersonAdd className="text-lg" aria-hidden />
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => loadUsers(false)}
              disabled={loading}
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tegra-gray-medium text-tegra-text-secondary hover:bg-tegra-gray-light hover:text-tegra-blue-dark disabled:opacity-40"
            >
              <MdRefresh className={`text-xl ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <UsersDashboard perfilData={perfilData} gerenciaData={gerenciaData} regiaoData={regiaoData} />

        <section
          aria-label="Lista de usuários"
          className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
        >
          <div className="px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-b border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <Input
                type="search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                icon={<MdSearch className="text-xl" />}
                iconRight={<MdSearch className="text-xl" />}
                onIconClick={(event) => {
                  event.preventDefault();
                  setSearchTerm(draftSearch.trim());
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setSearchTerm(draftSearch.trim());
                  }
                }}
                aria-label="Buscar usuários"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="relative inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 border-2 border-tegra-blue-dark rounded-lg text-tegra-blue-dark hover:bg-tegra-blue-dark hover:text-white transition cursor-pointer shrink-0"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
            >
              <MdFilterList className="text-xl" aria-hidden />
              <span className="text-sm font-medium">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-tegra-teal text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-14 text-center">
              <p className="text-tegra-text-primary font-medium">Carregando usuários…</p>
              <p className="mt-1 text-sm text-tegra-text-secondary">Buscando no banco.</p>
            </div>
          ) : loadError ? (
            <div className="px-4 py-14 text-center">
              <p className="text-tegra-text-primary font-medium">Não foi possível carregar</p>
              <p className="mt-1 text-sm text-tegra-text-secondary">{loadError}</p>
              <Button className="mt-4" onClick={() => loadUsers(false)}>Tentar novamente</Button>
            </div>
          ) : pageUsers.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="text-tegra-text-primary font-medium">Nenhum usuário encontrado</p>
              <p className="mt-1 text-sm text-tegra-text-secondary">
                {usuarios.length === 0
                  ? "Ainda não há usuários gravados no banco."
                  : "Ajuste a busca ou limpe os filtros para ver resultados."}
              </p>
              {(searchTerm || activeFilterCount > 0) && (
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    setDraftSearch("");
                    setSearchTerm("");
                    clearFilters();
                  }}
                >
                  Limpar busca e filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-tegra-gray-medium">
                {pageUsers.map((usuario) => {
                  const criado = formatDate(usuario.criado);
                  const ativo = usuario.status === "ativo";
                  return (
                    <article key={usuario.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar user={usuario.raw || usuario} size="sm" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-tegra-text-primary truncate">
                              {usuario.nome || "Sem nome"}
                            </h3>
                            <p className="text-xs text-tegra-text-secondary truncate">{usuario.email || "—"}</p>
                            <p className="text-xs font-medium text-tegra-blue-dark/80 truncate mt-0.5">
                              {usuario.cadastro?.perfil || "Consultor"}
                              {usuario.cadastro?.gerencia ? ` · ${usuario.cadastro.gerencia}` : ""}
                            </p>
                          </div>
                        </div>
                        <StatusBadge ativo={ativo} />
                      </div>
                      <p className="text-xs text-tegra-text-secondary">
                        Criado em <span className="font-medium text-tegra-text-primary">{criado.date}</span>
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 inline-flex items-center justify-center gap-1.5"
                          onClick={() => {
                            setUsuarioEdicao(usuario);
                            setFormAberto(true);
                          }}
                        >
                          <MdEdit aria-hidden />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 inline-flex items-center justify-center gap-1.5"
                          onClick={() => handleToggleStatus(usuario)}
                        >
                          {ativo ? <MdLockOpen aria-hidden /> : <MdLock aria-hidden />}
                          {ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-tegra-blue-dark text-tegra-text-inverse">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Usuário</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Perfil</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Gerência</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Região</th>
                      <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Data de criação</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tegra-gray-medium">
                    {pageUsers.map((usuario) => {
                      const criado = formatDate(usuario.criado);
                      const ativo = usuario.status === "ativo";
                      return (
                        <tr key={usuario.id} className="hover:bg-tegra-gray-light/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar user={usuario.raw || usuario} size="sm" />
                              <div className="min-w-0">
                                <p className="font-semibold text-tegra-text-primary truncate">{usuario.nome || "Sem nome"}</p>
                                <p className="text-xs text-tegra-text-secondary truncate">{usuario.email || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-tegra-text-primary whitespace-nowrap">
                            {usuario.cadastro?.perfil || "—"}
                          </td>
                          <td className="px-4 py-3 text-tegra-text-secondary whitespace-nowrap">
                            {usuario.cadastro?.gerencia || "—"}
                          </td>
                          <td className="px-4 py-3 text-tegra-text-secondary whitespace-nowrap">
                            {usuario.cadastro?.regiao || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-tegra-text-primary">{criado.date}</span>
                              {criado.time && <span className="text-xs text-tegra-text-secondary">{criado.time}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge ativo={ativo} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setUsuarioEdicao(usuario);
                                  setFormAberto(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-tegra-gray-medium text-tegra-blue-dark hover:bg-tegra-gray-light transition cursor-pointer"
                                title="Editar"
                              >
                                <MdEdit className="text-lg" aria-hidden />
                                <span className="text-xs font-medium">Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(usuario)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                                  ativo
                                    ? "bg-tegra-blue-dark text-white hover:bg-tegra-blue-light"
                                    : "border border-tegra-gray-medium text-tegra-blue-dark hover:bg-tegra-gray-light"
                                }`}
                                title={ativo ? "Desativar usuário" : "Ativar usuário"}
                              >
                                {ativo ? <MdLockOpen className="text-lg" aria-hidden /> : <MdLock className="text-lg" aria-hidden />}
                                <span className="text-xs font-medium">{ativo ? "Desativar" : "Ativar"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-3 sm:px-4 md:px-5 py-3 border-t border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs sm:text-sm text-tegra-text-secondary">
                  Mostrando{" "}
                  <span className="font-medium text-tegra-text-primary">
                    {pageStart + 1}–{pageStart + pageUsers.length}
                  </span>{" "}
                  de <span className="font-medium text-tegra-text-primary">{filteredUsers.length}</span>{" "}
                  usuários · {PER_PAGE} por página
                </p>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <PaginationButton label="Primeira página" disabled={safePage <= 1} onClick={() => setCurrentPage(1)}>
                    <MdFirstPage className="text-xl" />
                  </PaginationButton>
                  <PaginationButton label="Página anterior" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                    <MdChevronLeft className="text-xl" />
                  </PaginationButton>
                  <span className="px-3 text-sm tabular-nums text-tegra-text-primary font-medium">
                    {safePage} / {totalPages}
                  </span>
                  <PaginationButton label="Próxima página" disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                    <MdChevronRight className="text-xl" />
                  </PaginationButton>
                  <PaginationButton label="Última página" disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                    <MdLastPage className="text-xl" />
                  </PaginationButton>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <UsersFilterSidebar
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFilterOpen(false);
        }}
        onClear={clearFilters}
      />

      <UserFormModal
        open={formAberto}
        usuario={usuarioEdicao}
        onClose={() => setFormAberto(false)}
        onSaved={(response) => {
          setFormAberto(false);
          const ignorados = response?.data?.camposIgnorados || [];
          showToast(
            ignorados.length
              ? `Usuário salvo. O Zoho não tem estes campos: ${ignorados.join(", ")}`
              : usuarioEdicao
                ? "Usuário atualizado no Zoho e no banco"
                : "Usuário cadastrado no Zoho e no banco",
            ignorados.length ? "warning" : "success",
            3500,
          );
          loadUsers(false);
        }}
      />
    </MainLayout>
  );
}

function PaginationButton({ children, label, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="p-2 rounded-lg border border-tegra-gray-medium text-tegra-blue-dark hover:bg-tegra-gray-light disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
    >
      {children}
    </button>
  );
}
