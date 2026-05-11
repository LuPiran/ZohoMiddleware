import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";
import { authService } from "../../services/auth";
import { historicoService } from "../../services/historico";
import { useLoading } from "../../contexts/LoadingContext";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import Input from "../../components/ui/Input";
import HistoricoFilterDrawer from "../../components/historico/HistoricoFilterDrawer";
import { isGerente } from "../../utils/permissions";
import {
  MdSearch,
  MdFilterList,
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
  MdHistory,
} from "react-icons/md";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function getUserId() {
  const u = authService.getUser();
  return u?.id ?? u?.Id ?? null;
}

const TITLES = {
  compra: "Histórico de Compra",
  recompra: "Histórico de Recompra",
  proposta: "Histórico de Proposta",
  ocorrencia: "Histórico de Ocorrência",
};

const DETAIL_BASE = {
  compra: ROUTES.HISTORICO_COMPRA,
  recompra: ROUTES.HISTORICO_RECOMPRA,
  proposta: ROUTES.HISTORICO_PROPOSTA,
  ocorrencia: ROUTES.HISTORICO_OCORRENCIA,
};

const PER_PAGE_OPTIONS = [20, 50, 100];

const thClass =
  "px-4 py-3 text-left text-sm font-bold md:px-6 md:py-4 text-tegra-text-inverse";
const tdClass =
  "px-4 py-3 text-sm text-tegra-text-primary md:px-6 md:py-4";

/**
 * @param {{ tipo: 'compra' | 'recompra' | 'proposta' | 'ocorrencia' }} props
 */
