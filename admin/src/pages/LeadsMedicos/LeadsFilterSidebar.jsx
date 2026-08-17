import { useEffect, useId, useRef } from "react";
import {
  MdClose,
  MdFilterList,
  MdCalendarMonth,
  MdOutlineEventAvailable,
  MdMedicalServices,
  MdPlace,
  MdCampaign,
  MdFlag,
  MdFileDownload,
  MdBolt,
} from "react-icons/md";
import DatePicker from "../../components/ui/date-picker";
import {
  DATE_PRESETS,
  LEAD_ORIGINS,
  LEAD_PRIORITIES,
  LEAD_SPECIALTIES,
  LEAD_STATUSES,
  LEAD_UFS,
  getPresetDateRange,
} from "./mockLeads";

const STATUS_META = {
  "Novo Lead": {
    color: "#8FA9C1",
    soft: "rgba(143, 169, 193, 0.16)",
  },
  "Lead em Qualificação": {
    color: "#E5989B",
    soft: "rgba(229, 152, 155, 0.16)",
  },
  "Lead Com Interesse": {
    color: "#3da2b8",
    soft: "rgba(61, 162, 184, 0.14)",
  },
  "Lead Sem Contato": {
    color: "#ff9800",
    soft: "rgba(255, 152, 0, 0.14)",
  },
  "Lead Sem Interesse": {
    color: "#f44336",
    soft: "rgba(244, 67, 54, 0.12)",
  },
  "Lead Convertido": {
    color: "#4caf50",
    soft: "rgba(76, 175, 80, 0.14)",
  },
  Novo: {
    color: "#8FA9C1",
    soft: "rgba(143, 169, 193, 0.16)",
  },
  "Em contato": {
    color: "#3da2b8",
    soft: "rgba(61, 162, 184, 0.14)",
  },
  Qualificado: {
    color: "#E5989B",
    soft: "rgba(229, 152, 155, 0.16)",
  },
  Convertido: {
    color: "#4caf50",
    soft: "rgba(76, 175, 80, 0.14)",
  },
  Perdido: {
    color: "#f44336",
    soft: "rgba(244, 67, 54, 0.12)",
  },
};

const PRIORITY_META = {
  Alta: { color: "#f44336", soft: "rgba(244, 67, 54, 0.12)" },
  Média: { color: "#ff9800", soft: "rgba(255, 152, 0, 0.14)" },
  Baixa: { color: "#8FA9C1", soft: "rgba(143, 169, 193, 0.16)" },
};

