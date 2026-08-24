import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  MdSearch,
  MdFilterList,
  MdVisibility,
  MdFileDownload,
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
  MdRefresh,
} from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";
import LeadsDashboard from "./LeadsDashboard";
import LeadsFilterSidebar from "./LeadsFilterSidebar";
import { leadsMedicosService } from "../../services/leadsMedicos";
import {
  aggregateLeadsByMonth,
  aggregateLeadsByStatus,
  computeConversionRate,
} from "./mockLeads";
import {
  canonicalizeLeadStatus,
  getLeadStatusMeta,
  isConvertedLeadStatus,
} from "./leadStatus";

const PER_PAGE = 10;

const EMPTY_FILTERS = {
  statuses: [],
  periodoRapido: "",
  criadoDe: "",
  criadoAte: "",
  entradaDe: "",
  entradaAte: "",
  consultor: "",
};

function StatusBadge({ status }) {
  const label = canonicalizeLeadStatus(status) || status || "—";
  const style = getLeadStatusMeta(label);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
      style={{
        color: style.color,
        backgroundColor: style.soft,
        boxShadow: `inset 0 0 0 1px ${style.color}33`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: style.chart || style.color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function toDateOnly(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function matchesDateRange(isoDate, from, to) {
  if (!from && !to) return true;
  if (!isoDate) return false;
  const current = toDateOnly(isoDate);
  if (Number.isNaN(current.getTime())) return false;
  if (from && current < toDateOnly(from)) return false;
  if (to && current > toDateOnly(to)) return false;
  return true;
}

function countActiveFilters(filters) {
  return (
    filters.statuses.length +
    (filters.periodoRapido
      ? 1
      : [filters.criadoDe, filters.criadoAte].filter(Boolean).length) +
    [filters.entradaDe, filters.entradaAte].filter(Boolean).length +
    (filters.consultor ? 1 : 0)
  );
}

function shortId(id) {
  if (!id) return "—";
  const value = String(id);
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

/**
 * THESIS: Leads médicos como superfície operacional Tegra — leitura rápida de volume, status e conversão, depois ação na lista.
 * OWN-WORLD: tokens tegra-*, painéis com borda cinza suave, gráficos Recharts em azul-escuro/teal/rosa da marca, sidebar de filtro à direita.
 * STORY: o consultor entende o funil, filtra a lista e executa Visualizar/Importar por lead.
 * FIRST VIEWPORT: título + dashboards (mês / pizza / conversão); abaixo toolbar busca+filtro e tabela paginada.
 * FORM: extensão Operate do shell MainLayout existente (sem novo mundo visual).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export default function LeadsMedicos() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [role, setRole] = useState("consultor");
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const isGerente = role === "gerente" || role === "admin";

  const loadLeads = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await leadsMedicosService.list();
      setLeads(result.data);
      setRole(result.role || "consultor");
      setViewer(result.viewer || null);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Não foi possível carregar os leads médicos.";
      setLoadError(message);
      setLeads([]);
      showToast(message, "error", 3500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lista de consultores únicos para o filtro do gerente
  const consultores = useMemo(
    () =>
      [...new Set(leads.map((l) => l.consultor).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !query ||
        String(lead.id || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.nome || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.email || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.especialidade || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.cidade || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.uf || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.origem || "")
          .toLowerCase()
          .includes(query) ||
        String(lead.consultor || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        appliedFilters.statuses.length === 0 ||
        appliedFilters.statuses.includes(canonicalizeLeadStatus(lead.status));

      const matchesCriado = matchesDateRange(
        lead.criadoEm,
        appliedFilters.criadoDe,
        appliedFilters.criadoAte,
      );

      const matchesEntrada = matchesDateRange(
        lead.entradaEm,
        appliedFilters.entradaDe,
        appliedFilters.entradaAte,
      );

      const matchesConsultor =
        !appliedFilters.consultor ||
        String(lead.consultor || "").toLowerCase() ===
          appliedFilters.consultor.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCriado &&
        matchesEntrada &&
        matchesConsultor
      );
    });
  }, [leads, searchTerm, appliedFilters]);

  const monthlyData = useMemo(
    () => aggregateLeadsByMonth(filteredLeads),
    [filteredLeads],
  );
  const statusData = useMemo(
    () => aggregateLeadsByStatus(filteredLeads),
    [filteredLeads],
  );
  const conversionRate = useMemo(
    () => computeConversionRate(filteredLeads),
    [filteredLeads],
  );
  const convertedCount = useMemo(
    () =>
      filteredLeads.filter((lead) => {
        return isConvertedLeadStatus(lead.status);
      }).length,
    [filteredLeads],
  );

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PER_PAGE;
  const pageLeads = filteredLeads.slice(pageStart, pageStart + PER_PAGE);
  const activeFilterCount = countActiveFilters(appliedFilters);

  const runSearch = () => {
    setSearchTerm(draftSearch);
    setCurrentPage(1);
  };

  const openFilters = () => {
    setDraftFilters(appliedFilters);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setCurrentPage(1);
    setFilterOpen(false);
    showToast("Filtros aplicados", "success", 1800);
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    setFilterOpen(false);
    showToast("Filtros limpos", "success", 1800);
  };

  const handleView = (lead) => {
    navigate(`${ROUTES.LEADS_MEDICOS}/${lead.id}`);
  };

  const handleImport = (lead) => {
    showToast(`Importação iniciada: ${lead.nome}`, "success", 2200);
  };

  const exportToXLSX = () => {
    if (filteredLeads.length === 0) {
      showToast("Nenhum lead para exportar.", "error", 2200);
      return;
    }

    const formatDateXLSX = (isoDate) => {
      if (!isoDate) return "";
      const d = new Date(isoDate);
      if (Number.isNaN(d.getTime())) return isoDate;
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const rows = filteredLeads.map((lead) => ({
      ID: lead.id || "",
      Nome: lead.nome || "",
      "E-mail": lead.email || "",
      Telefone: lead.telefone || "",
      Celular: lead.celular || "",
      CRM: lead.crm || "",
      Especialidade: lead.especialidade || "",
      Cidade: lead.cidade || "",
      UF: lead.uf || "",
      Origem: lead.origem || "",
      Status: canonicalizeLeadStatus(lead.status) || lead.status || "",
      Consultor: lead.consultor || "",
      Gerência: lead.gerencia || lead.gerência || "",
      "Data de criação": formatDateXLSX(lead.criadoEm),
      "Data de entrada": formatDateXLSX(lead.entradaEm),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Largura das colunas
    worksheet["!cols"] = [
      { wch: 36 }, // ID
      { wch: 28 }, // Nome
      { wch: 30 }, // E-mail
      { wch: 16 }, // Telefone
      { wch: 16 }, // Celular
      { wch: 12 }, // CRM
      { wch: 22 }, // Especialidade
      { wch: 18 }, // Cidade
      { wch: 6  }, // UF
      { wch: 16 }, // Origem
      { wch: 22 }, // Status
      { wch: 24 }, // Consultor
      { wch: 20 }, // Gerência
      { wch: 16 }, // Data de criação
      { wch: 16 }, // Data de entrada
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Médicos");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `leads-medicos-${today}.xlsx`);

    showToast(
      `${filteredLeads.length} lead${filteredLeads.length > 1 ? "s" : ""} exportado${filteredLeads.length > 1 ? "s" : ""} com sucesso.`,
      "success",
      2500,
    );
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <header className="mb-5 sm:mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">
              Leads Médicos
            </h1>
            {role === "gerente" ? (
              <p className="mt-1 text-sm text-tegra-text-secondary max-w-2xl">
                Visão de equipe
                {viewer?.gerencia ? (
                  <> — gerência <span className="font-semibold text-tegra-blue-dark">{viewer.gerencia}</span></>
                ) : null}
                . Todos os leads dos seus consultores.
              </p>
            ) : role === "admin" ? (
              <p className="mt-1 text-sm text-tegra-text-secondary max-w-2xl">
                Visão administrador — todos os leads da plataforma.
              </p>
            ) : (
              <p className="mt-1 text-sm text-tegra-text-secondary max-w-2xl">
                Seus leads médicos atribuídos.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            title="Atualizar dados"
            aria-label="Atualizar dados"
            className="shrink-0 mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tegra-gray-medium text-tegra-text-secondary transition hover:bg-tegra-gray-light hover:text-tegra-blue-dark disabled:opacity-40"
          >
            <MdRefresh className={`text-xl ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        <LeadsDashboard
          monthlyData={monthlyData}
          statusData={statusData}
          conversionRate={conversionRate}
          totalLeads={filteredLeads.length}
          convertedCount={convertedCount}
        />

        <section
          aria-label="Lista de leads médicos"
          className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
        >
          <div className="px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-b border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <Input
                type="search"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="Buscar por ID, nome, e-mail, especialidade..."
                icon={<MdSearch className="text-xl" />}
                iconRight={<MdSearch className="text-xl" />}
                onIconClick={(e) => {
                  e.preventDefault();
                  runSearch();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                aria-label="Buscar leads"
              />
            </div>

            <button
              type="button"
              onClick={openFilters}
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

            {/* Exportar XLSX */}
            <button
              type="button"
              onClick={exportToXLSX}
              disabled={loading || filteredLeads.length === 0}
              title={
                filteredLeads.length === 0
                  ? "Nenhum lead para exportar"
                  : `Exportar ${filteredLeads.length} lead${filteredLeads.length > 1 ? "s" : ""} para Excel`
              }
              aria-label="Exportar para Excel"
              className="relative inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 border-2 border-emerald-600 rounded-lg text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MdFileDownload className="text-xl" aria-hidden />
              <span className="text-sm font-medium">Exportar</span>
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-14 text-center">
              <p className="text-tegra-text-primary font-medium">
                Carregando leads…
              </p>
              <p className="mt-1 text-sm text-tegra-text-secondary">
                Buscando no Dynamo conforme seu perfil.
              </p>
            </div>
          ) : loadError ? (
            <div className="px-4 py-14 text-center">
              <p className="text-tegra-text-primary font-medium">
                Não foi possível carregar
              </p>
              <p className="mt-1 text-sm text-tegra-text-secondary max-w-md mx-auto">
                {loadError}
              </p>
              <Button className="mt-4" onClick={loadLeads}>
                Tentar novamente
              </Button>
            </div>
          ) : pageLeads.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="text-tegra-text-primary font-medium">
                Nenhum lead encontrado
              </p>
              <p className="mt-1 text-sm text-tegra-text-secondary">
                {leads.length === 0
                  ? "Ainda não há leads associados ao seu perfil."
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
                {pageLeads.map((lead) => (
                  <article key={lead.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="text-xs font-medium text-tegra-text-secondary tabular-nums"
                          title={lead.id}
                        >
                          {shortId(lead.id)}
                        </p>
                        <h3 className="text-sm font-semibold text-tegra-text-primary truncate">
                          {lead.nome || "—"}
                        </h3>
                        <p className="text-xs text-tegra-text-secondary truncate">
                          {lead.email || "—"}
                        </p>
                        {isGerente && lead.consultor && (
                          <p className="text-xs font-medium text-tegra-blue-dark/80 truncate mt-0.5">
                            👤 {lead.consultor}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0">
                        <StatusBadge status={lead.status} />
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs text-tegra-text-secondary">
                      <div>
                        <dt>Criação</dt>
                        <dd className="text-tegra-text-primary font-medium">
                          {formatDate(lead.criadoEm)}
                        </dd>
                      </div>
                      <div>
                        <dt>Entrada</dt>
                        <dd className="text-tegra-text-primary font-medium">
                          {formatDate(lead.entradaEm)}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 inline-flex items-center justify-center gap-1.5"
                        onClick={() => handleView(lead)}
                      >
                        <MdVisibility aria-hidden />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 inline-flex items-center justify-center gap-1.5"
                        onClick={() => handleImport(lead)}
                      >
                        <MdFileDownload aria-hidden />
                        Importar
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-tegra-blue-dark text-tegra-text-inverse">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Nome
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        E-mail
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                      >
                        Data de criação
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                      >
                        Data de entrada
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold">
                        Status
                      </th>
                      {isGerente && (
                        <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                          Consultor
                        </th>
                      )}
                      <th
                        scope="col"
                        className="px-4 py-3 font-semibold text-right"
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-tegra-gray-medium">
                    {pageLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-tegra-gray-light/60 transition-colors"
                      >
                        <td
                          className="px-4 py-3 tabular-nums text-tegra-text-secondary whitespace-nowrap"
                          title={lead.id}
                        >
                          {shortId(lead.id)}
                        </td>
                        <td className="px-4 py-3 font-medium text-tegra-text-primary whitespace-nowrap">
                          {lead.nome || "—"}
                        </td>
                        <td className="px-4 py-3 text-tegra-text-secondary">
                          {lead.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-tegra-text-secondary whitespace-nowrap">
                          {formatDate(lead.criadoEm)}
                        </td>
                        <td className="px-4 py-3 text-tegra-text-secondary whitespace-nowrap">
                          {formatDate(lead.entradaEm)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={lead.status} />
                        </td>
                        {isGerente && (
                          <td className="px-4 py-3 text-tegra-text-secondary whitespace-nowrap">
                            {lead.consultor || "—"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleView(lead)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-tegra-gray-medium text-tegra-blue-dark hover:bg-tegra-gray-light transition cursor-pointer"
                              title="Visualizar"
                            >
                              <MdVisibility className="text-lg" aria-hidden />
                              <span className="sr-only lg:not-sr-only text-xs font-medium">
                                Visualizar
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleImport(lead)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-tegra-blue-dark text-white hover:bg-tegra-blue-light transition cursor-pointer"
                              title="Importar"
                            >
                              <MdFileDownload className="text-lg" aria-hidden />
                              <span className="sr-only lg:not-sr-only text-xs font-medium">
                                Importar
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-3 sm:px-4 md:px-5 py-3 border-t border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs sm:text-sm text-tegra-text-secondary">
                  Mostrando{" "}
                  <span className="font-medium text-tegra-text-primary">
                    {pageStart + 1}–{pageStart + pageLeads.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-tegra-text-primary">
                    {filteredLeads.length}
                  </span>{" "}
                  leads · {PER_PAGE} por página
                </p>

                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <PaginationButton
                    label="Primeira página"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    <MdFirstPage className="text-xl" />
                  </PaginationButton>
                  <PaginationButton
                    label="Página anterior"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <MdChevronLeft className="text-xl" />
                  </PaginationButton>
                  <span className="px-3 text-sm tabular-nums text-tegra-text-primary font-medium">
                    {safePage} / {totalPages}
                  </span>
                  <PaginationButton
                    label="Próxima página"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    <MdChevronRight className="text-xl" />
                  </PaginationButton>
                  <PaginationButton
                    label="Última página"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    <MdLastPage className="text-xl" />
                  </PaginationButton>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <LeadsFilterSidebar
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClear={clearFilters}
        role={role}
        consultores={consultores}
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
