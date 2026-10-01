import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdDeleteForever, MdEdit, MdPhoneMissed, MdSchedule, MdThumbDown } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import RecusarOfertaModal from "../../components/ui/RecusarOfertaModal";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";
import { leadsMedicosService } from "../../services/leadsMedicos";
import LeadTimeline from "./LeadTimeline";
import LeadDetailsCard from "./LeadDetailsCard";
import LeadFirstAttemptCard from "./LeadFirstAttemptCard";
import LeadHistory from "./LeadHistory";
import { businessMsRemaining } from "../../utils/businessTime";
import { hasAdminPanelPermission } from "../../utils/permissions";
import LeadEditModal from "./LeadEditModal";

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
      // Congela no fim de semana e só volta a descer na segunda — o prazo
      // real (backend) já pula sábado/domingo (ver businessTime.js).
      setRemaining(businessMsRemaining(slaDeadline));
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [slaStatus, slaDeadline]);

  if (slaStatus === "aguardando_horario" || !slaStatus) return null;

  if (isAcceptedStatus(slaStatus)) {
    return null;
  }

  if (slaStatus === "rejeitado") {
    const porTimeout = lead.motivoRejeicao === "expirado";
    return (
      <div className="rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 flex items-center gap-3">
        <span className="text-gray-500 text-lg">✕</span>
        <p className="text-sm font-semibold text-gray-700">
          {porTimeout
            ? "Lead sem resposta em 48h — encerrado no Portal e devolvido ao Zoho, não retorna à fila"
            : "Lead recusado pelo consultor — encerrado no Portal e devolvido ao Zoho, não retorna à fila"}
        </p>
      </div>
    );
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
    const hours = Math.floor(totalSecs / 3600);
    const mins  = Math.floor((totalSecs % 3600) / 60);
    const secs  = totalSecs % 60;
    const display = hours >= 1
      ? `${hours}h ${String(mins).padStart(2, "0")}m`
      : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
  const [showRecusarModal, setShowRecusarModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Registrar a tentativa em si acontece do outro lado da navegação, na
  // página /compra (ver LeadFirstAttemptCard -> Compra.jsx) — o consultor
  // sai desta tela e volta para cá quando a compra + tentativa forem concluídas.

  const handleRequestFourthAttempt = async ({ dataQuartaTentativa, motivo, files }) => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.solicitarQuartaTentativa(id, {
        dataQuartaTentativa,
        motivo,
        files,
      });
      setLead(result.data);
      showToast("4ª tentativa solicitada e enviada ao Zoho", "success", 3000);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao solicitar a 4ª tentativa";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleAgendamento = async ({ data }) => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.agendarContato(id, data);
      setLead(result.data);
      showToast("Contato agendado", "success", 2500);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao agendar contato";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEncaminharMkt = async (observacao, files) => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.registrarTentativa(
        id,
        lead?.attempt?.currentRound,
        observacao,
        files,
        null,
        "mkt",
      );
      setLead(result.data);
      showToast("Lead encaminhado ao Marketing", "success", 3000);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao encaminhar o lead para o Marketing";
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

  const handleAdvanceTime = async () => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.avancarTempo(id);
      setLead(result.data);
      showToast(
        "Prazo ajustado — vira em ~10 segundos. Aguarde e clique em Atualizar.",
        "success",
        4500,
      );
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao avançar o tempo do lead";
      showToast(message, "error", 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefuse = () => {
    setShowRecusarModal(true);
  };

  const executeRefuse = async (motivo) => {
    setShowRecusarModal(false);
    setSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("sla-offer-optimistic-refuse", { detail: { id } }),
    );
    navigate(ROUTES.LEADS_MEDICOS);
    try {
      await leadsMedicosService.recusarOferta(id, motivo);
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

  const handleDeleteLead = async () => {
    setDeleting(true);
    try {
      await leadsMedicosService.excluirLead(id);
      showToast("Lead excluído.", "success", 2500);
      navigate(ROUTES.LEADS_MEDICOS);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Não foi possível excluir o lead.";
      showToast(message, "error", 3500);
      setDeleting(false);
      setShowDeleteModal(false);
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
          <div className="flex shrink-0 items-center gap-2">
            {hasAdminPanelPermission() && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowEditModal(true)}
                  disabled={loading || submitting || deleting || !lead}
                  className="inline-flex items-center gap-1.5"
                >
                  <MdEdit aria-hidden />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={loading || submitting || deleting}
                >
                  Excluir lead
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              onClick={loadLead}
              disabled={loading || submitting}
            >
              Atualizar
            </Button>
          </div>
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
            {import.meta.env.VITE_ALLOW_LEAD_TIME_TRAVEL === "true" && hasAdminPanelPermission() && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    Ferramenta de teste — só nesse ambiente
                  </p>
                  <p className="text-xs text-amber-800">
                    Força o prazo ativo deste lead (oferta ou tentativa) a expirar em ~10s,
                    pra ver o sistema reagir de verdade (sweeper, e-mail, redistribuição).
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAdvanceTime}
                  disabled={submitting}
                  className="inline-flex shrink-0 items-center gap-1.5 border-amber-400 text-amber-900 hover:bg-amber-100"
                >
                  <MdSchedule aria-hidden />
                  Avançar tempo (teste)
                </Button>
              </div>
            )}
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
              onSemInteresse={handleSemInteresse}
              onSemContato={handleSemContato}
              onRequestFourthAttempt={handleRequestFourthAttempt}
              onScheduleAgendamento={handleScheduleAgendamento}
              onEncaminharMkt={handleEncaminharMkt}
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

      {/* Modal de recusa da oferta — motivo obrigatório */}
      <RecusarOfertaModal
        open={showRecusarModal}
        leadNome={lead?.nome}
        submitting={submitting}
        onConfirm={executeRefuse}
        onCancel={() => setShowRecusarModal(false)}
      />

      <LeadEditModal
        open={showEditModal}
        leadId={id}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => {
          setShowEditModal(false);
          if (updated) setLead(updated);
          showToast("Lead atualizado.", "success", 2500);
        }}
      />

      {/* Modal de confirmação — exclusão definitiva (Admin Painel) */}
      <ConfirmModal
        open={showDeleteModal}
        title="Excluir este lead?"
        description="Isso apaga o lead definitivamente da base do Portal. Não afeta o registro no Zoho, e não pode ser desfeito por aqui."
        confirmLabel={deleting ? "Excluindo…" : "Excluir definitivamente"}
        cancelLabel="Cancelar"
        variant="danger"
        icon={<MdDeleteForever className="text-lg" />}
        onConfirm={deleting ? undefined : handleDeleteLead}
        onCancel={() => !deleting && setShowDeleteModal(false)}
      />
    </MainLayout>
  );
}
