import { useEffect, useMemo, useState } from "react";
import { MdClose, MdImage, MdNotes, MdShoppingCart, MdCheckCircle } from "react-icons/md";
import Compra from "../Compra/Compra";
import { useToast } from "../../components/feedback/auth/ToastContainer";

function buildLeadPrefill(lead) {
  if (!lead) return null;
  return {
    temNovoMedicoPrescritor: true,
    nomeMedico: lead.nome || "",
    crmMedico: lead.numeroRegistro || "",
    ufCrm: lead.ufCrm || lead.uf || "",
    celularMedico: lead.celular || lead.telefone || "",
    emailMedico: lead.email || "",
    especialidadeMedico: lead.tipoLead || lead.especialidade || "",
  };
}

export default function LeadAttemptCompraModal({
  open,
  onClose,
  lead,
  round,
  roundLabel,
  observacao,
  evidenceCount,
  onComplete,
  submitting: submittingExternal = false,
}) {
  const { showToast } = useToast();
  const [submittingLocal, setSubmittingLocal] = useState(false);
  const submitting = submittingExternal || submittingLocal;
  const leadPrefill = useMemo(() => buildLeadPrefill(lead), [lead]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  const handleCompraSuccess = async (result) => {
    setSubmittingLocal(true);
    try {
      await onComplete(result);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Compra enviada, mas falhou ao registrar a tentativa.";
      showToast(message, "error", 4000);
    } finally {
      setSubmittingLocal(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-stretch justify-center bg-[#0B2340]/60 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-attempt-compra-title"
      style={{ animation: "sla-overlay-in 0.18s ease-out" }}
    >
      <style>{`
        @keyframes sla-overlay-in { from { opacity:0 } to { opacity:1 } }
        @keyframes modal-slide-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none bg-[#f8fafc] shadow-2xl sm:my-auto sm:h-[92vh] sm:rounded-2xl"
        style={{ animation: "modal-slide-up 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* ── Header gradient ── */}
        <header className="shrink-0 bg-gradient-to-br from-[#1b346c] to-[#3da2b8] px-4 pt-4 pb-4 sm:px-6 text-white">

          {/* Linha topo: label + fechar */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                Tentativa + 1ª compra
              </p>
              <h2
                id="lead-attempt-compra-title"
                className="mt-1 text-lg font-bold leading-snug sm:text-xl"
              >
                {roundLabel || "Registrar tentativa"}
              </h2>
              <p className="mt-0.5 text-xs text-white/75 truncate">
                {lead?.nome || "Lead"} · Protocolo {lead?.protocolo || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="shrink-0 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Fechar"
            >
              <MdClose className="text-xl" />
            </button>
          </div>

          {/* Checklist de etapas concluídas */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {/* Observação */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2 py-2.5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <MdNotes className="text-base" aria-hidden />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Observação</p>
                <p className="text-[11px] font-bold text-emerald-300">✓ Validada</p>
              </div>
            </div>

            {/* Evidências */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2 py-2.5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <MdImage className="text-base" aria-hidden />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Evidências</p>
                <p className="text-[11px] font-bold text-emerald-300">
                  ✓ {evidenceCount} imagem{evidenceCount === 1 ? "" : "ns"}
                </p>
              </div>
            </div>

            {/* Compra */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-2 py-2.5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20">
                <MdShoppingCart className="text-base text-amber-300" aria-hidden />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Compra</p>
                <p className="text-[11px] font-bold text-amber-300">Preencher abaixo</p>
              </div>
            </div>
          </div>

          {/* Observação registrada */}
          {observacao && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <MdCheckCircle className="mt-0.5 shrink-0 text-sm text-emerald-400" aria-hidden />
              <p className="text-xs text-white/80 line-clamp-2 italic">"{observacao}"</p>
            </div>
          )}
        </header>

        {/* ── Aviso tentativa ── */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
          <p className="text-xs text-slate-500">
            Após o envio, a tentativa{" "}
            <strong className="font-bold text-[#1b346c]">#{round}</strong>{" "}
            será registrada automaticamente neste lead.
          </p>
        </div>

        {/* ── Formulário de compra ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
          <Compra
            embedded
            leadPrefill={leadPrefill}
            draftKey={`zoho_draft_compra_lead_${lead?.id || "temp"}_${round || 1}`}
            showSaveDraft={false}
            submitLabel={submitting ? "Registrando..." : "Registrar compra e tentativa"}
            onCancel={onClose}
            onSuccess={handleCompraSuccess}
          />
        </div>
      </div>
    </div>
  );
}
