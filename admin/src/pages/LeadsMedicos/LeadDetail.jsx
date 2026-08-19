import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdPhoneMissed, MdThumbDown } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";
import { leadsMedicosService } from "../../services/leadsMedicos";
import LeadTimeline from "./LeadTimeline";
import LeadDetailsCard from "./LeadDetailsCard";
import LeadFirstAttemptCard from "./LeadFirstAttemptCard";
import LeadHistory from "./LeadHistory";

function isOfferedStatus(status) {
  return status === "ofertado" || status === "pendente";
}

function isAcceptedStatus(status) {
  return status === "aceito" || status === "confirmado";
}

function SlaTimer({ lead, onAccept, onRefuse, submitting }) {
  const { slaStatus, slaDeadline } = lead;
  const [remaining, setRemaining] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOfferedStatus(slaStatus) || !slaDeadline) {
      setRemaining(null);
      return;
    }

    function tick() {
      const diff = new Date(slaDeadline).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [slaStatus, slaDeadline]);

  if (slaStatus === "aguardando_horario" || !slaStatus) return null;

  if (isAcceptedStatus(slaStatus)) {
    return null;
  }

  if (
    slaStatus === "expirado" ||
    slaStatus === "reatribuido" ||
    slaStatus === "expirado_ciclo"
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
        <span className="text-red-500 text-lg">✕</span>
        <p className="text-sm font-semibold text-red-700">
          {slaStatus === "expirado_ciclo"
            ? "Ciclo encerrado — ninguém restou na fila para aceitar este lead"
            : "Oferta expirada ou redistribuída"}
        </p>
      </div>
    );
  }

  if (isOfferedStatus(slaStatus) && remaining !== null) {
    const totalSecs = Math.floor(remaining / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const isUrgent = remaining < 2 * 60 * 1000;
    const isWarning = remaining < 5 * 60 * 1000;

    const colorClass = isUrgent
      ? "border-red-300 bg-red-50 text-red-700"
      : isWarning
        ? "border-yellow-300 bg-yellow-50 text-yellow-700"
        : "border-teal-200 bg-teal-50 text-teal-700";

    const labelColor = isUrgent
      ? "text-red-600"
      : isWarning
        ? "text-yellow-600"
        : "text-teal-600";

    return (
      <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${colorClass}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold tabular-nums">{display}</span>
          <div>
            <p className="text-sm font-semibold">Este lead foi oferecido a você</p>
            <p className={`text-xs ${labelColor}`}>
              {remaining === 0
                ? "Prazo encerrado — será redistribuído"
                : "Aceite para assumir a carteira, ou recuse para passar adiante"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={submitting || remaining === 0}
            onClick={onRefuse}
            className="inline-flex items-center rounded-lg border border-current/30 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Recusar
          </button>
          <button
            type="button"
            disabled={submitting || remaining === 0}
            onClick={onAccept}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Aceitar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmModal, setConfirmModal] = useState(null); // { type: "semContato" | "semInteresse", files, observacao }

  const loadLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await leadsMedicosService.getById(id);
      setLead(result.data);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Não foi possível carregar o lead.";
      setError(message);
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  useEffect(() => {
    function onOfferChanged(event) {
      if (event.detail?.id && event.detail.id === id) {
        loadLead();
      }
    }
    window.addEventListener("sla-offer-changed", onOfferChanged);
    return () => window.removeEventListener("sla-offer-changed", onOfferChanged);
  }, [id, loadLead]);

  const handleAttempt = async (round, observacao, files) => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.registrarTentativa(
        id,
        round,
        observacao,
        files,
      );
      setLead(result.data);
      showToast(
        "Compra registrada e tentativa enviada ao Zoho",
        "success",
        3000,
      );
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao registrar tentativa";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.aceitarOferta(id);
      setLead(result.data);
      showToast("Lead aceito. Ele entrou na sua carteira.", "success", 2500);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao aceitar o lead";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    setSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("sla-offer-optimistic-refuse", { detail: { id } }),
    );
    navigate(ROUTES.LEADS_MEDICOS);
    try {
      await leadsMedicosService.recusarOferta(id);
      showToast("Oferta recusada. O lead segue para o próximo consultor.", "success", 2500);
      window.dispatchEvent(
        new CustomEvent("sla-offer-changed", { detail: { id, action: "recusar" } }),
      );
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao recusar o lead";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSemInteresse = (observacao, files) => {
    setConfirmModal({ type: "semInteresse", observacao, files });
  };

  const handleSemContato = (files) => {
    setConfirmModal({ type: "semContato", files });
  };

  const executeConfirmed = async () => {
    if (!confirmModal) return;
    const { type, observacao, files } = confirmModal;
    setConfirmModal(null);
    setSubmitting(true);
    try {
      if (type === "semInteresse") {
        const result = await leadsMedicosService.marcarSemInteresse(id, observacao, files);
        setLead(result.data);
        showToast("Lead marcado como sem interesse", "success", 2500);
      } else if (type === "semContato") {
        const result = await leadsMedicosService.marcarSemContato(id, files);
        setLead(result.data);
        showToast("Lead marcado como sem contato", "success", 2500);
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao atualizar o lead";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(ROUTES.LEADS_MEDICOS)}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-tegra-gray-medium text-tegra-blue-dark hover:bg-tegra-gray-light transition cursor-pointer"
              aria-label="Voltar para lista de leads"
            >
              <MdArrowBack className="text-xl" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-tegra-text-secondary">
                <Link
                  to={ROUTES.LEADS_MEDICOS}
                  className="hover:text-tegra-teal transition"
                >
                  Leads Médicos
                </Link>
                <span className="mx-1.5">/</span>
                Visualizar
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary truncate">
                {lead?.nome || (loading ? "Carregando…" : "Detalhe do lead")}
              </h1>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={loadLead}
            disabled={loading || submitting}
            className="shrink-0"
          >
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-tegra-gray-medium/80 bg-tegra-bg-primary px-4 py-16 text-center shadow-sm">
            <p className="font-medium text-tegra-text-primary">
              Carregando lead…
            </p>
            <p className="mt-1 text-sm text-tegra-text-secondary">
              Montando timeline, dados e histórico.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-12 text-center">
            <p className="font-medium text-tegra-error">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => navigate(ROUTES.LEADS_MEDICOS)}>
                Voltar à lista
              </Button>
              <Button onClick={loadLead}>Tentar novamente</Button>
            </div>
          </div>
        ) : (
          <>
            <SlaTimer
              lead={lead}
              onAccept={handleAccept}
              onRefuse={handleRefuse}
              submitting={submitting}
            />
            <LeadTimeline timeline={lead.timeline} />
            <LeadDetailsCard lead={lead} />
            <LeadFirstAttemptCard
              lead={lead}
              submitting={submitting}
              onSubmitAttempt={handleAttempt}
              onSemInteresse={handleSemInteresse}
              onSemContato={handleSemContato}
            />
            <LeadHistory historico={lead.historico} />
          </>
        )}
      </div>

      {/* Modal de confirmação — sem contato */}
      <ConfirmModal
        open={confirmModal?.type === "semContato"}
        title="Lead sem contato"
        description="Confirmar que não foi possível contato com este lead? O status passará para Lead Sem Contato."
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        variant="warning"
        icon={<MdPhoneMissed className="text-lg" />}
        onConfirm={executeConfirmed}
        onCancel={() => setConfirmModal(null)}
      />

      {/* Modal de confirmação — sem interesse */}
      <ConfirmModal
        open={confirmModal?.type === "semInteresse"}
        title="Lead sem interesse"
        description="Confirmar que este lead não tem interesse? Esta ação encerra o funil de atendimento."
        confirmLabel="Encerrar funil"
        cancelLabel="Cancelar"
        variant="danger"
        icon={<MdThumbDown className="text-lg" />}
        onConfirm={executeConfirmed}
        onCancel={() => setConfirmModal(null)}
      />
    </MainLayout>
  );
}
