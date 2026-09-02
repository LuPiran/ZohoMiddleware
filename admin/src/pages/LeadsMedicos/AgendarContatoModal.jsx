import { useMemo, useState } from "react";
import { MdCalendarToday, MdClose, MdEventAvailable } from "react-icons/md";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/feedback/auth/ToastContainer";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export default function AgendarContatoModal({ open, onClose, onConfirm, submitting }) {
  const { showToast } = useToast();
  const [data, setData] = useState("");
  const [error, setError] = useState("");

  const minDate = useMemo(() => toDateOnly(new Date()), []);

  if (!open) return null;

  const resetForm = () => {
    setData("");
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    if (!data) {
      const message = "Informe o dia do próximo contato.";
      setError(message);
      showToast(message, "error", 3500);
      return;
    }
    await onConfirm({ data: `${data}T12:00:00` });
    resetForm();
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0B2340]/55 backdrop-blur-[2px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agendar-contato-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-tegra-gray-medium px-5 py-4">
          <div>
            <h2 id="agendar-contato-title" className="text-lg font-bold text-tegra-blue-dark">
              Agendar próximo contato
            </h2>
            <p className="mt-0.5 text-sm text-tegra-text-secondary">
              Só guarda a data — não conta como tentativa tratada.
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <Input
            label="Dia do próximo contato"
            type="date"
            value={data}
            min={minDate}
            onChange={(e) => setData(e.target.value)}
            icon={<MdCalendarToday className="text-xl" />}
            required
            error={error}
            disabled={submitting}
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
            <MdEventAvailable aria-hidden />
            Agendar
          </Button>
        </footer>
      </div>
    </div>
  );
}
