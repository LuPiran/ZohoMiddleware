import { useEffect, useMemo, useState } from "react";
import { MdClose, MdFactCheck, MdImage, MdNotes, MdShoppingCart } from "react-icons/md";
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
    return () => {
      document.body.style.overflow = previous;
    };
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
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-none border border-tegra-gray-medium/80 bg-tegra-bg-primary shadow-2xl sm:my-auto sm:h-[92vh] sm:rounded-2xl">
        <header className="shrink-0 border-b border-tegra-gray-medium bg-gradient-to-r from-tegra-blue-dark to-tegra-teal px-4 py-3 sm:py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Tentativa + 1ª compra
              </p>
              <h2
                id="lead-attempt-compra-title"
                className="mt-0.5 text-base font-bold sm:text-xl truncate"
              >
                {roundLabel || "Registrar tentativa"}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-white/80 truncate">
                {lead?.nome || "Lead"} · Protocolo {lead?.protocolo || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
              aria-label="Fechar"
            >
              <MdClose className="text-xl" />
            </button>
          </div>

          {/* Pills de status — todas as telas */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              <MdNotes className="text-sm shrink-0" aria-hidden />
              <span className="text-xs font-semibold">Obs. validada</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              <MdImage className="text-sm shrink-0" aria-hidden />
              <span className="text-xs font-semibold">
                {evidenceCount} imagem{evidenceCount === 1 ? "" : "ns"}
              </span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5">
              <MdShoppingCart className="text-sm shrink-0 text-emerald-300" aria-hidden />
              <span className="text-xs font-semibold text-emerald-200">Preencher compra abaixo</span>
            </span>
          </div>
        </header>

        <div className="shrink-0 border-b border-tegra-gray-medium bg-[#F7FAFC] px-4 py-2.5 sm:py-3 sm:px-6">
          <div className="flex items-start gap-2">
            <MdFactCheck className="mt-0.5 shrink-0 text-tegra-teal text-sm" aria-hidden />
            <p className="text-xs text-tegra-text-secondary">
              Preencha o formulário abaixo e envie — a tentativa{" "}
              <strong className="text-tegra-blue-dark">#{round}</strong> será registrada automaticamente.
            </p>
          </div>
          <p className="mt-2 line-clamp-2 rounded-lg border border-tegra-gray-medium/70 bg-white px-3 py-2 text-xs text-tegra-text-primary">
            {observacao}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5">
          <Compra
            embedded
            leadPrefill={leadPrefill}
            draftKey={`zoho_draft_compra_lead_${lead?.id || "temp"}_${round || 1}`}
            showSaveDraft={false}
            submitLabel={
              submitting
                ? "Registrando..."
                : "Registrar compra e tentativa"
            }
            onCancel={onClose}
            onSuccess={handleCompraSuccess}
          />
        </div>
      </div>
    </div>
  );
}
