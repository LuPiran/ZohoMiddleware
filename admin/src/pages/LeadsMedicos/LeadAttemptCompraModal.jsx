import { useEffect, useMemo, useState } from "react";
import { MdClose, MdCheckCircle, MdShoppingCart } from "react-icons/md";
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
      className="fixed inset-0 z-[120] flex items-stretch justify-center bg-[#0B2340]/55 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-attempt-compra-title"
    >
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:my-auto sm:h-[92vh] sm:rounded-2xl">

        {/* ── Header ── */}
        <header className="shrink-0 bg-gradient-to-r from-[#1b346c] to-[#2563eb] px-5 pt-4 pb-5 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                Tentativa + 1ª compra
              </p>
              <h2
                id="lead-attempt-compra-title"
                className="mt-1.5 text-xl font-bold leading-snug"
              >
                {roundLabel || "Registrar tentativa"}
              </h2>
              <p className="mt-0.5 text-sm text-white/70 truncate">
                {lead?.nome || "Lead"} · Protocolo {lead?.protocolo || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Fechar"
            >
              <MdClose className="text-xl" />
            </button>
          </div>

          {/* Status inline */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <MdCheckCircle className="text-base shrink-0" aria-hidden />
              <span className="text-xs font-semibold">Observação validada</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <MdCheckCircle className="text-base shrink-0" aria-hidden />
              <span className="text-xs font-semibold">
                {evidenceCount} evidência{evidenceCount === 1 ? "" : "s"}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <MdShoppingCart className="text-base shrink-0" aria-hidden />
              <span className="text-xs font-semibold">Preencher compra abaixo</span>
            </span>
          </div>
        </header>

        {/* ── Resumo da observação ── */}
        <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
            Observação registrada
          </p>
          <p className="text-sm text-slate-600 line-clamp-2">
            {observacao || "—"}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Após enviar, a tentativa <strong className="text-[#1b346c] font-semibold">#{round}</strong> será registrada automaticamente.
          </p>
        </div>

        {/* ── Formulário ── */}
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
