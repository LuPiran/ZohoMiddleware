import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAddAlarm,
  MdPhoneMissed,
  MdSchedule,
  MdSend,
  MdShoppingCart,
  MdThumbDown,
} from "react-icons/md";
import Button from "../../components/ui/Button";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";
import { setPendingLeadAttemptFiles } from "../../services/leadAttemptTransfer";
import EvidenceUploader, { EvidenceGallery } from "./EvidenceUploader";
import RequestFourthAttemptModal from "./RequestFourthAttemptModal";
import { buildLeadPrefill } from "./leadPrefill";

const MIN_OBSERVACAO = 10;

const ROUND_COPY = {
  1: {
    title: "Primeira tentativa",
    send: "Continuar para compra",
    hint: "Observação, evidência e compra são obrigatórias.",
  },
  2: {
    title: "Segunda tentativa",
    send: "Continuar para compra",
    hint: "Observação, evidência e compra são obrigatórias.",
  },
  3: {
    title: "Terceira tentativa",
    send: "Continuar para compra",
    hint: "Observação, evidência e compra são obrigatórias.",
  },
  4: {
    title: "Quarta tentativa",
    send: "Continuar para compra",
    hint: "Observação, evidência e compra são obrigatórias.",
  },
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

function RoundHistory({ title, date, status, description, evidencias, leadId }) {
  const noReturn = String(status || "").toLowerCase().includes("retorno");
  const isPositive = status && !noReturn;

  return (
    <div className="rounded-xl border border-tegra-gray-medium/50 bg-white overflow-hidden">
      {/* Cabeçalho com barra colorida */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-tegra-gray-medium/30"
        style={{ background: isPositive ? "#f0faf8" : noReturn ? "#fffbeb" : "#f8fafc" }}
      >
        <p className="text-sm font-bold text-tegra-blue-dark">{title}</p>
        <p className="text-[11px] text-tegra-text-secondary">{formatWhen(date)}</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {status && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isPositive
                ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                : noReturn
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {status}
          </span>
        )}
        {description && (
          <p className="text-sm text-tegra-text-primary whitespace-pre-wrap leading-relaxed">
            {description}
          </p>
        )}
        {evidencias?.length ? (
          <div className="pt-1">
            <EvidenceGallery evidencias={evidencias} leadId={leadId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DaysRemainingChip({ days, expired, deadlineAt }) {
  const value = days === null ? "—" : days < 0 ? 0 : days;
  const urgent = expired || (typeof days === "number" && days <= 5);
  const deadlineLabel = formatDeadline(deadlineAt);

  return (
    <>
      {/* Mobile: pill compacto */}
      <div
        className={`sm:hidden inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${
          urgent
            ? "border-[#E5989B]/55 bg-[#FBE9EA]"
            : "border-[#E5989B]/35 bg-[#F7F1F2]"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            urgent ? "bg-[#E07076]" : "bg-[#E5989B]"
          }`}
          aria-hidden
        >
          <MdSchedule className="text-xs text-white" />
        </span>
        <div className="leading-none">
          <span className="text-sm font-bold tabular-nums text-tegra-blue-dark">
            {value} dias
          </span>
          {deadlineLabel && (
            <span className="ml-1.5 text-[11px] text-tegra-text-secondary">
              · {expired ? "encerrado em " : "até "}{deadlineLabel}
            </span>
          )}
        </div>
      </div>

      {/* Desktop: chip original */}
      <div
        className={`hidden sm:inline-flex items-center gap-2.5 rounded-2xl border px-3 py-2 ${
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
    </>
  );
}

export default function LeadFirstAttemptCard({
  lead,
  onSemInteresse,
  onSemContato,
  onRequestFourthAttempt,
  submitting,
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [fourthAttemptModalOpen, setFourthAttemptModalOpen] = useState(false);

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

  const validateEvidencias = () => {
    if (!files.length) {
      const message = "Envie pelo menos 1 imagem de evidência (máximo 5).";
      setFileError(message);
      showToast(message, "error", 3500);
      return false;
    }
    setFileError("");
    return true;
  };

  const resetForm = () => {
    setObservacao("");
    setFiles([]);
    setFileError("");
  };

  const handleAttempt = () => {
    const note = validateObservacao();
    if (!note || !validateEvidencias()) return;

    // Arquivos não cabem em location.state (limite de ~640KB do pushState) —
    // ficam num singleton de módulo que a página /compra recolhe ao montar.
    setPendingLeadAttemptFiles(files);
    navigate(ROUTES.COMPRA, {
      state: {
        leadAttemptContext: {
          leadId: lead.id,
          round,
          roundLabel: copy.title,
          observacao: note,
          leadPrefill: buildLeadPrefill(lead),
          draftKey: `zoho_draft_compra_lead_${lead.id}_${round}`,
        },
      },
    });
  };

  const handleRequestFourthAttempt = async (payload) => {
    await onRequestFourthAttempt(payload);
    setFourthAttemptModalOpen(false);
  };

  const handleSemInteresse = async () => {
    const note = validateObservacao();
    if (!note || !validateEvidencias()) return;
    await onSemInteresse(note, files);
    resetForm();
  };

  const handleSemContato = async () => {
    if (!validateEvidencias()) return;
    await onSemContato(files);
    resetForm();
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
        <div className="mt-4">
          <EvidenceGallery evidencias={lead.evidencias} leadId={lead.id} />
        </div>
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
        <div className="mt-4">
          <EvidenceGallery evidencias={lead.evidencias} leadId={lead.id} />
        </div>
      </section>
    );
  }

  if (attempt.hasSemTratativa) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50/60 px-4 sm:px-5 py-5">
        <h2 className="text-base font-bold text-tegra-error">Lead sem tratativa</h2>
        <p className="mt-1 text-sm text-tegra-text-secondary">
          Nenhuma tentativa foi tratada dentro do prazo. Encerrado em{" "}
          {lead.dataLeadSemTratativa
            ? new Date(lead.dataLeadSemTratativa).toLocaleDateString("pt-BR")
            : "—"}
          .
        </p>
        <div className="mt-4">
          <EvidenceGallery evidencias={lead.evidencias} leadId={lead.id} />
        </div>
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

  const evidencias = Array.isArray(lead?.evidencias) ? lead.evidencias : [];
  const evidenciasByRound = (n) =>
    evidencias.filter((item) => Number(item.round) === n && item.acao === "tentativa");

  const history = [
    attempt.hasFirstAttempt && {
      title: "Primeira tentativa",
      date: lead.dataPrimeiraTentativa,
      status: lead.statusPrimeiraTentativa,
      description: lead.descricaoPrimeiraTentativa,
      evidencias: evidenciasByRound(1),
    },
    attempt.hasSecondAttempt && {
      title: "Segunda tentativa",
      date: lead.dataSegundaTentativa,
      status: lead.statusSegundaTentativa,
      description: lead.descricaoSegundaTentativa,
      evidencias: evidenciasByRound(2),
    },
    attempt.hasThirdAttempt && {
      title: "Terceira tentativa",
      date: lead.dataTerceiraTentativa,
      status: lead.statusTerceiraTentativa,
      description: lead.descricaoTerceiraTentativa,
      evidencias: evidenciasByRound(3),
    },
    attempt.hasFourthAttempt && {
      title: "Quarta tentativa",
      date: lead.dataQuartaTentativa,
      status: lead.statusQuartaTentativa,
      description: lead.descricaoQuartaTentativa,
      evidencias: evidenciasByRound(4),
    },
  ].filter(Boolean);

  const showCountdown = Boolean(attempt.currentRound || attempt.deadlineAt);
  const canRequestFourth = round === 3 && attempt.canRequestFourthAttempt;

  return (
    <section
      aria-label="Tentativas de contato"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-tegra-gray-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
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

      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
        {history.length > 0 && (
          <div className="space-y-2">
            {history.map((item) => (
              <RoundHistory key={item.title} leadId={lead.id} {...item} />
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

            <EvidenceUploader
              files={files}
              onChange={setFiles}
              disabled={submitting}
              error={fileError}
            />

            {attempt.canRegisterAttempt && copy.hint && (
              <p className="flex items-start gap-2 rounded-lg border border-tegra-teal/25 bg-tegra-teal/5 px-3 py-2.5 text-xs text-tegra-text-secondary">
                <MdShoppingCart className="mt-0.5 shrink-0 text-tegra-teal" aria-hidden />
                <span>{copy.hint} Ao continuar, você será direcionado para o formulário de compra.</span>
              </p>
            )}

            {/* Mobile: botões secundários lado a lado + primário full-width */}
            <div className="sm:hidden space-y-2">
              <div className="flex gap-2">
                {attempt.canMarkSemContato && (
                  <Button
                    variant="warning"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm"
                    disabled={submitting}
                    onClick={handleSemContato}
                  >
                    <MdPhoneMissed aria-hidden />
                    Sem contato
                  </Button>
                )}
                <Button
                  variant="danger"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm"
                  disabled={submitting}
                  onClick={handleSemInteresse}
                >
                  <MdThumbDown aria-hidden />
                  Sem interesse
                </Button>
              </div>
              {canRequestFourth && (
                <Button
                  variant="secondary"
                  className="w-full inline-flex items-center justify-center gap-1.5 text-sm"
                  disabled={submitting}
                  onClick={() => setFourthAttemptModalOpen(true)}
                >
                  <MdAddAlarm aria-hidden />
                  Solicitar 4ª tentativa
                </Button>
              )}
              {attempt.canRegisterAttempt && (
                <Button
                  variant="teal"
                  className="w-full inline-flex items-center justify-center gap-2"
                  loading={submitting}
                  onClick={handleAttempt}
                >
                  <MdSend aria-hidden />
                  Continuar para compra
                </Button>
              )}
            </div>

            {/* Desktop: botões em linha (layout original) */}
            <div className="hidden sm:flex gap-3 justify-end">
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
              {canRequestFourth && (
                <Button
                  variant="secondary"
                  className="inline-flex items-center justify-center gap-2"
                  disabled={submitting}
                  onClick={() => setFourthAttemptModalOpen(true)}
                >
                  <MdAddAlarm aria-hidden />
                  Solicitar 4ª tentativa
                </Button>
              )}
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
          <div className="space-y-4">
            <EvidenceUploader
              files={files}
              onChange={setFiles}
              disabled={submitting}
              error={fileError}
            />
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
          </div>
        ) : null}
      </div>

      <RequestFourthAttemptModal
        open={fourthAttemptModalOpen}
        onClose={() => !submitting && setFourthAttemptModalOpen(false)}
        onConfirm={handleRequestFourthAttempt}
        submitting={submitting}
      />
    </section>
  );
}
