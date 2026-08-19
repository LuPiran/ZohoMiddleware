import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MdLocalShipping,
  MdLanguage,
  MdMedicalServices,
  MdShoppingCart,
  MdAssignment,
  MdDescription,
  MdReport,
  MdBookmarks,
  MdChevronRight,
  MdOpenInNew,
  MdWarningAmber,
  MdTrendingUp,
  MdCalendarToday,
  MdPeople,
} from "react-icons/md";
import { authService } from "../../services/auth";
import { useLoading } from "../../contexts/LoadingContext";
import MainLayout from "../../components/layout/MainLayout";
import { obterContagemFormulariosSalvos } from "../../services/savedForms";
import { leadsMedicosService } from "../../services/leadsMedicos";
import {
  aggregateLeadsByMonth,
  aggregateLeadsByStatus,
  computeConversionRate,
} from "../LeadsMedicos/mockLeads";
import {
  getLeadStatusColor,
  isConvertedLeadStatus,
} from "../LeadsMedicos/leadStatus";
import {
  EXTERNAL_LINKS,
  ROUTES,
  podeVerCompra,
  podeVerOcorrencia,
  podeVerProposta,
  podeVerRecompra,
  podeVerTrackingPedido,
} from "../../utils/constants";

/* ── Helpers ── */
function getSaudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getDataFormatada() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Tooltip dos gráficos ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      {label && <p className="font-medium text-slate-700 mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-slate-500">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          {entry.name}:{" "}
          <span className="font-semibold text-slate-800">
            {entry.value}
            {entry.unit || ""}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ icon: Icon, label, value, sub, iconBg, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500 leading-snug">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="text-lg" aria-hidden />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <p className="mt-3 text-3xl font-bold text-slate-800 tabular-nums leading-none">
          {value}
        </p>
      )}
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/* ── Card de atalho ── */
function ActionCard({ icon: Icon, label, description, onClick, variant, badge, external }) {
  const isAmber = variant === "amber";
  const isTeal = variant === "teal";

  const iconBg = isAmber
    ? "bg-amber-100 text-amber-700"
    : isTeal
      ? "bg-teal-100 text-teal-700"
      : "bg-[#1a2f5b]/8 text-[#1a2f5b]";

  const chevronColor = isAmber
    ? "text-amber-300 group-hover:text-amber-600"
    : isTeal
      ? "text-teal-300 group-hover:text-teal-600"
      : "text-slate-300 group-hover:text-[#1a2f5b]";

  const borderHover = isAmber
    ? "hover:border-amber-300"
    : isTeal
      ? "hover:border-teal-300"
      : "hover:border-[#1a2f5b]/25";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={external ? `Abrir ${label} em nova aba` : `Ir para ${label}`}
      className={`group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${borderHover} focus:outline-none focus:ring-2 focus:ring-[#1a2f5b]/30`}
    >
      {badge > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="text-[1.1rem]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{description}</p>
        )}
      </div>
      {external ? (
        <MdOpenInNew className={`shrink-0 text-base transition-colors ${chevronColor}`} aria-hidden />
      ) : (
        <MdChevronRight className={`shrink-0 text-lg transition-colors ${chevronColor}`} aria-hidden />
      )}
    </button>
  );
}

