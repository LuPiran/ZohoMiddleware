import {
  MdHistory,
  MdPhoneInTalk,
  MdThumbDown,
  MdPersonAdd,
  MdInfo,
} from "react-icons/md";

const ACTION_ICONS = {
  lead_criado: MdPersonAdd,
  primeira_tentativa: MdPhoneInTalk,
  sem_interesse: MdThumbDown,
};

function formatDateTime(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function LeadHistory({ historico = [] }) {
  const items = Array.isArray(historico) ? historico : [];

  return (
    <section
      aria-label="Histórico de ações"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-tegra-gray-medium flex items-center gap-2">
        <MdHistory className="text-xl text-tegra-blue-dark" aria-hidden />
        <h2 className="text-base font-bold text-tegra-blue-dark">
          Histórico de ações
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <MdInfo className="mx-auto text-2xl text-tegra-text-secondary/50" aria-hidden />
          <p className="mt-2 text-sm text-tegra-text-secondary">
            Nenhuma ação registrada neste lead ainda.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-tegra-gray-medium">
          {items.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || MdInfo;
            return (
              <li key={entry.id || `${entry.at}-${entry.action}`} className="px-4 sm:px-5 py-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tegra-gray-light text-tegra-blue-dark">
                    <Icon className="text-lg" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                      <p className="text-sm font-semibold text-tegra-text-primary">
                        {entry.label || entry.action}
                      </p>
                      <time className="text-xs text-tegra-text-secondary tabular-nums shrink-0">
                        {formatDateTime(entry.at)}
                      </time>
                    </div>
                    {entry.detail && (
                      <p className="mt-1 text-sm text-tegra-text-secondary whitespace-pre-wrap">
                        {entry.detail}
                      </p>
                    )}
                    {entry.by && (
                      <p className="mt-1 text-[11px] text-tegra-text-secondary/80">
                        Por {entry.by}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
