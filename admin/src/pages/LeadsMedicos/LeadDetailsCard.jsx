import { useState } from "react";
import {
  MdEmail,
  MdPhone,
  MdSmartphone,
  MdBadge,
  MdPerson,
  MdBusiness,
  MdLocationOn,
  MdCategory,
  MdEvent,
  MdExpandMore,
  MdExpandLess,
  MdTag,
  MdHome,
} from "react-icons/md";
import { canonicalizeLeadStatus, getLeadStatusMeta } from "./leadStatus";

/* ─────────────────────────────────────────
   Componente de status (igual ao original)
───────────────────────────────────────── */
function LeadStatusChip({ status }) {
  const label = canonicalizeLeadStatus(status) || status || "—";
  const meta = getLeadStatusMeta(label);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        color: meta.color,
        backgroundColor: meta.soft,
        boxShadow: `inset 0 0 0 1px ${meta.color}33`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.chart || meta.color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────
   Item de detalhe — desktop (grade original)
───────────────────────────────────────── */
function DetailItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-tegra-teal">
        <Icon className="text-base" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-tegra-text-secondary mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-tegra-blue-dark break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Item de detalhe — mobile (linha com ícone)
───────────────────────────────────────── */
function MobileInfoRow({ icon: Icon, label, value, highlight }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          highlight ? "bg-teal-50 text-teal-600" : "bg-slate-50 text-slate-400"
        }`}
      >
        <Icon className="text-base" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p
          className={`text-sm font-semibold break-all ${
            highlight ? "text-teal-700" : "text-slate-700"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Formata endereço numa linha legível
───────────────────────────────────────── */
function formatEndereco(lead) {
  const parts = [
    lead.rua && lead.numero
      ? `${lead.rua}, ${lead.numero}`
      : lead.rua,
    lead.complemento,
    lead.bairro,
    lead.cidade && lead.estado
      ? `${lead.cidade} — ${lead.estado}`
      : lead.cidade || lead.estado,
    lead.cep
      ? `CEP ${String(lead.cep)
          .replace(/\D/g, "")
          .replace(/(\d{5})(\d{3})/, "$1-$2")}`
      : null,
  ].filter(Boolean);
  return parts.join(", ");
}

/* ─────────────────────────────────────────
   Componente principal
───────────────────────────────────────── */
export default function LeadDetailsCard({ lead }) {
  if (!lead) return null;

  const [showEndereco, setShowEndereco] = useState(false);

  const eventos = Array.isArray(lead.eventos) ? lead.eventos : [];
  const enderecoCompleto = formatEndereco(lead);
  const evento = eventos[0]?.nome || lead.evento || lead.origem;
  const crm = lead.numeroRegistro
    ? `${lead.numeroRegistro}${lead.ufCrm ? ` (${lead.ufCrm})` : ""}`
    : null;

  return (
    <section
      aria-label="Detalhes do lead"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      {/* ── Cabeçalho: nome + protocolo + status ────── */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-tegra-gray-medium/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-tegra-blue-dark leading-snug">
              {lead.nome || "Lead sem nome"}
            </h2>
            {lead.protocolo && (
              <p className="mt-0.5 text-xs font-semibold text-tegra-text-secondary tracking-widest uppercase">
                <MdTag className="inline -mt-0.5 mr-0.5" aria-hidden />
                {lead.protocolo}
              </p>
            )}
          </div>
          <LeadStatusChip status={lead.status} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE (< sm): seções em lista priorizadas
      ══════════════════════════════════════════════ */}
      <div className="sm:hidden">
        {/* Contato — prioridade máxima */}
        <div className="px-4 pt-3 pb-1">
          <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Contato
          </p>
          <MobileInfoRow icon={MdSmartphone} label="Celular"   value={lead.celular}   highlight />
          <MobileInfoRow icon={MdPhone}      label="Telefone"  value={lead.telefone}  highlight />
          <MobileInfoRow icon={MdEmail}      label="E-mail"    value={lead.email} />
        </div>

        {/* Dados profissionais */}
        <div className="px-4 pt-3 pb-1 border-t border-slate-100">
          <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Dados profissionais
          </p>
          <MobileInfoRow icon={MdBadge}    label="CRM / CRO"       value={crm} />
          <MobileInfoRow icon={MdCategory} label="Especialidade"    value={lead.tipoLead || lead.especialidade} />
          <MobileInfoRow icon={MdEvent}    label="Evento / origem"  value={evento} />
        </div>

        {/* Atribuição */}
        <div className="px-4 pt-3 pb-1 border-t border-slate-100">
          <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Atribuição
          </p>
          <MobileInfoRow icon={MdPerson}   label="Consultor" value={lead.consultor} />
          <MobileInfoRow icon={MdBusiness} label="Gerência"  value={lead.gerencia} />
        </div>

        {/* Endereço — colapsável no mobile */}
        {enderecoCompleto && (
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEndereco((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
            >
              <span className="flex items-center gap-2">
                <MdLocationOn className="text-slate-400" />
                Endereço
              </span>
              {showEndereco
                ? <MdExpandLess className="text-slate-400" />
                : <MdExpandMore className="text-slate-400" />}
            </button>
            {showEndereco && (
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {enderecoCompleto}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP (sm+): grade original com 3 colunas
      ══════════════════════════════════════════════ */}
      <div className="hidden sm:block px-6 py-5 space-y-6">
        {/* Grade principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <DetailItem icon={MdEmail}      label="E-mail"           value={lead.email} />
          <DetailItem icon={MdPhone}      label="Telefone"         value={lead.telefone} />
          <DetailItem icon={MdSmartphone} label="Celular"          value={lead.celular} />
          <DetailItem icon={MdBadge}      label="CRM / CRO"        value={crm} />
          <DetailItem icon={MdCategory}   label="Tipo de lead"     value={lead.tipoLead} />
          <DetailItem icon={MdEvent}      label="Evento / origem"  value={evento} />
          <DetailItem icon={MdPerson}     label="Consultor"        value={lead.consultor} />
          <DetailItem icon={MdBusiness}   label="Gerência"         value={lead.gerencia} />
        </div>

        {/* Endereço */}
        {enderecoCompleto && (
          <div className="border-t border-tegra-gray-medium/40 pt-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-tegra-teal">
                <MdHome className="text-base" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-tegra-text-secondary mb-0.5">
                  Endereço
                </p>
                <p className="text-sm font-semibold text-tegra-blue-dark">
                  {enderecoCompleto}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Outros eventos */}
        {eventos.length > 1 && (
          <div className="border-t border-tegra-gray-medium/40 pt-4">
            <p className="text-xs font-medium text-tegra-text-secondary mb-2">
              Outros eventos
            </p>
            <div className="flex flex-wrap gap-2">
              {eventos.slice(1).map((ev) => (
                <span
                  key={ev.id}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  <MdEvent className="text-slate-400 text-xs" />
                  {ev.nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
