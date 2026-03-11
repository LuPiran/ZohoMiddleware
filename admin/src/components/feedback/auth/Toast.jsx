import { useCallback, useEffect, useRef, useState } from "react";
import { MdCheck, MdClose, MdError, MdInfo, MdWarning } from "react-icons/md";

/** Remove emojis e símbolos do início da mensagem — eles já são representados pelo ícone visual */
function stripLeadingEmoji(msg) {
  return msg.replace(/^[^a-zA-ZÀ-ÿ\u00C0-\u024F0-9("']+/, "").trim();
}

const STYLES = {
  success: {
    iconBg: "bg-tegra-success",
    icon: <MdCheck className="text-white text-xl" />,
    titleColor: "text-tegra-text-primary",
    subtitleColor: "text-tegra-text-secondary",
    border: "border-l-[3px] border-tegra-success",
    progressColor: "bg-tegra-success",
  },
  error: {
    iconBg: "bg-tegra-error",
    icon: <MdError className="text-white text-xl" />,
    titleColor: "text-tegra-error",
    subtitleColor: "text-tegra-text-secondary",
    border: "border-l-[3px] border-tegra-error",
    progressColor: "bg-tegra-error",
  },
  warning: {
    iconBg: "bg-tegra-warning",
    icon: <MdWarning className="text-white text-[20px]" />,
    titleColor: "text-tegra-text-primary",
    subtitleColor: "text-tegra-text-secondary",
    border: "border-l-[3px] border-tegra-warning",
    progressColor: "bg-tegra-warning",
  },
  info: {
    iconBg: "bg-tegra-blue",
    icon: <MdInfo className="text-white text-xl" />,
    titleColor: "text-tegra-text-primary",
    subtitleColor: "text-tegra-text-secondary",
    border: "border-l-[3px] border-tegra-blue",
    progressColor: "bg-tegra-blue",
  },
};

const DEFAULT_TITLES = {
  success: "Concluído",
  error: "Algo deu errado",
  warning: "Atenção",
  info: "Informação",
};

export default function Toast({ message, type = "info", onClose, duration = 3000 }) {
  const [isClosing, setIsClosing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const remainingRef = useRef(duration);

  const close = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 260);
  }, [onClose]);

  const startTimer = useCallback(() => {
    if (duration <= 0 || remainingRef.current <= 0) return;
    clearTimeout(timerRef.current);
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(close, remainingRef.current);
  }, [duration, close]);

  const pauseTimer = useCallback(() => {
    if (duration <= 0) return;
    clearTimeout(timerRef.current);
    if (startTimeRef.current !== null) {
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startTimeRef.current),
      );
    }
  }, [duration]);

  useEffect(() => {
    startTimer();
    return () => clearTimeout(timerRef.current);
  }, [startTimer]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    pauseTimer();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimer();
  };

  const handleClose = () => {
    clearTimeout(timerRef.current);
    close();
  };

  // Parse message
  const cleaned = stripLeadingEmoji(message);
  let title = null;
  let subtitle = cleaned;

  if (cleaned.includes("|")) {
    const parts = cleaned.split("|").map((s) => s.trim());
    [title, subtitle] = parts;
  } else if (cleaned.includes("\n")) {
    const parts = cleaned.split("\n").map((s) => s.trim());
    [title, subtitle] = parts;
  }

  if (!title) title = DEFAULT_TITLES[type] || null;

  const s = STYLES[type] || STYLES.info;

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-start gap-3 px-4 py-3.5 rounded-xl ${
        s.border
      } bg-white overflow-hidden w-[calc(100vw-2rem)] max-w-[340px] sm:max-w-[380px] ${
        isClosing ? "animate-toast-out" : "animate-toast-in"
      }`}
      style={{
        boxShadow:
          "0 8px 24px rgba(26,47,91,0.10), 0 2px 8px rgba(26,47,91,0.06)",
      }}
    >
      {/* Ícone */}
      <div
        className={`shrink-0 w-9 h-9 rounded-full ${s.iconBg} flex items-center justify-center mt-0.5`}
      >
        {s.icon}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 pr-5">
        <p className={`text-sm font-semibold ${s.titleColor} leading-snug`}>
          {title}
        </p>
        {subtitle && (
          <p
            className={`text-xs ${s.subtitleColor} leading-relaxed ${
              title ? "mt-0.5" : ""
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Botão fechar */}
      <button
        onClick={handleClose}
        className="absolute top-2.5 right-2 p-1 rounded-md text-tegra-text-secondary hover:text-tegra-text-primary hover:bg-tegra-gray-light transition-colors"
        aria-label="Fechar notificação"
        type="button"
      >
        <MdClose className="text-sm" />
      </button>

      {/* Barra de progresso */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tegra-gray-medium/40">
          <div
            className={`h-full ${s.progressColor}`}
            style={{
              transformOrigin: "left",
              animation: `toast-progress ${duration}ms linear forwards`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}
