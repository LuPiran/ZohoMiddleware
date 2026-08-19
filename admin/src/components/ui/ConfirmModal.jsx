import { useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";

/**
 * Modal de confirmação customizado — substitui window.confirm().
 *
 * Props:
 *   open         boolean
 *   title        string
 *   description  string
 *   confirmLabel string  (default: "Confirmar")
 *   cancelLabel  string  (default: "Cancelar")
 *   variant      "danger" | "warning" | "default"
 *   icon         ReactNode (opcional)
 *   onConfirm    () => void
 *   onCancel     () => void
 */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  icon,
  onConfirm,
  onCancel,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const confirmColor = {
    danger:  "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    default: "bg-[#1b346c] hover:bg-[#2563eb] text-white",
  }[variant] ?? "bg-[#1b346c] hover:bg-[#2563eb] text-white";

  const iconBg = {
    danger:  "bg-red-50 text-red-500",
    warning: "bg-amber-50 text-amber-500",
    default: "bg-blue-50 text-blue-600",
  }[variant];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => e.target === overlayRef.current && onCancel?.()}
      style={{ animation: "confirm-overlay-in 0.15s ease-out" }}
    >
      <style>{`
        @keyframes confirm-overlay-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes confirm-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(6px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }
      `}</style>

      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
        style={{ animation: "confirm-modal-in 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            {icon && (
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                {icon}
              </span>
            )}
            <div>
              <h2
                id="confirm-modal-title"
                className="text-base font-bold text-slate-800 leading-snug"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Ações */}
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-[2] rounded-xl py-2.5 text-sm font-bold transition ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
