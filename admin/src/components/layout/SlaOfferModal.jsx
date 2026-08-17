import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { leadsMedicosService } from "../../services/leadsMedicos";
import { ROUTES } from "../../utils/constants";
import { useToast } from "../feedback/auth/ToastContainer";

const POLL_MS = 20_000;

function formatCountdown(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function OfferCountdown({ deadline }) {
  const [remaining, setRemaining] = useState(() =>
    deadline ? new Date(deadline).getTime() - Date.now() : 0,
  );

  useEffect(() => {
    if (!deadline) return undefined;
    function tick() {
      setRemaining(new Date(deadline).getTime() - Date.now());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const urgent = remaining < 2 * 60 * 1000;
  return (
    <span
      className={`font-mono text-2xl font-bold tabular-nums ${
        urgent ? "text-red-600" : "text-tegra-blue-dark"
      }`}
    >
      {formatCountdown(remaining)}
    </span>
  );
}

export default function SlaOfferModal() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [offer, setOffer] = useState(null);
  const [queue, setQueue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const busyRef = useRef(false);

  const loadOffers = useCallback(async () => {
    if (busyRef.current) return;
    try {
      const result = await leadsMedicosService.listPendingOffers();
      const next = Array.isArray(result.data) ? result.data : [];
      setQueue(next.length);
      setOffer(next[0] || null);
    } catch {
      // polling silencioso — não interrompe o uso do portal
    }
  }, []);

  useEffect(() => {
    loadOffers();
    const id = setInterval(loadOffers, POLL_MS);
    return () => clearInterval(id);
  }, [loadOffers]);

  const notifyChanged = (id, action) => {
    window.dispatchEvent(
      new CustomEvent("sla-offer-changed", { detail: { id, action } }),
    );
  };

  const handleAccept = async () => {
    if (!offer?.id || submitting) return;
    setSubmitting(true);
    busyRef.current = true;
    try {
      await leadsMedicosService.aceitarOferta(offer.id);
      showToast("Lead aceito. Ele entrou na sua carteira.", "success", 2800);
      notifyChanged(offer.id, "aceitar");
      const path = `/leads-medicos/${offer.id}`;
      if (location.pathname !== path) navigate(path);
      setOffer(null);
      await loadOffers();
    } catch (err) {
      const message =
        err?.response?.data?.error || err?.message || "Não foi possível aceitar.";
      showToast(message, "error", 3500);
      await loadOffers();
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    if (!offer?.id || submitting) return;
    setSubmitting(true);
    busyRef.current = true;
    try {
      await leadsMedicosService.recusarOferta(offer.id);
      showToast("Oferta recusada. O lead segue para o próximo consultor.", "success", 2800);
      notifyChanged(offer.id, "recusar");
      if (location.pathname === `/leads-medicos/${offer.id}`) {
        navigate(ROUTES.LEADS_MEDICOS);
      }
      setOffer(null);
      await loadOffers();
    } catch (err) {
      const message =
        err?.response?.data?.error || err?.message || "Não foi possível recusar.";
      showToast(message, "error", 3500);
      await loadOffers();
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  if (!offer) return null;

  const cidade = [offer.cidade, offer.estado || offer.uf].filter(Boolean).join(" / ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sla-offer-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-tegra-gray-medium/80 bg-white shadow-[0_24px_60px_rgba(27,52,108,0.28)]">
        <div className="bg-gradient-to-r from-tegra-blue-dark to-tegra-blue px-5 py-4 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Novo lead · {offer.regiao || "Regional"}
          </p>
          <h2 id="sla-offer-title" className="mt-1 text-lg font-bold">
            Aceitar este lead?
          </h2>
          {queue > 1 && (
            <p className="mt-1 text-xs text-white/80">
              {queue} ofertas na fila — mostrando a mais urgente
            </p>
          )}
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-base font-semibold text-tegra-text-primary">
              {offer.nome || "Lead sem nome"}
            </p>
            <p className="mt-0.5 text-sm text-tegra-text-secondary">
              {cidade || "Cidade não informada"}
              {offer.especialidade ? ` · ${offer.especialidade}` : ""}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-tegra-gray-medium/80 bg-tegra-bg-secondary px-4 py-3">
            <div>
              <p className="text-xs font-medium text-tegra-text-secondary">
                Tempo para aceitar
              </p>
              <p className="text-[11px] text-tegra-text-secondary">
                Se expirar, o lead vai para o próximo consultor
              </p>
            </div>
            <OfferCountdown deadline={offer.slaDeadline} />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={handleRefuse}
              className="inline-flex items-center justify-center rounded-lg border border-tegra-gray-medium px-4 py-2.5 text-sm font-semibold text-tegra-text-secondary hover:bg-tegra-gray-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              Recusar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleAccept}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando…" : "Aceitar lead"}
            </button>
          </div>

          <p className="text-center text-xs text-tegra-text-secondary">
            <Link
              to={`/leads-medicos/${offer.id}`}
              className="font-medium text-tegra-blue hover:underline"
            >
              Ver detalhes do lead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
