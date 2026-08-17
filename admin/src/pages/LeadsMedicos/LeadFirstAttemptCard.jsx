import { useState } from "react";
import { MdSchedule, MdSend, MdThumbDown, MdPhoneMissed } from "react-icons/md";
import Button from "../../components/ui/Button";
import Textarea from "../../components/ui/Textarea";

const ROUND_COPY = {
  1: { title: "Primeira tentativa", send: "Enviar primeira tentativa" },
  2: { title: "Segunda tentativa", send: "Enviar segunda tentativa" },
  3: { title: "Terceira tentativa", send: "Enviar terceira tentativa" },
};

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function RoundHistory({ title, date, status, description }) {
  const noReturn = String(status || "").toLowerCase().includes("retorno");
  return (
    <div className="rounded-lg border border-tegra-gray-medium/70 bg-white px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-tegra-blue-dark">{title}</p>
        <p className="text-xs text-tegra-text-secondary">{formatWhen(date)}</p>
      </div>
      {status && (
        <p
          className={`mt-1 text-xs font-semibold ${
            noReturn ? "text-amber-700" : "text-teal-700"
          }`}
        >
          {status}
        </p>
      )}
      {description ? (
        <p className="mt-2 text-sm text-tegra-text-primary whitespace-pre-wrap">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function LeadFirstAttemptCard({
  lead,
  onSubmitAttempt,
  onSemRetorno,
  onSemInteresse,
  submitting,
}) {
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState("");

  const attempt = lead?.attempt || {};
  const round = attempt.currentRound;
  const copy = ROUND_COPY[round] || ROUND_COPY[1];
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
    await onSubmitAttempt(round, observacao.trim());
    setObservacao("");
  };

  const handleSemRetorno = async () => {
    const ok = window.confirm(
      `Marcar a ${copy.title.toLowerCase()} como Sem Retorno? O status no Zoho vai para Lead Sem Contato.`,
    );
    if (!ok) return;
    setError("");
    await onSemRetorno(round, observacao.trim());
    setObservacao("");
  };

  const handleSemInteresse = async () => {
    setError("");
    await onSemInteresse(observacao.trim());
    setObservacao("");
  };

  if (attempt.converted) {
    return (
      <section className="rounded-xl border border-green-200 bg-green-50/70 px-4 sm:px-5 py-5">
        <h2 className="text-base font-bold text-green-800">Lead convertido</h2>
        <p className="mt-1 text-sm text-tegra-text-secondary">
          Conversão recebida do Zoho em{" "}
          {lead.dataConversao
            ? new Date(lead.dataConversao).toLocaleDateString("pt-BR")
            : "—"}
          .
        </p>
      </section>
    );
  }

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

  const slaAccepted =
    lead?.slaStatus === "aceito" || lead?.slaStatus === "confirmado";
  if (!slaAccepted && !attempt.hasFirstAttempt) {
    return (
      <section className="rounded-xl border border-tegra-gray-medium/80 bg-tegra-bg-primary px-4 sm:px-5 py-5">
        <h2 className="text-base font-bold text-tegra-blue-dark">
          Tentativas de contato
        </h2>
        <p className="mt-1 text-sm text-tegra-text-secondary">
          Aceite o lead para registrar as tentativas e sincronizar o status no Zoho.
        </p>
      </section>
    );
  }

  const history = [
    attempt.hasFirstAttempt && {
      title: "Primeira tentativa",
      date: lead.dataPrimeiraTentativa,
      status: lead.statusPrimeiraTentativa,
      description: lead.descricaoPrimeiraTentativa,
    },
    attempt.hasSecondAttempt && {
      title: "Segunda tentativa",
      date: lead.dataSegundaTentativa,
      status: lead.statusSegundaTentativa,
      description: lead.descricaoSegundaTentativa,
    },
    attempt.hasThirdAttempt && {
      title: "Terceira tentativa",
      date: lead.dataTerceiraTentativa,
      status: lead.statusTerceiraTentativa,
      description: lead.descricaoTerceiraTentativa,
    },
  ].filter(Boolean);

  return (
    <section
      aria-label="Tentativas de contato"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-4 border-b border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-tegra-blue-dark">
            {attempt.canRegisterAttempt ? copy.title : "Tentativas de contato"}
          </h2>
          <p className="mt-0.5 text-sm text-tegra-text-secondary">
            {attempt.windowLabel}
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
        {history.length > 0 && (
          <div className="space-y-2">
            {history.map((item) => (
              <RoundHistory key={item.title} {...item} />
            ))}
          </div>
        )}

        {attempt.canRegisterAttempt ? (
          <>
            <Textarea
              label="Observação do contato"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Ligação realizada, médico solicitou retorno na próxima semana..."
              rows={4}
              required
              error={error}
              disabled={submitting}
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
                variant="secondary"
                className="inline-flex items-center justify-center gap-2"
                disabled={submitting}
                onClick={handleSemRetorno}
              >
                <MdPhoneMissed aria-hidden />
                Sem retorno
              </Button>
              <Button
                variant="teal"
                className="inline-flex items-center justify-center gap-2"
                loading={submitting}
                onClick={handleAttempt}
              >
                <MdSend aria-hidden />
                {copy.send}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-end">
            <Button
              variant="danger"
              className="inline-flex items-center justify-center gap-2"
              disabled={submitting}
              onClick={handleSemInteresse}
            >
              <MdThumbDown aria-hidden />
              Lead sem interesse
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
