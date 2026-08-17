import { Link } from "react-router-dom";
import { MdClose } from "react-icons/md";
import { useSlaOffers } from "../../contexts/SlaOfferContext";
import { useEffect, useState } from "react";

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
  const {
    selectedOffer: offer,
    closeOffer,
    acceptOffer,
    refuseOffer,
    submittingId,
    offers,
  } = useSlaOffers();

  useEffect(() => {
    if (!offer) return undefined;
    function onKey(event) {
      if (event.key === "Escape") closeOffer();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offer, closeOffer]);

  if (!offer) return null;

  const submitting = submittingId === offer.id;
  const cidade = [offer.cidade, offer.estado || offer.uf].filter(Boolean).join(" / ");
  const queue = offers.length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sla-offer-title"
      onClick={closeOffer}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-tegra-gray-medium/80 bg-white shadow-[0_24px_60px_rgba(27,52,108,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-gradient-to-r from-tegra-blue-dark to-tegra-blue px-5 py-4 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Novo lead · {offer.regiao || "Regional"}
          </p>
          <h2 id="sla-offer-title" className="mt-1 pr-8 text-lg font-bold">
            Aceitar este lead?
          </h2>
          {queue > 1 && (
            <p className="mt-1 text-xs text-white/80">
              {queue} ofertas na fila
            </p>
          )}
          <button
            type="button"
            onClick={closeOffer}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <MdClose className="text-xl" />
          </button>
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
              onClick={() => refuseOffer(offer)}
              className="inline-flex items-center justify-center rounded-lg border border-tegra-gray-medium px-4 py-2.5 text-sm font-semibold text-tegra-text-secondary hover:bg-tegra-gray-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              Recusar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => acceptOffer(offer)}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando…" : "Aceitar lead"}
            </button>
          </div>

          <p className="text-center text-xs text-tegra-text-secondary">
            <Link
              to={`/leads-medicos/${offer.id}`}
              onClick={closeOffer}
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
