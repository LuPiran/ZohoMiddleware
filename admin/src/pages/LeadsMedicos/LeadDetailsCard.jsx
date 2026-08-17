import {
  MdEmail,
  MdPhone,
  MdSmartphone,
  MdBadge,
  MdPlace,
  MdEvent,
  MdPerson,
  MdBusiness,
  MdCategory,
  MdHome,
  MdPinDrop,
  MdLocationCity,
  MdMarkunreadMailbox,
} from "react-icons/md";
import { canonicalizeLeadStatus, getLeadStatusMeta } from "./leadStatus";

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 min-w-0">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tegra-gray-light text-tegra-blue-dark">
        <Icon className="text-lg" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-tegra-text-secondary font-medium">
          {label}
        </dt>
        <dd className="text-sm font-semibold text-tegra-text-primary break-words">
          {value || "—"}
        </dd>
      </div>
    </div>
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

function formatCep(cep) {
  if (!cep) return "";
  const digits = String(cep).replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return String(cep);
}

function LeadStatusChip({ status }) {
  const label = canonicalizeLeadStatus(status) || status || "—";
  const meta = getLeadStatusMeta(label);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
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

export default function LeadDetailsCard({ lead }) {
  if (!lead) return null;

  const enderecoLinha = [
    [lead.rua, lead.numero].filter(Boolean).join(", "),
    lead.complemento,
    lead.bairro,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-label="Detalhes do lead"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-tegra-gray-medium bg-gradient-to-r from-tegra-blue-dark/5 to-transparent">
        <p className="text-xs font-medium text-tegra-text-secondary tabular-nums">
          ID {lead.id}
          {lead.idZoho ? ` · Zoho ${lead.idZoho}` : ""}
        </p>
        <h2 className="mt-1 text-xl font-bold text-tegra-blue-dark">
          {lead.nome || "Lead sem nome"}
        </h2>
        <p className="mt-1 text-sm text-tegra-text-secondary flex flex-wrap items-center gap-2">
          <LeadStatusChip status={lead.status} />
          <span>· Qualificado em {formatDate(lead.dataQualificado || lead.entradaEm)}</span>
        </p>
      </div>

      <dl className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <DetailItem icon={MdEmail} label="E-mail" value={lead.email} />
        <DetailItem icon={MdPhone} label="Telefone" value={lead.telefone} />
        <DetailItem icon={MdSmartphone} label="Celular" value={lead.celular} />
        <DetailItem
          icon={MdBadge}
          label="Registro (CRM/CRO)"
          value={lead.numeroRegistro}
        />
        <DetailItem
          icon={MdCategory}
          label="Tipo de lead"
          value={lead.tipoLead || lead.especialidade}
        />
        <DetailItem
          icon={MdEvent}
          label="Evento / origem"
          value={lead.evento || lead.origem}
        />
        <DetailItem icon={MdPerson} label="Consultor" value={lead.consultor} />
        <DetailItem icon={MdBusiness} label="Gerência" value={lead.gerencia} />
        <DetailItem
          icon={MdPlace}
          label="UF CRM"
          value={lead.ufCrm || lead.uf}
        />
      </dl>

      <div className="px-4 sm:px-5 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-tegra-text-secondary border-t border-tegra-gray-medium pt-4">
          Endereço
        </h3>
        {enderecoLinha && (
          <p className="mt-2 text-sm text-tegra-text-primary font-medium">
            {enderecoLinha}
          </p>
        )}
      </div>

      <dl className="px-4 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <DetailItem icon={MdHome} label="Rua" value={lead.rua} />
        <DetailItem icon={MdPinDrop} label="Número" value={lead.numero} />
        <DetailItem
          icon={MdHome}
          label="Complemento"
          value={lead.complemento}
        />
        <DetailItem icon={MdLocationCity} label="Bairro" value={lead.bairro} />
        <DetailItem icon={MdLocationCity} label="Cidade" value={lead.cidade} />
        <DetailItem
          icon={MdPlace}
          label="Estado"
          value={lead.estado || lead.uf}
        />
        <DetailItem
          icon={MdMarkunreadMailbox}
          label="CEP"
          value={formatCep(lead.cep)}
        />
      </dl>
    </section>
  );
}
