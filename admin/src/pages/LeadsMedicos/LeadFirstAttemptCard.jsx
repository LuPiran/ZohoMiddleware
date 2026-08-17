import { useState } from "react";
import { MdPhoneMissed, MdSchedule, MdSend, MdThumbDown } from "react-icons/md";
import Button from "../../components/ui/Button";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../components/feedback/auth/ToastContainer";

const MIN_OBSERVACAO = 10;

const ROUND_COPY = {
  1: { title: "Primeira tentativa", send: "Enviar primeira tentativa" },
  2: { title: "Segunda tentativa", send: "Enviar segunda tentativa" },
  3: { title: "Terceira tentativa", send: "Enviar terceira tentativa" },
};

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function formatDeadline(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function DaysRemainingChip({ days, expired, deadlineAt }) {
  const value = days === null ? "—" : days < 0 ? 0 : days;
  const urgent = expired || (typeof days === "number" && days <= 5);
  const deadlineLabel = formatDeadline(deadlineAt);

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-2xl border px-3 py-2 ${
        urgent
          ? "border-[#E5989B]/55 bg-[#FBE9EA]"
          : "border-[#E5989B]/35 bg-[#F7F1F2]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          urgent ? "bg-[#E07076]" : "bg-[#E5989B]"
        }`}
        aria-hidden
      >
        <MdSchedule className="text-lg text-white" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tegra-text-secondary">
          Dias até o fim da tentativa
        </p>
        <p className="text-lg font-bold tabular-nums leading-none text-tegra-blue-dark">
          {value}
          <span className="ml-1 text-xs font-medium text-tegra-text-secondary">
            dias
          </span>
        </p>
        {deadlineLabel && (
          <p className="mt-1 text-[11px] text-tegra-text-secondary">
            {expired ? "Prazo encerrado em " : "Até "}
            {deadlineLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LeadFirstAttemptCard({
  lead,
  onSubmitAttempt,
  onSemInteresse,
  onSemContato,
  submitting,
}) {
  const { showToast } = useToast();
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState("");

  const attempt = lead?.attempt || {};
  const round = attempt.currentRound;
  const copy = ROUND_COPY[round] || ROUND_COPY[1];
  const days =
    typeof attempt.daysRemaining === "number" ? attempt.daysRemaining : null;

  const validateObservacao = () => {
    const note = observacao.trim();
    if (!note) {
      const message =
        "Para enviar uma tentativa ou lead sem interesse, adicione uma observação";
      setError(message);
      showToast(message, "error", 3500);
      return null;
    }
    if (note.length < MIN_OBSERVACAO) {
      const message =
        "Observação da tentativa deve ter pelo menos 10 caracteres";
      setError(message);
      showToast(message, "warning", 3500);
      return null;
    }
    setError("");
    return note;
  };

  const handleAttempt = async () => {
    const note = validateObservacao();
    if (!note) return;
    await onSubmitAttempt(round, note);
    setObservacao("");
  };

  const handleSemInteresse = async () => {
    const note = validateObservacao();
    if (!note) return;
    await onSemInteresse(note);
  };

  const handleSemContato = async () => {
    await onSemContato();
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
          Aceite o lead para registrar as tentativas. O prazo de 1 mês começa na
          qualificação.
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

  const showCountdown = Boolean(attempt.currentRound || attempt.deadlineAt);

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

        {showCountdown && (
          <DaysRemainingChip
            days={days}
            expired={attempt.expired}
            deadlineAt={attempt.deadlineAt}
          />
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {history.length > 0 && (
          <div className="space-y-2">
            {history.map((item) => (
              <RoundHistory key={item.title} {...item} />
            ))}
          </div>
        )}

        {round ? (
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
              {attempt.canMarkSemContato && (
                <Button
                  variant="warning"
                  className="inline-flex items-center justify-center gap-2"
                  disabled={submitting}
                  onClick={handleSemContato}
                >
                  <MdPhoneMissed aria-hidden />
                  Lead sem contato
                </Button>
              )}
              <Button
                variant="danger"
                className="inline-flex items-center justify-center gap-2"
                disabled={submitting}
                onClick={handleSemInteresse}
              >
                <MdThumbDown aria-hidden />
                Lead sem interesse
              </Button>
              {attempt.canRegisterAttempt && (
                <Button
                  variant="teal"
                  className="inline-flex items-center justify-center gap-2"
                  loading={submitting}
                  onClick={handleAttempt}
                >
                  <MdSend aria-hidden />
                  {copy.send}
                </Button>
              )}
            </div>
          </>
        ) : attempt.canMarkSemContato ? (
          <div className="flex justify-end">
            <Button
              variant="warning"
              className="inline-flex items-center justify-center gap-2"
              disabled={submitting}
              onClick={handleSemContato}
            >
              <MdPhoneMissed aria-hidden />
              Lead sem contato
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
