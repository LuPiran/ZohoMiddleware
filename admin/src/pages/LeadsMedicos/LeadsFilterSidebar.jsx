import { useEffect, useId, useRef } from "react";
import {
  MdClose,
  MdFilterList,
  MdCalendarMonth,
  MdOutlineEventAvailable,
  MdBolt,
  MdCheck,
  MdPeople,
} from "react-icons/md";
import DatePicker from "../../components/ui/date-picker";
import { DATE_PRESETS, getPresetDateRange } from "./mockLeads";
import { LEAD_STATUSES, getLeadStatusMeta } from "./leadStatus";

/* ── Helpers ── */
function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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

/* ── Label de seção ── */
function SectionLabel({ children }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  );
}

export default function LeadsFilterSidebar({
  open,
  onClose,
  filters,
  onChange,
  onApply,
  onClear,
  role = "consultor",
  consultores = [],
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector("button, input")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const setField = (field, value) => onChange({ ...filters, [field]: value });

  const toggleStatus = (status) =>
    onChange({ ...filters, statuses: toggleListValue(filters.statuses, status) });

  const applyPreset = (presetId) => {
    const range = getPresetDateRange(presetId);
    onChange({ ...filters, periodoRapido: presetId, criadoDe: range.de, criadoAte: range.ate });
  };

  const activeCount = countActiveFilters(filters);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* Overlay */}
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-[2px]"
        aria-label="Fechar filtros"
        onClick={onClose}
      />

      {/* Painel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="leads-filter-panel relative flex h-full w-full max-w-[22rem] flex-col bg-white shadow-[-20px_0_48px_rgba(15,23,42,0.16)]"
      >
        {/* Faixa de marca */}
        <div
          className="h-1 w-full shrink-0 bg-gradient-to-r from-[#1a2f5b] via-[#2563eb] to-teal-500"
          aria-hidden
        />

        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a2f5b]/8 text-[#1a2f5b]">
              <MdFilterList className="text-lg" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold text-slate-800 leading-tight">
                Filtros
              </h2>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">
                {activeCount > 0
                  ? `${activeCount} filtro${activeCount > 1 ? "s" : ""} ativo${activeCount > 1 ? "s" : ""}`
                  : "Nenhum filtro ativo"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar filtros"
          >
            <MdClose className="text-lg" />
          </button>
        </header>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Período rápido */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <MdBolt className="text-[#1a2f5b]/60 text-base shrink-0" aria-hidden />
              <SectionLabel>Período rápido</SectionLabel>
            </div>
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
                        ? "bg-[#1a2f5b] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Divisor */}
          <div className="border-t border-slate-100" />

          {/* Status */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <SectionLabel>Status</SectionLabel>
              {filters.statuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, statuses: [] })}
                  className="text-[11px] font-medium text-[#1a2f5b]/70 hover:text-[#1a2f5b] transition cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <ul className="space-y-0.5">
              {LEAD_STATUSES.map((status) => {
                const checked = filters.statuses.includes(status);
                const meta = getLeadStatusMeta(status);
                return (
                  <li key={status}>
                    <button
                      type="button"
                      onClick={() => toggleStatus(status)}
                      aria-pressed={checked}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition cursor-pointer ${
                        checked
                          ? "bg-[#1a2f5b]/6"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Checkbox customizado */}
                      <span
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition ${
                          checked
                            ? "border-transparent"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}
                        style={checked ? { backgroundColor: meta.color } : undefined}
                        aria-hidden
                      >
                        {checked && <MdCheck className="text-white text-[11px]" />}
                      </span>

                      {/* Bolinha colorida */}
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.chart || meta.color }}
                        aria-hidden
                      />

                      {/* Label */}
                      <span className={`flex-1 text-sm ${checked ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Consultor — só visível para gerente / admin */}
          {(role === "gerente" || role === "admin") && consultores.length > 0 && (
            <>
              <div className="border-t border-slate-100" />
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <MdPeople className="text-[#1a2f5b]/60 text-base shrink-0" aria-hidden />
                    <SectionLabel>Consultor</SectionLabel>
                  </div>
                  {filters.consultor && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filters, consultor: "" })}
                      className="text-[11px] font-medium text-[#1a2f5b]/70 hover:text-[#1a2f5b] transition cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <select
                  value={filters.consultor}
                  onChange={(e) => onChange({ ...filters, consultor: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#1a2f5b] focus:outline-none focus:ring-1 focus:ring-[#1a2f5b]/30 cursor-pointer"
                >
                  <option value="">Todos os consultores</option>
                  {consultores.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </section>
            </>
          )}

          {/* Divisor */}
          <div className="border-t border-slate-100" />

          {/* Data de criação */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <MdCalendarMonth className="text-[#1a2f5b]/60 text-base shrink-0" aria-hidden />
              <SectionLabel>Data de criação</SectionLabel>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="De"
                value={filters.criadoDe}
                onChange={(v) => onChange({ ...filters, criadoDe: v, periodoRapido: "" })}
              />
              <DatePicker
                label="Até"
                value={filters.criadoAte}
                onChange={(v) => onChange({ ...filters, criadoAte: v, periodoRapido: "" })}
              />
            </div>
          </section>

          {/* Divisor */}
          <div className="border-t border-slate-100" />

          {/* Data de entrada */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <MdOutlineEventAvailable className="text-[#1a2f5b]/60 text-base shrink-0" aria-hidden />
              <SectionLabel>Data de entrada</SectionLabel>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="De"
                value={filters.entradaDe}
                onChange={(v) => setField("entradaDe", v)}
              />
              <DatePicker
                label="Até"
                value={filters.entradaAte}
                onChange={(v) => setField("entradaAte", v)}
              />
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClear}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-[1.4] rounded-xl bg-[#1a2f5b] py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#243f75] cursor-pointer"
            >
              Aplicar filtros
            </button>
          </div>
        </footer>
      </aside>

      <style>{`
        .leads-filter-panel {
          animation: filterSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes filterSlideIn {
          from { transform: translateX(100%); opacity: 0.9; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
