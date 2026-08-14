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
} from "react-icons/md";

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

export default function LeadDetailsCard({ lead }) {
  if (!lead) return null;

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
        <p className="mt-1 text-sm text-tegra-text-secondary">
          Status:{" "}
          <span className="font-semibold text-tegra-text-primary">
            {lead.status || "—"}
          </span>
          {" · "}
          Qualificado em {formatDate(lead.dataQualificado || lead.entradaEm)}
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
        <DetailItem icon={MdPlace} label="UF" value={lead.uf || lead.ufCrm} />
        <DetailItem
          icon={MdCategory}
          label="Tipo de lead"
          value={lead.tipoLead || lead.especialidade}
        />
        <DetailItem icon={MdEvent} label="Evento / origem" value={lead.evento || lead.origem} />
        <DetailItem icon={MdPerson} label="Consultor" value={lead.consultor} />
        <DetailItem icon={MdBusiness} label="Gerência" value={lead.gerencia} />
      </dl>
    </section>
  );
}
