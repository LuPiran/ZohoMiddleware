import { useEffect, useState } from "react";
import {
  MdCheckCircle,
  MdError,
  MdWarning,
  MdInfo,
  MdClose,
} from "react-icons/md";

/**
 * Componente de Toast individual
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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const icons = {
    success: <MdCheckCircle className="text-xl" />,
    error: <MdError className="text-xl" />,
    warning: <MdWarning className="text-xl" />,
    info: <MdInfo className="text-xl" />,
  };

  const variants = {
    success: "bg-tegra-success-light border-tegra-success text-tegra-success",
    error: "bg-tegra-error-light border-tegra-error text-tegra-error",
    warning: "bg-tegra-warning-light border-tegra-warning text-tegra-warning",
    info: "bg-tegra-info-light border-tegra-info text-tegra-info",
  };

  return (
    <div
      className={`flex items-center gap-3 border-l-4 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
        isClosing ? "animate-slide-up" : "animate-slide-down"
      } ${variants[type]}`}
      role="alert"
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition"
        aria-label="Fechar"
      >
        <MdClose className="text-lg" />
      </button>
    </div>
  );
}
