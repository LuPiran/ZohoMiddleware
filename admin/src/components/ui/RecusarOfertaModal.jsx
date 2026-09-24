import { useEffect, useRef, useState } from "react";
import { MdClose, MdThumbDown } from "react-icons/md";

const MIN_MOTIVO = 10;

/**
 * Modal de recusa de oferta — motivo escrito é obrigatório (o gerente lê
 * no histórico do lead e no e-mail de recusa). Sem campo de evidência
 * (foto): nesse ponto o consultor ainda nem teve contato com o lead.
 *
 * Props:
 *   open        boolean
 *   leadNome    string
 *   submitting  boolean
 *   onConfirm   (motivo: string) => void
 *   onCancel    () => void
 */
export default function RecusarOfertaModal({
  open,
  leadNome,
  submitting,
  onConfirm,
  onCancel,
}) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const overlayRef = useRef(null);
  const textareaRef = useRef(null);

  // Limpa o campo aqui (no evento, não num effect) antes de sair do modal.
  const handleCancel = () => {
    setMotivo("");
    setError("");
    onCancel?.();
  };

  const handleConfirm = () => {
    const nota = motivo.trim();
    if (nota.length < MIN_MOTIVO) {
      setError(`Explique o motivo da recusa (pelo menos ${MIN_MOTIVO} caracteres).`);
      return;
    }
    setMotivo("");
    setError("");
    onConfirm?.(nota);
  };

  // Foca o campo ao abrir — efeito de DOM legítimo (não é reset de estado).
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape" && !submitting) handleCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recusar-oferta-title"
      onClick={(e) => e.target === overlayRef.current && !submitting && handleCancel()}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <MdThumbDown className="text-lg" />
            </span>
            <div>
              <h2 id="recusar-oferta-title" className="text-base font-bold text-slate-800 leading-snug">
                Recusar {leadNome ? `"${leadNome}"` : "este lead"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Conte pra gente o motivo da recusa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Fechar"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        <div className="px-5 pb-4">
          <textarea
            ref={textareaRef}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError("");
            }}
            disabled={submitting}
            rows={4}
            placeholder="Ex.: Região muito distante da minha base, não vou conseguir atender no prazo..."
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${
              error
                ? "border-red-300 focus:ring-red-200"
                : "border-slate-200 focus:ring-blue-200"
            }`}
          />
          {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-[2] rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Recusando…" : "Confirmar recusa"}
          </button>
        </div>
      </div>
    </div>
  );
}
