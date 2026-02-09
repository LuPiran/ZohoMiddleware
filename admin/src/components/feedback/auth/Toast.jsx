import { useEffect, useState } from "react";
import { MdCheck, MdClose, MdWarning } from "react-icons/md";

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
      icon: <MdCheck className="text-white text-lg font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-tegra-success/20",
    },
    error: {
      iconBg: "bg-tegra-error",
      icon: <MdClose className="text-white text-lg font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-tegra-error/20",
    },
    warning: {
      iconBg: "bg-tegra-warning",
      icon: <MdWarning className="text-white text-lg font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-tegra-warning/20",
    },
    info: {
      iconBg: "bg-tegra-blue",
      icon: <MdCheck className="text-white text-lg font-bold" />,
      titleColor: "text-tegra-text-primary",
      subtitleColor: "text-tegra-text-secondary",
      borderColor: "border-tegra-blue/20",
    },
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border-l-4 ${currentStyle.borderColor} bg-white shadow-lg min-w-[300px] max-w-md ${
        isClosing ? "animate-slide-up" : "animate-slide-down"
      }`}
      role="alert"
      style={{
        boxShadow: "0 4px 16px rgba(46, 74, 134, 0.08), 0 2px 8px rgba(46, 74, 134, 0.04)",
      }}
    >
      {/* Ícone circular */}
      <div
        className={`shrink-0 w-10 h-10 rounded-full ${currentStyle.iconBg} flex items-center justify-center`}
        style={{
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        }}
      >
        {currentStyle.icon}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold ${currentStyle.titleColor} leading-tight`}>
            {title}
          </p>
        )}
        {subtitle && (
          <p className={`text-sm font-medium ${currentStyle.subtitleColor} leading-tight ${title ? 'mt-1' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