export default function HistoricoListPage({ tipo }) {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const { showToast } = useToast();
  const userId = getUserId();
  const gerente = isGerente();

  const [rows, setRows] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const defaultConsultorFiltro = gerente && userId ? userId : null;
  const [filters, setFilters] = useState({
    consultorFiltro: defaultConsultorFiltro,
    createdFrom: "",
    createdTo: "",
  });
  const [filterDraft, setFilterDraft] = useState({
    consultorFiltro: defaultConsultorFiltro,
    createdFrom: "",
    createdTo: "",
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [consultoresOptions, setConsultoresOptions] = useState(
    /** @type {{ id: string; nome: string }[]} */ ([]),
  );

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 1,
  });

  const debounceTimerRef = useRef(null);
  const prevDebouncedRef = useRef(debouncedSearch);
  const prevFiltersSigRef = useRef("");
  const firstLoadRef = useRef(true);

  const filtrosSignature = useMemo(
    () =>
      JSON.stringify({
        consultorFiltro: filters.consultorFiltro,
        createdFrom: filters.createdFrom,
        createdTo: filters.createdTo,
        perPage,
      }),
    [filters, perPage],
  );

  useEffect(() => {
    if (!gerente || !userId) return;
    setFilters((prev) =>
      prev.consultorFiltro
        ? prev
        : { ...prev, consultorFiltro: userId },
    );
    setFilterDraft((prev) =>
      prev.consultorFiltro
        ? prev
        : { ...prev, consultorFiltro: userId },
    );
  }, [gerente, userId]);

  useEffect(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 280);
    return () => clearTimeout(debounceTimerRef.current);
  }, [searchTerm]);

  useEffect(() => {
    if (!gerente || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await historicoService.getFiltrosConsultores();
        if (cancelled || !res?.success) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setConsultoresOptions(list);
      } catch {
        if (!cancelled) setConsultoresOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gerente, userId]);

  const buildListParams = useCallback(() => {
    const params = {
      page: currentPage,
      perPage,
      search: debouncedSearch,
    };
    if (gerente) {
      if (filters.consultorFiltro === "equipe") {
        params.consultor_id = "equipe";
      } else if (filters.consultorFiltro) {
        params.consultor_id = filters.consultorFiltro;
      }
    }
    if (filters.createdFrom) params.created_from = filters.createdFrom;
    if (filters.createdTo) params.created_to = filters.createdTo;
    return params;
  }, [
    currentPage,
    perPage,
    debouncedSearch,
    gerente,
    filters,
    userId,
  ]);

  const fetchHistorico = useCallback(
    async (showGlobalLoading) => {
      if (showGlobalLoading) setLoading(true);
      setLocalLoading(true);
      try {
        const p = buildListParams();
        let res;
        if (tipo === "compra") res = await historicoService.listCompras(p);
        else if (tipo === "recompra")
          res = await historicoService.listRecompras(p);
        else if (tipo === "proposta")
          res = await historicoService.listPropostas(p);
        else res = await historicoService.listOcorrencias(p);

        if (res?.success) {
          setRows(res.data || []);
          if (res.pagination) setPagination(res.pagination);
        } else {
          showToast(res?.error || "Erro ao carregar histórico", "error");
        }
      } catch (e) {
        showToast(
          e.response?.data?.error || e.message || "Erro ao carregar histórico",
          "error",
        );
      } finally {
        setLocalLoading(false);
        if (showGlobalLoading) setLoading(false);
      }
    },
    [tipo, buildListParams, setLoading, showToast],
  );

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    const searchChanged = prevDebouncedRef.current !== debouncedSearch;
    const filtersChanged = prevFiltersSigRef.current !== filtrosSignature;
    const isQueryChange = searchChanged || filtersChanged;

    if (isQueryChange && currentPage !== 1) {
      prevDebouncedRef.current = debouncedSearch;
      prevFiltersSigRef.current = filtrosSignature;
      setCurrentPage(1);
      return;
    }

    prevDebouncedRef.current = debouncedSearch;
    prevFiltersSigRef.current = filtrosSignature;

    const showGlobal = firstLoadRef.current;
    if (firstLoadRef.current) firstLoadRef.current = false;

    fetchHistorico(showGlobal);
  }, [
    navigate,
    debouncedSearch,
    filtrosSignature,
    currentPage,
    fetchHistorico,
  ]);

  const flushSearch = useCallback((e) => {
    e?.preventDefault?.();
    clearTimeout(debounceTimerRef.current);
    setDebouncedSearch(searchTerm.trim());
  }, [searchTerm]);

  function handlePageChange(page) {
    if (page >= 1 && page <= (pagination.totalPages || 1)) {
      setCurrentPage(page);
    }
  }

  function openFilterDrawer() {
    setFilterDraft({ ...filters });
    setFilterDrawerOpen(true);
  }

  function handleApplyFilters() {
    setFilters({ ...filterDraft });
    setFilterDrawerOpen(false);
  }

  function handleResetFilters() {
    const resetConsultor = gerente && userId ? userId : null;
    const next = {
      consultorFiltro: resetConsultor,
      createdFrom: "",
      createdTo: "",
    };
    setFilterDraft(next);
    setFilters(next);
    setFilterDrawerOpen(false);
  }

  const title = TITLES[tipo] || "Histórico";
  const totalPages = pagination.totalPages || 1;

  function openDetail(row) {
    const base = DETAIL_BASE[tipo];
    if (!base || !row?.id) return;
    navigate(`${base}/${row.id}`);
  }

  function handleRowKeyDown(e, row) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetail(row);
    }
  }

  const hasActiveConsultorFilter =
    gerente &&
    (filters.consultorFiltro === "equipe" ||
      (filters.consultorFiltro != null &&
        userId != null &&
        filters.consultorFiltro !== userId));

  const hasActiveDateFilter =
    String(filters.createdFrom || "").trim() !== "" ||
    String(filters.createdTo || "").trim() !== "";

  const showConsultorFiltro = gerente && !!userId;

  const searchPlaceholder =
    tipo === "proposta"
      ? "Buscar por protocolo, cliente, consultor ou gerente…"
      : tipo === "ocorrencia"
        ? "Buscar por protocolo, cliente, pedido, consultor…"
        : "Buscar por protocolo, nome, consultor ou gerente…";

  return (
    <MainLayout>
      <HistoricoFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        showConsultorFiltro={showConsultorFiltro}
        userId={userId}
        consultores={consultoresOptions}
        draft={filterDraft}
        setDraft={setFilterDraft}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <div className="w-full px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mb-4 space-y-3 sm:mb-6">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <MdHistory
                className="hidden text-3xl text-tegra-blue-dark sm:block"
                aria-hidden
              />
              <h1 className="text-xl font-bold text-tegra-text-primary sm:text-2xl">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <div className="w-full sm:max-w-md">
                <Input
                  label=""
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  iconRight={<MdSearch className="text-xl" />}
                  onIconClick={(e) => flushSearch(e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      flushSearch(e);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={openFilterDrawer}
                className="relative shrink-0 rounded-lg border-2 border-tegra-blue-dark p-2 text-tegra-blue-dark transition hover:bg-tegra-blue-light"
                title="Filtrar"
                aria-label="Abrir filtros"
              >
                <MdFilterList className="text-lg sm:text-xl" />
                {(hasActiveConsultorFilter || hasActiveDateFilter) && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-tegra-teal ring-2 ring-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-tegra-bg-primary shadow-md">
          {localLoading && rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-tegra-text-secondary sm:p-8 sm:text-base">
              Carregando histórico…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-tegra-text-secondary sm:p-8 sm:text-base">
              Nenhum registro encontrado.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-tegra-blue-dark">
                        {(tipo === "compra" || tipo === "recompra") && (
                          <>
                            <th className={thClass}>Protocolo</th>
                            <th className={thClass}>Nome completo</th>
                            <th className={thClass}>Qtd. produtos</th>
                            <th className={thClass}>Consultor</th>
                            <th className={thClass}>Gerente</th>
                            <th className={thClass}>Data</th>
                          </>
                        )}
                        {tipo === "proposta" && (
                          <>
                            <th className={thClass}>Protocolo</th>
                            <th className={thClass}>Paciente / Empresa</th>
                            <th className={thClass}>Tipo de cliente</th>
                            <th className={thClass}>Qtd. produtos</th>
                            <th className={thClass}>Consultor</th>
                            <th className={thClass}>Gerente</th>
                            <th className={thClass}>Data</th>
                          </>
                        )}
                        {tipo === "ocorrencia" && (
                          <>
                            <th className={thClass}>Protocolo</th>
                            <th className={thClass}>Cliente</th>
                            <th className={thClass}>Nº pedido</th>
                            <th className={thClass}>Status</th>
                            <th className={thClass}>Consultor</th>
                            <th className={thClass}>Gerente</th>
                            <th className={thClass}>Data</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(tipo === "compra" || tipo === "recompra") &&
                        rows.map((r) => (
                          <tr
                            key={r.id || `${r.protocolo_portal}-${r.created_at}`}
                            tabIndex={0}
                            role="button"
                            aria-label={
                              r.protocolo_portal
                                ? `Abrir detalhes do protocolo ${r.protocolo_portal}`
                                : "Abrir detalhes do registro"
                            }
                            className="cursor-pointer border-b border-tegra-gray-medium transition hover:bg-tegra-blue-light/40 focus:bg-tegra-blue-light/40 focus:outline-none focus:ring-2 focus:ring-tegra-teal"
                            onClick={() => openDetail(r)}
                            onKeyDown={(e) => handleRowKeyDown(e, r)}
                          >
                            <td className={`${tdClass} font-medium`}>
                              {r.protocolo_portal || "—"}
                            </td>
                            <td className={tdClass}>{r.nome_completo || "—"}</td>
                            <td className={tdClass}>
                              {r.quantidade_produtos ?? "—"}
                            </td>
                            <td className={tdClass}>{r.consultor ?? "—"}</td>
                            <td className={tdClass}>{r.gerente ?? "—"}</td>
                            <td
                              className={`${tdClass} whitespace-nowrap text-tegra-text-secondary`}
                            >
                              {formatDate(r.created_at)}
                            </td>
                          </tr>
                        ))}
                      {tipo === "proposta" &&
                        rows.map((r) => (
                          <tr
                            key={r.id || `${r.protocolo_portal}-${r.created_at}`}
                            tabIndex={0}
                            role="button"
                            aria-label={
                              r.protocolo_portal
                                ? `Abrir detalhes do protocolo ${r.protocolo_portal}`
                                : "Abrir detalhes do registro"
                            }
                            className="cursor-pointer border-b border-tegra-gray-medium transition hover:bg-tegra-blue-light/40 focus:bg-tegra-blue-light/40 focus:outline-none focus:ring-2 focus:ring-tegra-teal"
                            onClick={() => openDetail(r)}
                            onKeyDown={(e) => handleRowKeyDown(e, r)}
                          >
                            <td className={`${tdClass} font-medium`}>
                              {r.protocolo_portal || "—"}
                            </td>
                            <td className={tdClass}>{r.nome_exibicao || "—"}</td>
                            <td className={tdClass}>{r.tipo_cliente || "—"}</td>
                            <td className={tdClass}>
                              {r.quantidade_produtos ?? "—"}
                            </td>
                            <td className={tdClass}>{r.consultor ?? "—"}</td>
                            <td className={tdClass}>{r.gerente ?? "—"}</td>
                            <td
                              className={`${tdClass} whitespace-nowrap text-tegra-text-secondary`}
                            >
                              {formatDate(r.created_at)}
                            </td>
                          </tr>
                        ))}
                      {tipo === "ocorrencia" &&
                        rows.map((r) => (
                          <tr
                            key={r.id || `${r.protocolo_portal}-${r.created_at}`}
                            tabIndex={0}
                            role="button"
                            aria-label={
                              r.protocolo_portal
                                ? `Abrir detalhes do protocolo ${r.protocolo_portal}`
                                : "Abrir detalhes do registro"
                            }
                            className="cursor-pointer border-b border-tegra-gray-medium transition hover:bg-tegra-blue-light/40 focus:bg-tegra-blue-light/40 focus:outline-none focus:ring-2 focus:ring-tegra-teal"
                            onClick={() => openDetail(r)}
                            onKeyDown={(e) => handleRowKeyDown(e, r)}
                          >
                            <td className={`${tdClass} font-medium`}>
                              {r.protocolo_portal || "—"}
                            </td>
                            <td className={tdClass}>{r.nome_completo || "—"}</td>
                            <td className={tdClass}>{r.numero_pedido || "—"}</td>
                            <td className={tdClass}>{r.status || "—"}</td>
                            <td className={tdClass}>{r.consultor ?? "—"}</td>
                            <td className={tdClass}>{r.gerente ?? "—"}</td>
                            <td
                              className={`${tdClass} whitespace-nowrap text-tegra-text-secondary`}
                            >
                              {formatDate(r.created_at)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {rows.length > 0 && (
                <div className="flex flex-col items-stretch justify-between gap-3 border-t border-tegra-gray-medium px-3 py-3 sm:flex-row sm:items-center sm:px-6 sm:py-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-tegra-blue-dark sm:text-sm">
                    <span>
                      Página {pagination.page} de {totalPages}
                    </span>
                    <label className="flex items-center gap-2">
                      <span className="text-tegra-text-secondary">Itens por página</span>
                      <select
                        className="rounded border border-tegra-gray-medium bg-white px-2 py-1 text-sm text-tegra-text-primary focus:outline-none focus:ring-2 focus:ring-tegra-teal"
                        value={perPage}
                        onChange={(e) => {
                          setPerPage(Number(e.target.value));
                        }}
                      >
                        {PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex justify-center gap-1 sm:justify-end sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Primeira página"
                    >
                      <MdFirstPage className="text-lg sm:text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Página anterior"
                    >
                      <MdChevronLeft className="text-lg sm:text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
                      aria-label="Próxima página"
                    >
                      <MdChevronRight className="text-lg sm:text-xl" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="rounded border-2 border-tegra-blue-dark p-1.5 text-tegra-blue-dark transition hover:bg-tegra-blue-light disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1"
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
