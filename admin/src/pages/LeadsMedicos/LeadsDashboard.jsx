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
import { MdTrendingUp } from "react-icons/md";

const STATUS_COLORS = {
  "Novo Lead": "#8FA9C1",
  "Lead em Qualificação": "#E5989B",
  "Lead Com Interesse": "#3da2b8",
  "Lead Sem Contato": "#ff9800",
  "Lead Sem Interesse": "#f44336",
  "Lead Convertido": "#4caf50",
  Novo: "#8FA9C1",
  "Em contato": "#3da2b8",
  Qualificado: "#E5989B",
  Convertido: "#4caf50",
  Perdido: "#f44336",
};

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
            {entry.value}
            {entry.unit || ""}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Dashboard operacional de leads: série mensal, distribuição por status e conversão.
 */
export default function LeadsDashboard({
  monthlyData,
  statusData,
  conversionRate,
  totalLeads,
  convertedCount,
}) {
  return (
    <section
      aria-label="Indicadores de leads médicos"
      className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 mb-6 sm:mb-8"
    >
      <div className="xl:col-span-5 bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary">
            Leads por mês
          </h2>
          <span className="text-xs text-tegra-text-secondary">
            Criação · últimos períodos
          </span>
        </div>
        <div className="h-56 sm:h-64">
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
      </div>

      <div className="xl:col-span-4 bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary">
            Por status
          </h2>
          <span className="text-xs text-tegra-text-secondary">Distribuição</span>
        </div>
        <div className="h-56 sm:h-64 flex flex-col sm:flex-row items-center gap-2">
          <div className="w-full sm:w-1/2 h-44 sm:h-full">
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
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] || "#8FA9C1"}
                    />
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
                    style={{ backgroundColor: STATUS_COLORS[entry.name] }}
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
      </div>

      <div className="xl:col-span-3 bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-1">
            Conversão
          </h2>
          <p className="text-xs sm:text-sm text-tegra-text-secondary">
            Leads convertidos sobre o total filtrado
          </p>
        </div>

        <div className="my-6 sm:my-8">
          <p className="text-4xl sm:text-5xl font-bold text-tegra-blue-dark tabular-nums tracking-tight">
            {conversionRate}
            <span className="text-2xl sm:text-3xl font-semibold ml-0.5">%</span>
          </p>
          <p className="mt-2 text-sm text-tegra-text-secondary flex items-center gap-1.5">
            <MdTrendingUp className="text-tegra-success text-lg" aria-hidden />
            {convertedCount} de {totalLeads} leads
          </p>
        </div>

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
    </section>
  );
}
