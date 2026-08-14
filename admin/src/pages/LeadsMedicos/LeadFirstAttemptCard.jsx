import { useState } from "react";
import { MdSchedule, MdSend, MdThumbDown } from "react-icons/md";
import Button from "../../components/ui/Button";
import Textarea from "../../components/ui/Textarea";

export default function LeadFirstAttemptCard({
  lead,
  onSubmitAttempt,
  onSemInteresse,
  submitting,
}) {
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState("");

  const attempt = lead?.attempt || {};
  const days =
    typeof attempt.daysSinceQualification === "number"
      ? attempt.daysSinceQualification
      : null;

  const handleAttempt = async () => {
    if (!observacao.trim() || observacao.trim().length < 3) {
      setError("Descreva o contato realizado (mínimo 3 caracteres).");
      return;
    }
    setError("");
    await onSubmitAttempt(observacao.trim());
    setObservacao("");
  };

  const handleSemInteresse = async () => {
    setError("");
    await onSemInteresse(observacao.trim());
    setObservacao("");
  };

  if (attempt.hasSemInteresse) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50/60 px-4 sm:px-5 py-5">
        <h2 className="text-base font-bold text-tegra-error">Lead sem interesse</h2>
        <p className="mt-1 text-sm text-tegra-text-secondary">
          Este lead foi encerrado em{" "}
          {lead.dataSemInteresse
            ? new Date(lead.dataSemInteresse).toLocaleDateString("pt-BR")
            : "—"}
          .
        </p>
      </section>
    );
  }

  if (attempt.hasFirstAttempt) {
    return (
      <section className="rounded-xl border border-tegra-teal/30 bg-tegra-teal/5 px-4 sm:px-5 py-5">
        <h2 className="text-base font-bold text-tegra-blue-dark">
          Primeira tentativa registrada
        </h2>
        <p className="mt-1 text-sm text-tegra-text-secondary">
          Em{" "}
          {lead.dataPrimeiraTentativa
            ? new Date(lead.dataPrimeiraTentativa).toLocaleString("pt-BR")
            : "—"}
        </p>
        {lead.descricaoPrimeiraTentativa && (
          <p className="mt-3 text-sm text-tegra-text-primary whitespace-pre-wrap rounded-lg bg-white border border-tegra-gray-medium/70 px-3 py-2.5">
            {lead.descricaoPrimeiraTentativa}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Primeira tentativa de contato"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-tegra-blue-dark">
            Primeira tentativa
          </h2>
          <p className="mt-0.5 text-sm text-tegra-text-secondary">
            {attempt.windowLabel ||
              "Registre o contato a partir da data de qualificação"}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-tegra-teal/25 bg-tegra-teal/10 px-3 py-2 text-tegra-blue-dark">
          <MdSchedule className="text-xl text-tegra-teal" aria-hidden />
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-tegra-text-secondary">
              Dias desde a qualificação
            </p>
            <p className="text-lg font-bold tabular-nums leading-none">
              {days === null ? "—" : days < 0 ? 0 : days}
              <span className="ml-1 text-xs font-medium text-tegra-text-secondary">
                dias
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <Textarea
          label="Observação do contato"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: Ligação realizada, médico solicitou retorno na próxima semana..."
          rows={4}
          required
          error={error}
          disabled={submitting || !attempt.canRegisterFirstAttempt}
        />

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            variant="danger"
            className="inline-flex items-center justify-center gap-2"
            disabled={submitting}
            onClick={handleSemInteresse}
          >
            <MdThumbDown aria-hidden />
            Lead sem interesse
          </Button>
          <Button
            variant="teal"
            className="inline-flex items-center justify-center gap-2"
            loading={submitting}
            disabled={!attempt.canRegisterFirstAttempt}
            onClick={handleAttempt}
          >
            <MdSend aria-hidden />
            Enviar primeira tentativa
          </Button>
        </div>
      </div>
    </section>
  );
}
