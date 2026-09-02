import {
  MdCheckCircle,
  MdPersonAdd,
  MdPhoneInTalk,
  MdPhoneCallback,
  MdPhoneForwarded,
  MdPhoneDisabled,
  MdFavorite,
  MdEmojiEvents,
  MdClose,
  MdBlock,
  MdCampaign,
} from "react-icons/md";

const ICONS = {
  criado: MdPersonAdd,
  qualificado: MdCheckCircle,
  tentativa1: MdPhoneInTalk,
  tentativa2: MdPhoneCallback,
  tentativa3: MdPhoneForwarded,
  tentativa4: MdPhoneDisabled,
  interesse: MdFavorite,
  semInteresse: MdClose,
  semTratativa: MdClose,
  rejeitado: MdBlock,
  encaminhadoMkt: MdCampaign,
  convertido: MdEmojiEvents,
};

const TERMINAL_NEGATIVE_STAGES = ["semInteresse", "semTratativa", "rejeitado"];

function formatTimelineDate(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return null;
  }
}

/**
 * Timeline horizontal do funil do lead médico (estilo tracking Tegra).
 * Mobile: stepper horizontal com scroll.
 * Desktop (sm+): layout horizontal original, sem mudanças.
 */
export default function LeadTimeline({ timeline }) {
  const stages = timeline?.stages || [];

  return (
    <section
      aria-label="Linha do tempo do lead"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm px-3 sm:px-6 py-5 sm:py-6"
    >
      <div className="mb-4 sm:mb-5">
        <h2 className="text-base sm:text-lg font-bold text-tegra-blue-dark">
          Acompanhe o lead
        </h2>
      </div>

      {/* ─── MOBILE: stepper horizontal com scroll ─── */}
      <div className="sm:hidden">
        <div className="relative overflow-x-auto pb-2 -mx-1 px-1">
          <ol
            className="flex items-start gap-0"
            style={{ minWidth: `${stages.length * 72}px` }}
          >
            {stages.map((stage, index) => {
              const Icon = ICONS[stage.id] || MdCheckCircle;
              const isDone = stage.state === "done";
              const isCurrent = stage.state === "current";
              const isPending = stage.state === "pending";
              const date = formatTimelineDate(stage.date);

              const iconBg =
                isDone && TERMINAL_NEGATIVE_STAGES.includes(stage.id)
                  ? "bg-tegra-error border-tegra-error text-white"
                  : isDone
                    ? "bg-tegra-teal border-tegra-teal text-white"
                    : isCurrent
                      ? "bg-white border-tegra-teal text-tegra-teal shadow-[0_0_0_3px_rgba(61,162,184,0.18)]"
                      : "bg-tegra-gray-light border-tegra-gray-medium text-tegra-text-secondary/40";

              return (
                <li
                  key={stage.id}
                  className="relative flex flex-1 flex-col items-center"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* linha de conexão */}
                  {index < stages.length - 1 && (
                    <div
                      className="absolute top-[17px] left-[50%] w-full h-px z-0"
                      style={{
                        backgroundColor: isDone ? "var(--color-tegra-teal, #3da2b8)" : "#d1d5db",
                      }}
                      aria-hidden
                    />
                  )}

                  {/* ícone */}
                  <span
                    className={[
                      "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      iconBg,
                    ].join(" ")}
                  >
                    <Icon className="text-base" aria-hidden />
                  </span>

                  {/* label + data */}
                  <div className="mt-1.5 flex flex-col items-center px-0.5 text-center">
                    <p
                      className={[
                        "text-[10px] font-semibold leading-tight",
                        isPending
                          ? "text-tegra-text-secondary/50"
                          : isCurrent
                            ? "text-tegra-teal"
                            : "text-tegra-blue-dark",
                      ].join(" ")}
                    >
                      {stage.label}
                    </p>
                    {date && (
                      <p className="mt-0.5 text-[9px] text-tegra-text-secondary/70 tabular-nums">
                        {date}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ─── DESKTOP (sm+): layout original, sem alterações ─── */}
      <ol className="relative hidden sm:flex sm:flex-row sm:items-start sm:gap-0">
        {/* Linha base (desktop) */}
        <div
          className="absolute left-0 right-0 top-[22px] h-px bg-tegra-gray-medium"
          aria-hidden
        />

        {stages.map((stage) => {
          const Icon = ICONS[stage.id] || MdCheckCircle;
          const isDone = stage.state === "done";
          const isCurrent = stage.state === "current";
          const isPending = stage.state === "pending";

          return (
            <li
              key={stage.id}
              className="relative flex flex-1 flex-col items-center gap-2 z-[1]"
            >
              <span
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isDone && TERMINAL_NEGATIVE_STAGES.includes(stage.id)
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

              <div className="min-w-0 text-center pt-1">
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
                  {formatTimelineDate(stage.date) ?? "--/--"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
