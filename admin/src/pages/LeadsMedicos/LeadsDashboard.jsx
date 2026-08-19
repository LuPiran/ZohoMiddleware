import { useState } from "react";
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
import { MdTrendingUp, MdExpandMore, MdExpandLess } from "react-icons/md";
import { getLeadStatusColor } from "./leadStatus";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-tegra-gray-medium bg-white px-3 py-2 shadow-md text-xs sm:text-sm">
      {label && (
        <p className="font-medium text-tegra-text-primary mb-1">{label}</p>
      )}
      {payload.map((entry) => (
        <p key={entry.name} className="text-tegra-text-secondary">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          {entry.name}:{" "}
          <span className="font-semibold text-tegra-text-primary">
            {entry.value}{entry.unit || ""}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── Wrapper accordion só no mobile ── */
function AccordionCard({ id, openId, onToggle, title, subtitle, badge, children }) {
  const open = openId === id;

  return (
    <div className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden">
      {/* Header clicável — só mobile */}
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="sm:hidden w-full flex items-center justify-between px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-tegra-blue-dark truncate">{title}</span>
          {badge !== undefined && (
            <span className="shrink-0 rounded-full bg-tegra-blue-dark/10 px-2 py-0.5 text-[11px] font-bold text-tegra-blue-dark tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {subtitle && !open && (
            <span className="text-xs text-tegra-text-secondary">{subtitle}</span>
          )}
          {open
            ? <MdExpandLess className="text-lg text-tegra-text-secondary" />
            : <MdExpandMore className="text-lg text-tegra-text-secondary" />}
        </div>
      </button>

      {/* Conteúdo: sempre visível no desktop, toggle no mobile */}
      <div className={`sm:block ${open ? "block" : "hidden"}`}>
        <div className="hidden sm:flex items-baseline justify-between gap-3 px-5 pt-5 pb-0">
          <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary">{title}</h2>
          {subtitle && <span className="text-xs text-tegra-text-secondary">{subtitle}</span>}
        </div>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard operacional de leads: série mensal, distribuição por status e conversão.
 * Mobile: accordion — um gráfico de cada vez.
 * Desktop (sm+): grid original de 3 colunas.
 */
export default function LeadsDashboard({
  monthlyData,
  statusData,
  conversionRate,
  totalLeads,
  convertedCount,
}) {
  const totalMensal = monthlyData?.reduce((s, d) => s + (d.total || 0), 0) ?? 0;
  // Accordion: só um aberto por vez; "mensal" aberto por padrão
  const [openId, setOpenId] = useState("mensal");
  const handleToggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <section
      aria-label="Indicadores de leads médicos"
      className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-5 mb-6 sm:mb-8"
    >
      {/* ── Leads por mês ── */}
      <div className="xl:col-span-5">
        <AccordionCard
          id="mensal"
          openId={openId}
          onToggle={handleToggle}
          title="Leads por mês"
          subtitle="Criação · últimos períodos"
          badge={totalMensal || undefined}
        >
          <div className="h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="leadsMonthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a2f5b" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#1a2f5b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#666666", fontSize: 12 }}
                  axisLine={{ stroke: "#e0e0e0" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#666666", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Leads"
                  stroke="#1a2f5b"
                  strokeWidth={2.25}
                  fill="url(#leadsMonthFill)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AccordionCard>
      </div>

      {/* ── Por status ── */}
      <div className="xl:col-span-4">
        <AccordionCard
          id="status"
          openId={openId}
          onToggle={handleToggle}
          title="Por status"
          subtitle="Distribuição"
          badge={statusData?.length || undefined}
        >
          <div className="h-52 sm:h-64 flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:w-1/2 h-40 sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={getLeadStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full sm:w-1/2 space-y-2 text-sm">
              {statusData.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center justify-between gap-2 text-tegra-text-secondary"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getLeadStatusColor(entry.name) }}
                    />
                    <span className="truncate">{entry.name}</span>
                  </span>
                  <span className="font-semibold text-tegra-text-primary tabular-nums">
                    {entry.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </AccordionCard>
      </div>

      {/* ── Conversão ── */}
      <div className="xl:col-span-3">
        <AccordionCard
          id="conversao"
          openId={openId}
          onToggle={handleToggle}
          title="Conversão"
          subtitle="Leads convertidos sobre o total"
          badge={`${conversionRate}%`}
        >
          <div className="flex flex-col justify-between h-52 sm:h-64">
            <p className="text-4xl sm:text-5xl font-bold text-tegra-blue-dark tabular-nums tracking-tight mt-2">
              {conversionRate}
              <span className="text-2xl sm:text-3xl font-semibold ml-0.5">%</span>
            </p>
            <div>
              <p className="mb-3 text-sm text-tegra-text-secondary flex items-center gap-1.5">
                <MdTrendingUp className="text-tegra-success text-lg shrink-0" aria-hidden />
                {convertedCount} de {totalLeads} leads convertidos
              </p>
              <div
                className="h-2 rounded-full bg-tegra-gray-medium overflow-hidden"
                role="progressbar"
                aria-valuenow={conversionRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Taxa de conversão"
              >
                <div
                  className="h-full rounded-full bg-tegra-success transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.min(conversionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </AccordionCard>
      </div>
    </section>
  );
}
