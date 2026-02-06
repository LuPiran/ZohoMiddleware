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

  // Configurações de estilo por tipo
  const styles = {
    success: {
      iconBg: "bg-tegra-teal", // Cor azul-petróleo do site (#21b3b3)
      icon: <MdCheck className="text-white text-lg font-bold" />,
      titleColor: "text-gray-800", // Cinza escuro (#343A40)
      subtitleColor: "text-gray-600", // Cinza médio (#6C757D)
    },
    error: {
      iconBg: "bg-red-600", // Vermelho (#DC3545)
      icon: <MdClose className="text-white text-lg font-bold" />,
      titleColor: "text-red-700", // Vermelho escuro
      subtitleColor: "text-red-600", // Vermelho médio
    },
    warning: {
      iconBg: "bg-yellow-500", // Amarelo (#FFC107)
      icon: <MdWarning className="text-white text-lg font-bold" />,
      titleColor: "text-yellow-800", // Amarelo escuro
      subtitleColor: "text-yellow-700", // Amarelo médio escuro
    },
    info: {
      iconBg: "bg-tegra-blue", // Azul do site (#2e4a86)
      icon: <MdCheck className="text-white text-lg font-bold" />,
      titleColor: "text-gray-800",
      subtitleColor: "text-gray-600",
    },
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm bg-white ${
        isClosing ? "animate-slide-up" : "animate-slide-down"
      }`}
      role="alert"
      style={{
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Ícone circular */}
      <div
        className={`shrink-0 w-9 h-9 rounded-full ${currentStyle.iconBg} flex items-center justify-center`}
        style={{
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)",
        }}
      >
        {currentStyle.icon}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-bold ${currentStyle.titleColor} leading-tight`}>
            {title}
          </p>
        )}
        {subtitle && (
          <p className={`text-xs font-normal ${currentStyle.subtitleColor} leading-tight ${title ? 'mt-0.5' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
