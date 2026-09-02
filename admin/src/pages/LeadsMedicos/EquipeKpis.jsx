import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { MdArrowBack, MdFileDownload, MdRefresh } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";
import LeadsDashboard from "./LeadsDashboard";
import { leadsMedicosService } from "../../services/leadsMedicos";
import {
  aggregateLeadsByMonth,
  aggregateLeadsByStatus,
  computeConversionRate,
} from "./mockLeads";
import { isConvertedLeadStatus } from "./leadStatus";

function formatDateXLSX(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDias(value) {
  return typeof value === "number" ? `${value} dia${value === 1 ? "" : "s"}` : "—";
}

function formatPct(value) {
  return `${(value ?? 0).toFixed(1)}%`;
}

export default function EquipeKpis() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [kpis, setKpis] = useState(null);

  const loadKpis = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await leadsMedicosService.getEquipeKpis();
      if (!result.success || !result.data) {
        throw new Error("Não foi possível carregar os KPIs da equipe.");
      }
      setKpis(result.data);
    } catch (err) {
      if (err?.response?.status === 403) {
        showToast("Esta área é restrita a gerentes.", "error", 3500);
        navigate(ROUTES.LEADS_MEDICOS, { replace: true });
        return;
      }
      const message =
        err?.response?.data?.error || err?.message || "Erro ao carregar KPIs da equipe";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leads = useMemo(() => kpis?.leads || [], [kpis]);
  const porConsultor = kpis?.porConsultor || [];
  const resumo = kpis?.resumo || null;

  const monthlyData = useMemo(() => aggregateLeadsByMonth(leads), [leads]);
  const statusData = useMemo(() => aggregateLeadsByStatus(leads), [leads]);
  const conversionRate = useMemo(() => computeConversionRate(leads), [leads]);
  const convertedCount = useMemo(
    () => leads.filter((lead) => isConvertedLeadStatus(lead.status)).length,
    [leads],
  );

  const exportRelatorio = () => {
    if (!kpis) return;

    // Aba 1 — Resumo por consultor
    const resumoRows = porConsultor.map((c) => ({
      Consultor: c.nome,
      "Total de leads": c.totalLeads,
      Convertidos: c.convertidos,
      "Taxa de conversão": formatPct(c.taxaConversao),
      Rejeitados: c.rejeitados,
      "Taxa de rejeição": formatPct(c.taxaRejeicao),
      "  — Recusados pelo consultor": c.recusados,
      "  — Por timeout (48h)": c.expirados,
      "Sem tratativa": c.semTratativa,
      "Encaminhados MKT": c.encaminhadosMkt,
      "Taxa sem tratativa": formatPct(c.taxaSemTratativa),
      "Sem interesse": c.semInteresse,
      "Sem contato": c.semContato,
      "Tentativas tratadas": c.tentativasTratadas,
      Agendamentos: c.agendamentos,
      "Compras vinculadas": c.comprasVinculadas,
      "Dias médio até 1ª tentativa": c.diasMedioAte1aTentativa ?? "—",
      "Dias médio até conversão": c.diasMedioAteConversao ?? "—",
      "Dias médio até aceite": c.diasMedioAteAceite ?? "—",
    }));

    // Aba 2 — Leads detalhado
    const leadsRows = leads.map((lead) => ({
      ID: lead.id || "",
      Nome: lead.nome || "",
      "E-mail": lead.email || "",
      Celular: lead.celular || "",
      "Número de registro": lead.numeroRegistro || "",
      Especialidade: lead.especialidade || "",
      Cidade: lead.cidade || "",
      UF: lead.uf || lead.estado || "",
      Origem: lead.origem || "",
      Status: lead.status || "",
      Consultor: lead.consultor || "",
      Gerência: lead.gerencia || "",
      "Rodada atual": lead.attempt?.currentRound ?? "—",
      Agendamentos: Array.isArray(lead.agendamentos) ? lead.agendamentos.length : 0,
      "Compras vinculadas": Array.isArray(lead.comprasVinculadas)
        ? lead.comprasVinculadas.length
        : 0,
      "Data de criação": formatDateXLSX(lead.criadoEm),
    }));

    // Aba 3 — Ações (histórico), consultor × tipo de ação
    const acaoKeys = Object.keys(kpis.acoesGeral || {}).sort();
    const acoesRows = porConsultor.map((c) => {
      const row = { Consultor: c.nome };
      for (const key of acaoKeys) {
        row[key] = c.acoes?.[key] || 0;
      }
      return row;
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(resumoRows),
      "Resumo por consultor",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(leadsRows),
      "Leads detalhado",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(acoesRows),
      "Ações",
    );

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `kpis-equipe-${today}.xlsx`);
    showToast("Relatório da equipe exportado com sucesso.", "success", 2500);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 text-center text-tegra-text-secondary">
          Carregando KPIs da equipe...
        </div>
      </MainLayout>
    );
  }

  if (loadError && !kpis) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10">
          <p className="text-tegra-error mb-4">{loadError}</p>
          <Button variant="secondary" onClick={() => navigate(ROUTES.LEADS_MEDICOS)}>
            <MdArrowBack className="mr-1.5" aria-hidden />
            Voltar pra Leads Médicos
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.LEADS_MEDICOS)}
              className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-tegra-text-secondary hover:text-tegra-blue-dark transition"
            >
              <MdArrowBack aria-hidden />
              Leads Médicos
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">
              KPIs da equipe
            </h1>
            <p className="mt-1 text-sm text-tegra-text-secondary max-w-2xl">
              {kpis?.gerencia ? (
                <>
                  Gerência <span className="font-semibold text-tegra-blue-dark">{kpis.gerencia}</span> — {resumo?.consultores || 0} consultor{resumo?.consultores === 1 ? "" : "es"}.
                </>
              ) : (
                "Desempenho consolidado da sua equipe."
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="inline-flex items-center gap-1.5"
              onClick={exportRelatorio}
            >
              <MdFileDownload className="text-lg" aria-hidden />
              Exportar relatório
            </Button>
            <button
              type="button"
              onClick={loadKpis}
              disabled={loading}
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tegra-gray-medium text-tegra-text-secondary transition hover:bg-tegra-gray-light hover:text-tegra-blue-dark disabled:opacity-40"
            >
              <MdRefresh className="text-xl" />
            </button>
          </div>
        </header>

        <LeadsDashboard
          monthlyData={monthlyData}
          statusData={statusData}
          conversionRate={conversionRate}
          totalLeads={leads.length}
          convertedCount={convertedCount}
        />

        <section
          aria-label="KPIs por consultor"
          className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-tegra-gray-medium">
            <h2 className="text-base font-bold text-tegra-blue-dark">Por consultor</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-tegra-blue-dark text-tegra-text-inverse">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">Consultor</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Convertidos</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Conversão</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap" title="Consultor clicou em Recusar">Recusas</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap" title="Prazo de 48h venceu sem resposta">Timeout 48h</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Sem tratativa</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap" title="Encaminhado ao Marketing, sem compra">Enc. MKT</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Tentativas</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Agendamentos</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Compras</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Até 1ª tentativa</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Até conversão</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right whitespace-nowrap">Até aceite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tegra-gray-medium">
                {porConsultor.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-6 text-center text-tegra-text-secondary">
                      Nenhum lead encontrado pra essa equipe ainda.
                    </td>
                  </tr>
                ) : (
                  porConsultor.map((c) => (
                    <tr key={c.id || c.nome} className="hover:bg-tegra-gray-light/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-tegra-text-primary whitespace-nowrap">{c.nome}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.totalLeads}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.convertidos}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatPct(c.taxaConversao)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.recusados}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.expirados}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.semTratativa}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.encaminhadosMkt}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.tentativasTratadas}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.agendamentos}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.comprasVinculadas}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatDias(c.diasMedioAte1aTentativa)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatDias(c.diasMedioAteConversao)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatDias(c.diasMedioAteAceite)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-tegra-text-light">
          "Até aceite", "Compras vinculadas" e a separação "Recusas" × "Timeout 48h" só existem pra leads ofertados/rejeitados a partir desta atualização — leads antigos aparecem como "—", 0, ou não entram em nenhum dos dois baldes de rejeição (mesmo contando no total de leads).
        </p>
      </div>
    </MainLayout>
  );
}
