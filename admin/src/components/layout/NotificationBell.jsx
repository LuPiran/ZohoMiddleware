import { useEffect, useRef, useState } from "react";
import {
  MdNotifications,
  MdNotificationsActive,
  MdPersonAdd,
  MdCheck,
  MdClose,
  MdAccessTime,
} from "react-icons/md";
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
    <span className={`font-mono text-[11px] font-bold tabular-nums ${urgent ? "text-red-500" : "text-slate-400"}`}>
      {formatCountdown(remaining)}
    </span>
  );
}

export default function NotificationBell() {
  const { offers, acceptOffer, refuseOffer, openOffer, submittingId } = useSlaOffers();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll(e) {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [open]);

  const pendingCount = offers.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão sino */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={pendingCount ? `${pendingCount} lead${pendingCount > 1 ? "s" : ""} aguardando aceite` : "Notificações"}
        title="Notificações de leads"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-[#1A1A1A] transition duration-200 ${
          open
            ? "border-tegra-gray-dark/25 shadow-[0_6px_14px_rgba(26,47,91,0.10)]"
            : "border-tegra-gray-medium hover:border-tegra-gray-dark/30 hover:shadow-[0_4px_10px_rgba(26,47,91,0.08)]"
        }`}
      >
        {pendingCount > 0
          ? <MdNotificationsActive className="text-[22px]" aria-hidden />
          : <MdNotifications className="text-[22px]" aria-hidden />}
        {pendingCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_#fff]" aria-hidden />
        )}
      </button>

      {/* Painel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notificações de leads"
          className="fixed inset-x-2 top-16 z-50 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-3 sm:w-80 origin-top-right"
          style={{ animation: "confirm-modal-in 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          {/* Seta */}
          <span aria-hidden className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white" />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b346c]/8">
                  <MdNotifications className="text-base text-[#1b346c]" aria-hidden />
                </span>
                <h2 className="text-sm font-bold text-slate-800">Leads pendentes</h2>
              </div>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Conteúdo */}
            <div className="max-h-[min(26rem,70vh)] overflow-y-auto">
              {pendingCount === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <MdNotifications className="text-2xl text-slate-400" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-slate-500">Tudo em dia!</p>
                  <p className="text-xs text-slate-400">Nenhum lead aguardando aceite.</p>
                </div>
              ) : (
                offers.map((offer) => {
                  const cidade = [offer.cidade, offer.estado || offer.uf].filter(Boolean).join(" / ");
                  const busy = submittingId === offer.id;
                  return (
                    <div key={offer.id} className="border-b border-slate-100 last:border-0">
                      <button
                        type="button"
                        onClick={() => { openOffer(offer); setOpen(false); }}
                        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1b346c]/8 text-[#1b346c]">
                          <MdPersonAdd className="text-lg" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold leading-snug text-slate-800">
                              {offer.nome || "Lead sem nome"}
                            </span>
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {cidade || offer.regiao || "Local não informado"}
                            {offer.especialidade ? ` · ${offer.especialidade}` : ""}
                          </span>
                          <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <MdAccessTime className="text-xs" aria-hidden />
                            Expira em <OfferCountdown deadline={offer.slaDeadline} />
                          </span>
                        </span>
                      </button>

                      {/* Ações */}
                      <div className="flex gap-2 px-4 pb-3 pl-16">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => { e.stopPropagation(); refuseOffer(offer); }}
                          className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <MdClose className="inline mr-0.5 text-sm" aria-hidden />
                          Recusar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => { e.stopPropagation(); acceptOffer(offer); }}
                          className="flex-[2] rounded-lg bg-teal-600 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                        >
                          <MdCheck className="inline mr-0.5 text-sm" aria-hidden />
                          {busy ? "Salvando…" : "Aceitar"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
