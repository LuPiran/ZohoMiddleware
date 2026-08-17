import {
  MdCheckCircle,
  MdPersonAdd,
  MdPhoneInTalk,
  MdPhoneCallback,
  MdPhoneForwarded,
  MdFavorite,
  MdEmojiEvents,
  MdClose,
} from "react-icons/md";

const ICONS = {
  criado: MdPersonAdd,
  qualificado: MdCheckCircle,
  tentativa1: MdPhoneInTalk,
  tentativa2: MdPhoneCallback,
  tentativa3: MdPhoneForwarded,
  interesse: MdFavorite,
  semInteresse: MdClose,
  convertido: MdEmojiEvents,
};

function formatTimelineDate(dateString) {
  if (!dateString) return "--/--";
  try {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "--/--";
  }
}

/**
 * Timeline horizontal do funil do lead médico (estilo tracking Tegra).
 */
export default function LeadTimeline({ timeline }) {
  const stages = timeline?.stages || [];

  return (
    <section
      aria-label="Linha do tempo do lead"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm px-3 sm:px-6 py-5 sm:py-6"
    >
      <div className="mb-5">
        <h2 className="text-base sm:text-lg font-bold text-tegra-blue-dark">
          Acompanhe o lead
        </h2>
      </div>

      <ol className="relative flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
        {/* Linha base (desktop) */}
        <div
          className="hidden sm:block absolute left-0 right-0 top-[22px] h-px bg-tegra-gray-medium"
          aria-hidden
        />

        {stages.map((stage, index) => {
          const Icon = ICONS[stage.id] || MdCheckCircle;
          const isDone = stage.state === "done";
          const isCurrent = stage.state === "current";
          const isPending = stage.state === "pending";

          return (
            <li
              key={stage.id}
              className="relative flex sm:flex-1 sm:flex-col items-center sm:items-center gap-3 sm:gap-2 z-[1]"
            >
              {index > 0 && (
                <div
                  className="sm:hidden absolute left-[21px] -top-4 w-px h-4 bg-tegra-gray-medium"
                  aria-hidden
                />
              )}

              <span
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone && stage.id === "semInteresse"
                    ? "bg-tegra-error border-tegra-error text-white"
                    : isDone
                      ? "bg-tegra-teal border-tegra-teal text-white"
                      : isCurrent
                        ? "bg-white border-tegra-teal text-tegra-teal shadow-[0_0_0_4px_rgba(61,162,184,0.15)]"
                        : "bg-tegra-gray-light border-tegra-gray-medium text-tegra-text-secondary/50",
                ].join(" ")}
                aria-current={isCurrent ? "step" : undefined}
              >
                <Icon className="text-xl" aria-hidden />
              </span>

              <div className="min-w-0 sm:text-center pt-0.5 sm:pt-1">
                <p
                  className={[
                    "text-sm font-semibold leading-tight",
                    isPending
                      ? "text-tegra-text-secondary/60"
                      : "text-tegra-blue-dark",
                  ].join(" ")}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-xs text-tegra-text-secondary tabular-nums">
                  {formatTimelineDate(stage.date)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
