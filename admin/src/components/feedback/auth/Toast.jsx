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
    success: "toast-glass toast-glass--success",
    error: "toast-glass toast-glass--error",
    warning: "toast-glass toast-glass--warning",
    info: "toast-glass toast-glass--info",
  };

  return (
    <div
      className={`toast-base flex items-center gap-3 px-4 py-3 rounded-xl min-w-[300px] max-w-md ${
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
