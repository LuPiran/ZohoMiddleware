import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { ROUTES } from "../../utils/constants";
import { leadsMedicosService } from "../../services/leadsMedicos";
import LeadTimeline from "./LeadTimeline";
import LeadDetailsCard from "./LeadDetailsCard";
import LeadFirstAttemptCard from "./LeadFirstAttemptCard";
import LeadHistory from "./LeadHistory";

/**
 * THESIS: Detalhe operacional do lead — timeline do funil, dados, 1ª tentativa e histórico.
 * OWN-WORLD: tegra-*, cards com borda cinza suave, teal para progresso ativo.
 * STORY: consultor entende onde o lead está, registra contato ou encerra sem interesse.
 * FORM: extensão Operate do shell MainLayout.
 */
export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const handleFirstAttempt = async (observacao) => {
    setSubmitting(true);
    try {
      const result = await leadsMedicosService.registrarPrimeiraTentativa(
        id,
        observacao,
      );
      setLead(result.data);
      showToast("Primeira tentativa registrada", "success", 2500);
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

  const handleSemInteresse = async (observacao) => {
    const ok = window.confirm(
      "Confirmar que este lead não tem interesse? Esta ação encerra o funil.",
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const result = await leadsMedicosService.marcarSemInteresse(
        id,
        observacao,
      );
      setLead(result.data);
      showToast("Lead marcado como sem interesse", "success", 2500);
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Erro ao marcar sem interesse";
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
            <LeadTimeline timeline={lead.timeline} />
            <LeadDetailsCard lead={lead} />
            <LeadFirstAttemptCard
              lead={lead}
              submitting={submitting}
              onSubmitAttempt={handleFirstAttempt}
              onSemInteresse={handleSemInteresse}
            />
            <LeadHistory historico={lead.historico} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
