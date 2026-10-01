import { useEffect, useId, useRef } from "react";
import { MdCheck, MdClose, MdFilterList, MdPeople, MdPublic, MdToggleOn } from "react-icons/md";
import Select from "../../components/ui/Select";
import { GERENCIAS, PERFIS, REGIOES } from "./UserFormModal";

function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function countUserFilters(filters) {
  return (
    filters.perfis.length +
    (filters.situacao ? 1 : 0) +
    (filters.gerencia ? 1 : 0) +
    (filters.regiao ? 1 : 0) +
    (filters.recebeLeads ? 1 : 0) +
    (filters.parceria ? 1 : 0)
  );
}

export const EMPTY_USER_FILTERS = {
  perfis: [],
  situacao: "",
  gerencia: "",
  regiao: "",
  recebeLeads: "",
  parceria: "",
};

function SectionLabel({ children }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  );
}

function ChoiceList({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? "" : option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              active
                ? "bg-[#1a2f5b] text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function UsersFilterSidebar({ open, onClose, filters, onChange, onApply, onClear }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const activeCount = countUserFilters(filters);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-[2px]"
        aria-label="Fechar filtros"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="users-filter-panel relative flex h-full w-full max-w-[22rem] flex-col bg-white shadow-[-20px_0_48px_rgba(15,23,42,0.16)]"
      >
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#1a2f5b] via-[#2563eb] to-teal-500" aria-hidden />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a2f5b]/8 text-[#1a2f5b]">
              <MdFilterList className="text-lg" aria-hidden />
            </span>
            <div>
              <h2 id={titleId} className="text-base font-bold text-slate-800 leading-tight">Filtros</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCount > 0
                  ? `${activeCount} filtro${activeCount > 1 ? "s" : ""} ativo${activeCount > 1 ? "s" : ""}`
                  : "Nenhum filtro ativo"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Fechar filtros"
          >
            <MdClose className="text-lg" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MdPeople className="text-[#1a2f5b]/60" aria-hidden />
                <SectionLabel>Perfil</SectionLabel>
              </div>
              {filters.perfis.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, perfis: [] })}
                  className="text-[11px] font-medium text-[#1a2f5b]/70 hover:text-[#1a2f5b] cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <ul className="space-y-0.5">
              {PERFIS.map((perfil) => {
                const checked = filters.perfis.includes(perfil);
                return (
                  <li key={perfil}>
                    <button
                      type="button"
                      aria-pressed={checked}
                      onClick={() => onChange({ ...filters, perfis: toggleListValue(filters.perfis, perfil) })}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm cursor-pointer ${
                        checked ? "bg-[#1a2f5b]/6 font-semibold text-slate-800" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          checked ? "border-[#1a2f5b] bg-[#1a2f5b] text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked ? <MdCheck className="text-sm" aria-hidden /> : null}
                      </span>
                      {perfil}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <div className="mb-2.5 flex items-center gap-2">
              <MdToggleOn className="text-[#1a2f5b]/60" aria-hidden />
              <SectionLabel>Situação</SectionLabel>
            </div>
            <ChoiceList
              value={filters.situacao}
              onChange={(situacao) => onChange({ ...filters, situacao })}
              options={[
                { value: "ativo", label: "Ativo" },
                { value: "inativo", label: "Inativo" },
              ]}
            />
          </section>

          <section>
            <SectionLabel>Recebe leads</SectionLabel>
            <ChoiceList
              value={filters.recebeLeads}
              onChange={(recebeLeads) => onChange({ ...filters, recebeLeads })}
              options={[
                { value: "sim", label: "Sim" },
                { value: "nao", label: "Não" },
              ]}
            />
          </section>

          <section>
            <SectionLabel>Parceria</SectionLabel>
            <ChoiceList
              value={filters.parceria}
              onChange={(parceria) => onChange({ ...filters, parceria })}
              options={[
                { value: "sim", label: "Com parceria" },
                { value: "nao", label: "Sem parceria" },
              ]}
            />
          </section>

          <div className="border-t border-slate-100" />

          <section>
            <div className="mb-2.5 flex items-center gap-2">
              <MdPublic className="text-[#1a2f5b]/60" aria-hidden />
              <SectionLabel>Equipe e região</SectionLabel>
            </div>
            <div className="space-y-3">
              <Select
                label="Gerência"
                value={filters.gerencia}
                onChange={(event) => onChange({ ...filters, gerencia: event.target.value })}
                options={GERENCIAS}
                placeholder="Todas as gerências"
                isClearable
              />
              <Select
                label="Região"
                value={filters.regiao}
                onChange={(event) => onChange({ ...filters, regiao: event.target.value })}
                options={REGIOES}
                placeholder="Todas as regiões"
                isClearable
              />
            </div>
          </section>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClear}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-[1.4] rounded-xl bg-[#1a2f5b] py-2.5 text-sm font-bold text-white hover:bg-[#243f75] cursor-pointer"
            >
              Aplicar filtros
            </button>
          </div>
        </footer>
      </aside>
      <style>{`
        .users-filter-panel {
          animation: usersFilterSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes usersFilterSlideIn {
          from { transform: translateX(100%); opacity: 0.9; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
