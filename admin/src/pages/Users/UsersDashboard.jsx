import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-tegra-gray-medium bg-white px-3 py-2 shadow-md text-xs sm:text-sm">
      {label && <p className="font-medium text-tegra-text-primary mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-tegra-text-secondary">
          {entry.name}:{" "}
          <span className="font-semibold text-tegra-text-primary">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function AccordionCard({ id, openId, onToggle, title, subtitle, badge, children }) {
  const open = openId === id;
  return (
    <div className="h-full bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="sm:hidden w-full flex items-center justify-between px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-tegra-blue-dark truncate">{title}</span>
        <span className="flex items-center gap-2">
          {badge !== undefined && (
            <span className="rounded-full bg-tegra-blue-dark/10 px-2 py-0.5 text-[11px] font-bold text-tegra-blue-dark tabular-nums">
              {badge}
            </span>
          )}
          {open ? <MdExpandLess className="text-lg" /> : <MdExpandMore className="text-lg" />}
        </span>
      </button>
      <div className={`flex-1 flex flex-col sm:flex ${open ? "flex" : "hidden"}`}>
        <div className="hidden sm:flex items-baseline justify-between gap-2 px-5 pt-5">
          <h2 className="text-base font-semibold text-tegra-text-primary">{title}</h2>
          {subtitle && <span className="text-xs text-tegra-text-secondary text-right">{subtitle}</span>}
        </div>
        <div className="flex-1 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4">{children}</div>
      </div>
    </div>
  );
}

function ColumnChart({ data, color }) {
  if (!data.length) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-tegra-text-secondary">
        Nenhum usuário para este recorte.
      </p>
    );
  }
  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
          <XAxis
            dataKey="name"
            interval={0}
            angle={-28}
            textAnchor="end"
            height={56}
            tick={{ fill: "#666666", fontSize: 11 }}
            axisLine={{ stroke: "#e0e0e0" }}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fill: "#666666", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="total" name="Usuários" fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function UsersDashboard({ perfilData, gerenciaData, regiaoData }) {
  const [openId, setOpenId] = useState("perfil");
  const toggle = (id) => setOpenId((atual) => (atual === id ? null : id));

  return (
    <section aria-label="Indicadores de usuários" className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
      <AccordionCard
        id="perfil"
        openId={openId}
        onToggle={toggle}
        title="Usuários por perfil"
        subtitle="Consultor, gerência, gestão e admin"
        badge={perfilData.length || undefined}
      >
        <ColumnChart data={perfilData} color="#1a2f5b" />
      </AccordionCard>
      <AccordionCard
        id="gerencia"
        openId={openId}
        onToggle={toggle}
        title="Usuários por gerência"
        subtitle="Distribuição das equipes"
        badge={gerenciaData.length || undefined}
      >
        <ColumnChart data={gerenciaData} color="#4d6fa9" />
      </AccordionCard>
      <AccordionCard
        id="regiao"
        openId={openId}
        onToggle={toggle}
        title="Usuários por região"
        subtitle="Cobertura comercial"
        badge={regiaoData.length || undefined}
      >
        <ColumnChart data={regiaoData} color="#8FA9C1" />
      </AccordionCard>
    </section>
  );
}
