import { useEffect, useState } from "react";
import { MdCheck } from "react-icons/md";

/**
 * Popup de boas-vindas após login bem-sucedido
 * Design elegante seguindo a paleta TegraPharma
 */
export default function WelcomePopup({ userName, onClose, duration = 3500 }) {
  const [isVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Timer para iniciar o fechamento
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
      // Aguarda a animação antes de remover
      setTimeout(() => {
        onClose();
      }, 400);
    }, duration);

    return () => {
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 pointer-events-none" style={{ zIndex: 99999 }}>
        {/* Toast compacto */}
        <div
          className={`relative bg-white rounded-xl border border-tegra-gray-medium/70 shadow-lg transition-all duration-300 pointer-events-auto ${
            isVisible && !isClosing
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2"
          }`}
          style={{
            boxShadow:
              "0 10px 24px rgba(143, 169, 193, 0.12), 0 4px 10px rgba(143, 169, 193, 0.08)",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tegra-teal to-tegra-blue-green flex items-center justify-center shadow-sm">
              <MdCheck className="text-white text-lg font-bold" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-tegra-text-primary leading-tight">
                Login realizado
              </p>
              <p className="text-xs text-tegra-text-secondary truncate">
                Bem-vindo(a), {userName}
              </p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="h-0.5 bg-tegra-gray-medium/70 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-tegra-teal to-tegra-blue-green"
              style={{
                animation: `progress ${duration}ms linear`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Animação da barra de progresso */}
      <style>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
