import { useEffect, useState } from "react";
import { MdCheck, MdClose, MdWarning, MdError } from "react-icons/md";

/**
 * Componente de Toast individual
 * Design baseado na imagem de referência
 */
export default function Toast({
  message,
  type = "info",
  onClose,
  duration = 3000,
}) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        // Aguarda a animação de saída antes de remover
        setTimeout(() => {
          onClose();
        }, 300); // Duração da animação de saída
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Títulos padrão por tipo
  const defaultTitles = {
    error: "Algum erro aconteceu",
    warning: "Aviso",
    success: null, // Sem título padrão para sucesso
    info: null, // Sem título padrão para info
  };

  // Parse da mensagem para título e subtítulo (separados por "|" ou quebra de linha)
  const parseMessage = (msg) => {
    if (msg.includes("|")) {
      const [title, subtitle] = msg.split("|").map((s) => s.trim());
      return { title, subtitle };
    }
    if (msg.includes("\n")) {
      const [title, subtitle] = msg.split("\n").map((s) => s.trim());
      return { title, subtitle };
    }
    return { title: null, subtitle: msg };
  };

  const parsed = parseMessage(message);
  const title = parsed.title || defaultTitles[type] || null;
  const subtitle = parsed.subtitle || (parsed.title ? null : message);

  // Configurações de estilo por tipo (usando paleta TegraPharma)
  const styles = {
    success: {
      iconBg: "bg-tegra-success",
      icon: <MdCheck className="text-white text-xl font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-l-4 border-tegra-success",
    },
    error: {
      iconBg: "bg-tegra-error",
      icon: <MdError className="text-white text-xl font-bold" />,
      titleColor: "text-tegra-error",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-l-4 border-tegra-error",
    },
    warning: {
      iconBg: "bg-tegra-warning",
      icon: <MdWarning className="text-white text-xl font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-l-4 border-tegra-warning",
    },
    info: {
      iconBg: "bg-tegra-blue",
      icon: <MdCheck className="text-white text-xl font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-l-4 border-tegra-blue",
    },
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 rounded-lg ${currentStyle.borderColor} bg-white shadow-xl min-w-[350px] max-w-md ${
        isClosing ? "animate-slide-up" : "animate-slide-down"
      }`}
      role="alert"
      style={{
        boxShadow: "0 10px 25px rgba(46, 74, 134, 0.15), 0 3px 10px rgba(46, 74, 134, 0.08)",
      }}
    >
      {/* Ícone circular */}
      <div
        className={`shrink-0 w-12 h-12 rounded-full ${currentStyle.iconBg} flex items-center justify-center mt-0.5`}
        style={{
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        {currentStyle.icon}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0 pt-0.5">
        {title && (
          <p className={`text-sm font-bold ${currentStyle.titleColor} leading-tight`}>
            {title}
          </p>
        )}
        {subtitle && (
          <p className={`text-sm font-medium ${currentStyle.subtitleColor} leading-snug ${title ? 'mt-1.5' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Botão de fechar */}
      <button
        onClick={() => {
          setIsClosing(true);
          setTimeout(() => {
            onClose();
          }, 300);
        }}
        className="shrink-0 p-2 text-tegra-text-secondary hover:text-tegra-text-primary hover:bg-tegra-gray-light rounded-lg transition-colors"
        aria-label="Fechar notificação"
        type="button"
      >
        <MdClose className="text-lg" />
      </button>
    </div>
  );
}