/* ── Skeleton do gráfico ── */
function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-52 sm:h-60">
      <div className="w-full h-full animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const { setLoading } = useLoading();

  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [savedFormsCount, setSavedFormsCount] = useState(0);

  const mostrarCompra = podeVerCompra(user);
  const mostrarRecompra = podeVerRecompra(user);
  const mostrarProposta = podeVerProposta(user);
  const mostrarOcorrencia = podeVerOcorrencia(user);
  const mostrarTrackingPedido = podeVerTrackingPedido(user);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Busca paralela: leads + formulários salvos
    Promise.all([
      leadsMedicosService.list().then((r) => setLeads(r.data || [])).catch(() => {}),
      obterContagemFormulariosSalvos().then(setSavedFormsCount).catch(() => {}),
    ]).finally(() => {
      setLeadsLoading(false);
      setLoading(false);
    });
  }, [navigate, setLoading]);

  /* Dados derivados */
  const statusData = useMemo(() => aggregateLeadsByStatus(leads), [leads]);
  const monthlyData = useMemo(() => aggregateLeadsByMonth(leads), [leads]);
  const conversionRate = useMemo(() => computeConversionRate(leads), [leads]);
  const convertedCount = useMemo(
    () => leads.filter((l) => isConvertedLeadStatus(l.status)).length,
    [leads],
  );
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return leads.filter((l) => {
      const d = new Date(l.criadoEm);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [leads]);

  /* Identidade do usuário */
  const nomeUsuario =
    user?.nome || user?.Nome || user?.Name || user?.nome_completo || "Usuário";
  const primeiroNome = nomeUsuario.split(" ")[0];
  const emailUsuario = user?.email || user?.Email || "";

  const goTo = (r) => navigate(r);
  const openExt = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ── Saudação ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {getSaudacao()}, {primeiroNome}! 👋
            </p>
            {emailUsuario && (
              <p className="mt-1 text-sm text-slate-500">{emailUsuario}</p>
            )}
          </div>
          <p className="text-sm text-slate-400 capitalize shrink-0">{getDataFormatada()}</p>
        </div>

        {/* ── Alerta formulários pendentes ── */}
        {savedFormsCount > 0 && (
          <button
            type="button"
            onClick={() => goTo(ROUTES.SAVED_FORMS)}
            className="w-full flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <MdWarningAmber className="shrink-0 text-xl text-amber-600" aria-hidden />
            <p className="flex-1 text-sm font-medium text-amber-800">
              Você tem{" "}
              <span className="font-bold">
                {savedFormsCount} formulário{savedFormsCount > 1 ? "s" : ""}
              </span>{" "}
              salvo{savedFormsCount > 1 ? "s" : ""} aguardando envio.
            </p>
            <MdChevronRight className="shrink-0 text-amber-400" aria-hidden />
          </button>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={MdPeople}
            label="Total de leads"
            value={leadsLoading ? "—" : leads.length}
            sub="na sua carteira"
            iconBg="bg-[#1a2f5b]/8 text-[#1a2f5b]"
            loading={leadsLoading}
          />
          <KpiCard
            icon={MdTrendingUp}
            label="Taxa de conversão"
            value={leadsLoading ? "—" : `${conversionRate}%`}
            sub={leadsLoading ? "" : `${convertedCount} convertido${convertedCount !== 1 ? "s" : ""}`}
            iconBg="bg-emerald-100 text-emerald-700"
            loading={leadsLoading}
          />
          <KpiCard
            icon={MdCalendarToday}
            label="Criados este mês"
            value={leadsLoading ? "—" : thisMonthCount}
            sub="novos leads"
            iconBg="bg-blue-100 text-blue-700"
            loading={leadsLoading}
          />
          <KpiCard
            icon={MdBookmarks}
            label="Form. pendentes"
            value={savedFormsCount}
            sub="aguardando envio"
            iconBg={savedFormsCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}
          />
        </div>

        {/* ── Gráficos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Por status */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-0">
              <h2 className="text-base font-semibold text-slate-800">Por status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Distribuição dos seus leads</p>
            </div>
            <div className="px-4 pb-4 pt-3">
              {leadsLoading ? (
                <ChartSkeleton />
              ) : statusData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-slate-400">
                  Nenhum dado disponível
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 h-52 sm:h-60">
                  {/* Donut */}
                  <div className="w-full sm:w-1/2 h-44 sm:h-full shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={76}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {statusData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={getLeadStatusColor(entry.name)}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legenda */}
                  <ul className="w-full sm:w-1/2 space-y-2 text-sm overflow-y-auto max-h-44 sm:max-h-full pr-1">
                    {statusData.map((entry) => (
                      <li
                        key={entry.name}
                        className="flex items-center justify-between gap-2 text-slate-500"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: getLeadStatusColor(entry.name) }}
                          />
                          <span className="truncate text-xs">{entry.name}</span>
                        </span>
                        <span className="font-semibold text-slate-700 tabular-nums shrink-0">
                          {entry.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Leads por mês */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-0">
              <h2 className="text-base font-semibold text-slate-800">Leads por mês</h2>
              <p className="text-xs text-slate-400 mt-0.5">Criação nos últimos períodos</p>
            </div>
            <div className="px-4 pb-4 pt-3 h-52 sm:h-[calc(100%-72px)]">
              {leadsLoading ? (
                <ChartSkeleton />
              ) : monthlyData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashMonthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a2f5b" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#1a2f5b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Leads"
                      stroke="#1a2f5b"
                      strokeWidth={2}
                      fill="url(#dashMonthFill)"
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Acesso rápido ── */}
        <div>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

            {/* Principal */}
            <ActionCard
              icon={MdMedicalServices}
              label="Leads Médicos"
              description="Gerencie e acompanhe seus leads"
              onClick={() => goTo(ROUTES.LEADS_MEDICOS)}
            />

            {/* Comercial */}
            {mostrarCompra && (
              <ActionCard
                icon={MdAssignment}
                label="Compra"
                description="Registrar nova compra"
                onClick={() => goTo(ROUTES.COMPRA)}
              />
            )}
            {mostrarRecompra && (
              <ActionCard
                icon={MdShoppingCart}
                label="Recompra"
                description="Registrar recompra de produto"
                onClick={() => goTo(ROUTES.RECOMPRA)}
              />
            )}
            {mostrarProposta && (
              <ActionCard
                icon={MdDescription}
                label="Proposta"
                description="Criar e enviar proposta"
                onClick={() => goTo(ROUTES.PROPOSTA)}
              />
            )}

            {/* Externo */}
            <ActionCard
              icon={MdLanguage}
              label="Central Comercial"
              description="Acesse o portal de vendas"
              onClick={() => openExt(EXTERNAL_LINKS.CENTRAL_CONSULTOR)}
              variant="amber"
              external
            />
            {mostrarTrackingPedido && (
              <ActionCard
                icon={MdLocalShipping}
                label="Rastreamento"
                description="Rastreie pedidos enviados"
                onClick={() => openExt(EXTERNAL_LINKS.TRACKING_PEDIDO)}
                variant="teal"
                external
              />
            )}

            {/* Suporte */}
            {mostrarOcorrencia && (
              <ActionCard
                icon={MdReport}
                label="Ocorrência"
                description="Registrar ou acompanhar ocorrências"
                onClick={() => goTo(ROUTES.OCORRENCIA)}
              />
            )}
            <ActionCard
              icon={MdBookmarks}
              label="Formulários Salvos"
              description={
                savedFormsCount > 0
                  ? `${savedFormsCount} formulário${savedFormsCount > 1 ? "s" : ""} pendente${savedFormsCount > 1 ? "s" : ""}`
                  : "Formulários salvos localmente"
              }
              onClick={() => goTo(ROUTES.SAVED_FORMS)}
              badge={savedFormsCount}
            />
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
