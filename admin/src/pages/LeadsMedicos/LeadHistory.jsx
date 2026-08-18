import {
  MdHistory,
  MdPhoneInTalk,
  MdThumbDown,
  MdPersonAdd,
  MdInfo,
  MdPhoneMissed,
  MdEmojiEvents,
  MdCheckCircle,
  MdFavorite,
} from "react-icons/md";

const ACTION_ICONS = {
  lead_criado: MdPersonAdd,
  lead_recebido: MdPersonAdd,
  sla_aceito: MdCheckCircle,
  sla_ofertado: MdPersonAdd,
  sla_reatribuido: MdPersonAdd,
  sla_recusado: MdThumbDown,
  sla_prazo_expirado: MdPhoneMissed,
  sla_ciclo_encerrado: MdInfo,
  primeira_tentativa: MdPhoneInTalk,
  segunda_tentativa: MdPhoneInTalk,
  terceira_tentativa: MdPhoneInTalk,
  tentativa_sem_retorno: MdPhoneMissed,
  sem_contato: MdPhoneMissed,
  sem_interesse: MdThumbDown,
  lead_com_interesse: MdFavorite,
  lead_convertido: MdEmojiEvents,
};

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const action = entry.action || entry.tipo || "";
  const at = entry.at || entry.data || null;
  const by = entry.by || entry.autor || null;
  const label = entry.label || entry.descricao || action || "Ação no lead";
  const detail =
    entry.detail ||
    (entry.label && entry.descricao ? entry.descricao : undefined);
  return {
    id: entry.id,
    action,
    at,
    by,
    label,
    detail,
  };
}

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

const VISIBLE_HISTORY_ITEMS = 5;

export default function LeadHistory({ historico = [] }) {
  const items = (Array.isArray(historico) ? historico : [])
    .map(normalizeHistoryEntry)
    .filter(Boolean);
  const needsScroll = items.length > VISIBLE_HISTORY_ITEMS;

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
        <ol
          className={[
            "divide-y divide-tegra-gray-medium",
            needsScroll
              ? "max-h-[26.25rem] overflow-y-auto overscroll-contain"
              : "",
          ].join(" ")}
        >
          {items.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || MdInfo;
            return (
              <li
                key={entry.id || `${entry.at}-${entry.action}`}
                className="px-4 sm:px-5 py-4 min-h-[5.25rem]"
              >
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
