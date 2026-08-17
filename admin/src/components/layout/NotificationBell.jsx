import { useEffect, useRef, useState } from "react";
import { MdNotifications, MdNotificationsActive, MdPersonAdd, MdCheck, MdClose } from "react-icons/md";
import { useSlaOffers } from "../../contexts/SlaOfferContext";

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
      className={`font-mono text-[11px] font-semibold tabular-nums ${
        urgent ? "text-red-600" : "text-tegra-text-secondary"
      }`}
    >
      {formatCountdown(remaining)}
    </span>
  );
}

export default function NotificationBell() {
  const { offers, acceptOffer, refuseOffer, openOffer, submittingId } =
    useSlaOffers();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("keydown", onKey);
      };
    }
    return undefined;
  }, [open]);

  const pendingCount = offers.length;

  const handleAccept = async (event, offer) => {
    event.stopPropagation();
    await acceptOffer(offer);
  };

  const handleRefuse = async (event, offer) => {
    event.stopPropagation();
    await refuseOffer(offer);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          pendingCount
            ? `${pendingCount} lead${pendingCount > 1 ? "s" : ""} aguardando aceite`
            : "Notificações de leads"
        }
        title="Notificações de leads"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-[#1A1A1A] transition duration-200 ${
          open
            ? "border-tegra-gray-dark/25 shadow-[0_6px_14px_rgba(26,47,91,0.10)]"
            : "border-tegra-gray-medium hover:border-tegra-gray-dark/30 hover:shadow-[0_4px_10px_rgba(26,47,91,0.08)]"
        }`}
      >
        {pendingCount > 0 ? (
          <MdNotificationsActive className="text-[22px]" aria-hidden />
        ) : (
          <MdNotifications className="text-[22px]" aria-hidden />
        )}
        {pendingCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#22C55E] shadow-[0_0_0_2px_#fff]"
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações de leads"
          className="absolute right-0 top-full z-50 mt-3 w-[min(22.5rem,calc(100vw-1.5rem))] origin-top-right animate-toast-in"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-tegra-gray-medium/80 bg-white"
          />
          <div className="overflow-hidden rounded-2xl border border-tegra-gray-medium/80 bg-white shadow-[0_18px_40px_rgba(26,47,91,0.16)]">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[15px] font-semibold text-tegra-text-primary">
                Notificações
              </h2>
              {pendingCount > 0 && (
                <span className="rounded-full bg-[#F5A623]/15 px-2 py-0.5 text-[11px] font-semibold text-[#C07600]">
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
              {pendingCount === 0 && (
                <p className="px-4 py-8 text-center text-sm text-tegra-text-secondary">
                  Nenhum lead aguardando aceite.
                </p>
              )}

              {offers.map((offer) => {
                const cidade = [offer.cidade, offer.estado || offer.uf]
                  .filter(Boolean)
                  .join(" / ");
                const busy = submittingId === offer.id;
                return (
                  <div
                    key={offer.id}
                    className="border-t border-tegra-gray-light px-4 py-3.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        openOffer(offer);
                        setOpen(false);
                      }}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F6F8] text-tegra-blue-dark">
                        <MdPersonAdd className="text-lg" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold leading-snug text-tegra-text-primary">
                            Novo lead · {offer.nome || "Sem nome"}
                          </span>
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2D8CFF]" />
                        </span>
                        <span className="mt-0.5 block text-xs text-tegra-text-secondary">
                          {cidade || offer.regiao || "Local não informado"}
                          {offer.especialidade ? ` · ${offer.especialidade}` : ""}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-tegra-text-secondary">
                          <span>Expira em</span>
                          <OfferCountdown deadline={offer.slaDeadline} />
                        </span>
                      </span>
                    </button>
                    <div className="mt-3 flex justify-end gap-2 pl-12">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => handleRefuse(event, offer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-tegra-gray-medium px-3 py-1.5 text-xs font-semibold text-tegra-text-secondary transition hover:bg-tegra-gray-light disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MdClose className="text-sm" aria-hidden />
                        Recusar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => handleAccept(event, offer)}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <MdCheck className="text-sm" aria-hidden />
                        {busy ? "Salvando…" : "Aceitar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
