import { MdVerified } from "react-icons/md";

function aquecimentoCores(statusAquecimento) {
  const normalizado = String(statusAquecimento || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizado.includes("ultimos 6 meses")) {
    return {
      border: "border-emerald-300",
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      title: "text-emerald-800",
      label: "text-emerald-700",
      value: "text-emerald-900",
    };
  }
  if (normalizado.includes("6 meses a 1 ano")) {
    return {
      border: "border-amber-300",
      bg: "bg-amber-50",
      icon: "text-amber-600",
      title: "text-amber-800",
      label: "text-amber-700",
      value: "text-amber-950",
    };
  }
  if (normalizado.includes("mais de 1 ano")) {
    return {
      border: "border-red-300",
      bg: "bg-red-50",
      icon: "text-red-600",
      title: "text-red-800",
      label: "text-red-700",
      value: "text-red-950",
    };
  }
  return {
    border: "border-slate-200",
    bg: "bg-slate-50",
    icon: "text-slate-500",
    title: "text-slate-800",
    label: "text-slate-500",
    value: "text-slate-900",
  };
}

function formatDate(value) {
  if (!value) return "Não informada";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR");
}

function Info({ label, value, cores }) {
  return (
    <div className="min-w-0">
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${cores.label}`}>
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold break-words ${cores.value}`}>
        {value || "Não informado"}
      </p>
    </div>
  );
}

export default function LeadPrescritorCard({ lead }) {
  if (!lead?.medicoPrescritor) return null;

  const cores = aquecimentoCores(lead.statusAquecimento);

  return (
    <section
      aria-label="Médico prescritor"
      className={`rounded-xl border ${cores.border} ${cores.bg} px-4 py-4 sm:px-5`}
    >
      <div className="flex items-start gap-3">
        <MdVerified className={`mt-0.5 shrink-0 text-2xl ${cores.icon}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className={`text-base font-semibold ${cores.title}`}>
            Este lead é um médico prescritor
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Info
              label="Dono do médico"
              value={lead.prescritorConsultorNome}
              cores={cores}
            />
            <Info
              label="Última prescrição"
              value={formatDate(lead.dataUltimaPrescricao)}
              cores={cores}
            />
            <Info
              label="Status de aquecimento"
              value={lead.statusAquecimento}
              cores={cores}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
