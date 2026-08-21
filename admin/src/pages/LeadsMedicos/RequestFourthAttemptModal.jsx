import { useMemo, useState } from "react";
import { MdCalendarToday, MdClose, MdSend } from "react-icons/md";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import EvidenceUploader from "./EvidenceUploader";

const MIN_MOTIVO = 10;

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export default function RequestFourthAttemptModal({ open, onClose, onConfirm, submitting }) {
  const { showToast } = useToast();
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  const { minDate, maxDate } = useMemo(() => {
    const min = new Date();
    min.setDate(min.getDate() + 1);
    const max = new Date();
    max.setMonth(max.getMonth() + 1);
    return { minDate: toDateOnly(min), maxDate: toDateOnly(max) };
  }, []);

  if (!open) return null;

  const resetForm = () => {
    setData("");
    setMotivo("");
    setFiles([]);
    setErrors({});
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    const nextErrors = {};
    if (!data) nextErrors.data = "Informe a data da 4ª tentativa.";
    const motivoTrim = motivo.trim();
    if (!motivoTrim || motivoTrim.length < MIN_MOTIVO) {
      nextErrors.motivo = `O motivo deve ter pelo menos ${MIN_MOTIVO} caracteres.`;
    }
    if (!files.length) {
      nextErrors.files = "Envie pelo menos 1 imagem de evidência.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      showToast(Object.values(nextErrors)[0], "error", 3500);
      return;
    }

    await onConfirm({
      dataQuartaTentativa: `${data}T12:00:00`,
      motivo: motivoTrim,
      files,
    });
    resetForm();
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0B2340]/55 backdrop-blur-[2px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-4a-tentativa-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-tegra-gray-medium px-5 py-4">
          <div>
            <h2 id="request-4a-tentativa-title" className="text-lg font-bold text-tegra-blue-dark">
              Solicitar 4ª tentativa
            </h2>
            <p className="mt-0.5 text-sm text-tegra-text-secondary">
              Sem aprovação — a rodada abre assim que você confirmar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="shrink-0 rounded-lg p-1.5 text-tegra-text-secondary transition hover:bg-tegra-gray-light disabled:opacity-40"
            aria-label="Fechar"
          >
            <MdClose className="text-xl" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Input
            label="Data da 4ª tentativa"
            type="date"
            value={data}
            min={minDate}
            max={maxDate}
            onChange={(e) => setData(e.target.value)}
            icon={<MdCalendarToday className="text-xl" />}
            required
            error={errors.data}
            disabled={submitting}
          />
          <p className="-mt-2 text-xs text-tegra-text-secondary">
            Até 1 mês a partir de hoje.
          </p>

          <Textarea
            label="Por que você está solicitando essa tentativa?"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: médico pediu para retornar após o período de férias..."
            rows={4}
            required
            error={errors.motivo}
            disabled={submitting}
          />

          <EvidenceUploader
            files={files}
            onChange={setFiles}
            disabled={submitting}
            error={errors.files}
          />
        </div>

        <footer className="shrink-0 flex justify-end gap-3 border-t border-tegra-gray-medium px-5 py-4">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="teal"
            className="inline-flex items-center justify-center gap-2"
            loading={submitting}
            onClick={handleConfirm}
          >
            <MdSend aria-hidden />
            Solicitar 4ª tentativa
          </Button>
        </footer>
      </div>
    </div>
  );
}