function SectionHeader({ icon, title, hint, action }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tegra-bg-accent text-tegra-blue-dark">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-tegra-blue-dark">{title}</h3>
          {hint ? (
            <p className="text-[11px] text-tegra-text-secondary">{hint}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function ChipGroup({ options, selected, onToggle, metaMap }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const checked = selected.includes(option);
        const meta = metaMap?.[option];
        return (
          <button
            key={option}
            type="button"
            aria-pressed={checked}
            onClick={() => onToggle(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              checked
                ? "text-white shadow-[0_8px_16px_rgba(26,47,91,0.16)]"
                : "border border-tegra-blue-dark/10 bg-white text-tegra-text-primary hover:border-tegra-blue-dark/20 hover:bg-tegra-gray-light/70"
            }`}
            style={
              checked
                ? {
                    backgroundColor: meta?.color || "#1a2f5b",
                  }
                : undefined
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function toggleListValue(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function countActiveFilters(filters) {
  return (
    filters.statuses.length +
    filters.especialidades.length +
    filters.ufs.length +
    filters.origens.length +
    filters.prioridades.length +
    (filters.importado === "all" ? 0 : 1) +
    (filters.periodoRapido
      ? 1
      : [filters.criadoDe, filters.criadoAte].filter(Boolean).length) +
    [filters.entradaDe, filters.entradaAte].filter(Boolean).length
  );
}

/**
 * Sidebar de filtros — painel Tegra (glass, faixa de marca, chips).
 */
export default function LeadsFilterSidebar({
  open,
  onClose,
  filters,
  onChange,
  onApply,
  onClear,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector("button, input, select")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const setField = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const toggleStatus = (status) => {
    onChange({
      ...filters,
      statuses: toggleListValue(filters.statuses, status),
    });
  };

  const applyPreset = (presetId) => {
    const range = getPresetDateRange(presetId);
    onChange({
      ...filters,
      periodoRapido: presetId,
      criadoDe: range.de,
      criadoAte: range.ate,
    });
  };

  const activeCount = countActiveFilters(filters);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-tegra-blue-dark/40 backdrop-blur-[3px] cursor-pointer transition-opacity"
        aria-label="Fechar filtros"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="leads-filter-panel relative flex h-full w-full max-w-[26rem] flex-col overflow-hidden border-l border-white/50 bg-[linear-gradient(165deg,#ffffff_0%,#f7f9fc_48%,#f3f6fa_100%)] shadow-[-24px_0_64px_rgba(26,47,91,0.22)]"
      >
        <div
          className="h-1.5 w-full shrink-0 bg-gradient-to-r from-tegra-blue via-tegra-blue-green to-tegra-teal"
          aria-hidden
        />

        <header className="relative px-5 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top_right,rgba(143,169,193,0.22),transparent_62%)]" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-tegra-blue-dark to-tegra-blue text-white shadow-[0_10px_24px_rgba(26,47,91,0.28)]">
                <MdFilterList className="text-xl" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-lg font-bold tracking-tight text-tegra-blue-dark"
                >
                  Filtros
                </h2>
                <p className="mt-0.5 text-xs text-tegra-text-secondary">
                  Refine a lista de leads médicos
                  {activeCount > 0 ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-semibold text-tegra-blue-dark">
                        {activeCount} ativo{activeCount > 1 ? "s" : ""}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-tegra-blue-dark/10 bg-white/80 p-2 text-tegra-text-secondary shadow-sm transition hover:border-tegra-blue-dark/20 hover:bg-white hover:text-tegra-blue-dark cursor-pointer"
              aria-label="Fechar painel de filtros"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdBolt className="text-lg" aria-hidden />}
              title="Período rápido"
              hint="Atalhos para data de criação"
            />
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => {
                const active = filters.periodoRapido === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? "bg-tegra-blue-dark text-white shadow-[0_8px_16px_rgba(26,47,91,0.18)]"
                        : "border border-tegra-blue-dark/10 bg-white text-tegra-text-primary hover:bg-tegra-gray-light/70"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-tegra-blue-dark/55">
                Status
              </h3>
              {filters.statuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, statuses: [] })}
                  className="text-[11px] font-medium text-tegra-blue-green hover:text-tegra-blue-dark transition cursor-pointer"
                >
                  Limpar status
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {LEAD_STATUSES.map((status) => {
                const checked = filters.statuses.includes(status);
                const meta = STATUS_META[status];

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    aria-pressed={checked}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition duration-200 cursor-pointer ${
                      checked
                        ? "border-transparent shadow-[0_10px_24px_rgba(26,47,91,0.10)]"
                        : "border-tegra-blue-dark/8 bg-white/70 hover:border-tegra-blue-dark/16 hover:bg-white hover:shadow-[0_8px_18px_rgba(26,47,91,0.06)]"
                    }`}
                    style={
                      checked
                        ? {
                            background: `linear-gradient(135deg, ${meta.soft} 0%, #ffffff 72%)`,
                            boxShadow: `0 10px 24px rgba(26,47,91,0.08), inset 0 0 0 1.5px ${meta.color}55`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        checked
                          ? "border-transparent text-white"
                          : "border-tegra-blue-dark/20 bg-white text-transparent group-hover:border-tegra-blue-dark/35"
                      }`}
                      style={
                        checked ? { backgroundColor: meta.color } : undefined
                      }
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                      >
                        <path
                          d="M3.5 8.2 6.4 11l6.1-6.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>

                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden
                    />

                    <span
                      className={`flex-1 text-sm font-medium ${
                        checked
                          ? "text-tegra-blue-dark"
                          : "text-tegra-text-primary"
                      }`}
                    >
                      {status}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdMedicalServices className="text-lg" aria-hidden />}
              title="Especialidade"
              hint="Área de atuação do médico"
              action={
                filters.especialidades.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, especialidades: [] })}
                    className="text-[11px] font-medium text-tegra-blue-green hover:text-tegra-blue-dark transition cursor-pointer"
                  >
                    Limpar
                  </button>
                ) : null
              }
            />
            <ChipGroup
              options={LEAD_SPECIALTIES}
              selected={filters.especialidades}
              onToggle={(value) =>
                setField(
                  "especialidades",
                  toggleListValue(filters.especialidades, value),
                )
              }
            />
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdPlace className="text-lg" aria-hidden />}
              title="UF"
              hint="Estado de atuação"
              action={
                filters.ufs.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, ufs: [] })}
                    className="text-[11px] font-medium text-tegra-blue-green hover:text-tegra-blue-dark transition cursor-pointer"
                  >
                    Limpar
                  </button>
                ) : null
              }
            />
            <ChipGroup
              options={LEAD_UFS}
              selected={filters.ufs}
              onToggle={(value) =>
                setField("ufs", toggleListValue(filters.ufs, value))
              }
            />
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdCampaign className="text-lg" aria-hidden />}
              title="Origem"
              hint="Como o lead chegou"
              action={
                filters.origens.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange({ ...filters, origens: [] })}
                    className="text-[11px] font-medium text-tegra-blue-green hover:text-tegra-blue-dark transition cursor-pointer"
                  >
                    Limpar
                  </button>
                ) : null
              }
            />
            <ChipGroup
              options={LEAD_ORIGINS}
              selected={filters.origens}
              onToggle={(value) =>
                setField("origens", toggleListValue(filters.origens, value))
              }
            />
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdFlag className="text-lg" aria-hidden />}
              title="Prioridade"
              hint="Urgência de follow-up"
            />
            <ChipGroup
              options={LEAD_PRIORITIES}
              selected={filters.prioridades}
              onToggle={(value) =>
                setField(
                  "prioridades",
                  toggleListValue(filters.prioridades, value),
                )
              }
              metaMap={PRIORITY_META}
            />
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdFileDownload className="text-lg" aria-hidden />}
              title="Importação"
              hint="Leads já importados ou pendentes"
            />
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "all", label: "Todos" },
                { id: "yes", label: "Importados" },
                { id: "no", label: "Pendentes" },
              ].map((option) => {
                const active = filters.importado === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setField("importado", option.id)}
                    className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? "bg-tegra-blue-dark text-white shadow-[0_8px_16px_rgba(26,47,91,0.18)]"
                        : "border border-tegra-blue-dark/10 bg-white text-tegra-text-primary hover:bg-tegra-gray-light/70"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdCalendarMonth className="text-lg" aria-hidden />}
              title="Data de criação"
              hint="Quando o lead foi registrado"
            />
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="De"
                value={filters.criadoDe}
                onChange={(next) =>
                  onChange({
                    ...filters,
                    criadoDe: next,
                    periodoRapido: "",
                  })
                }
              />
              <DatePicker
                label="Até"
                value={filters.criadoAte}
                onChange={(next) =>
                  onChange({
                    ...filters,
                    criadoAte: next,
                    periodoRapido: "",
                  })
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-tegra-blue-dark/8 bg-white/75 p-4 shadow-[0_8px_22px_rgba(26,47,91,0.04)]">
            <SectionHeader
              icon={<MdOutlineEventAvailable className="text-lg" aria-hidden />}
              title="Data de entrada"
              hint="Quando entrou no funil ativo"
            />
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="De"
                value={filters.entradaDe}
                onChange={(next) => setField("entradaDe", next)}
              />
              <DatePicker
                label="Até"
                value={filters.entradaAte}
                onChange={(next) => setField("entradaAte", next)}
              />
            </div>
          </section>
        </div>

        <footer className="relative border-t border-tegra-blue-dark/8 bg-white/90 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClear}
              className="flex-1 rounded-xl border-2 border-tegra-blue-dark/80 bg-white px-4 py-2.5 text-sm font-semibold text-tegra-blue-dark transition hover:bg-tegra-blue-dark hover:text-white focus:outline-none focus:ring-2 focus:ring-tegra-blue focus:ring-offset-2 cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-[1.35] rounded-xl bg-gradient-to-r from-tegra-blue-dark via-[#2a4a7a] to-tegra-blue-green px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(26,47,91,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-tegra-blue-green focus:ring-offset-2 cursor-pointer"
            >
              Aplicar filtros
            </button>
          </div>
        </footer>
      </aside>

      <style>{`
        .leads-filter-panel {
          animation: leadsFilterSlideIn 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes leadsFilterSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0.85;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
