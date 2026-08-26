import { Link } from "react-router-dom";
import { MdClose, MdPhone, MdBadge, MdLocationOn, MdMedicalServices } from "react-icons/md";
import { useSlaOffers } from "../../contexts/SlaOfferContext";
import { useEffect, useRef, useState } from "react";

/**
 * Retorna { remaining, total } onde:
 * - remaining: ms restantes até o deadline
 * - total: ms totais da oferta (capturado na primeira renderização)
 */
function useCountdown(deadline) {
  const totalRef = useRef(null);

  const [remaining, setRemaining] = useState(() => {
    const r = deadline ? Math.max(0, new Date(deadline).getTime() - Date.now()) : 0;
    totalRef.current = r;
    return r;
  });

  useEffect(() => {
    if (!deadline) return undefined;
    const initial = Math.max(0, new Date(deadline).getTime() - Date.now());
    totalRef.current = initial;
    setRemaining(initial);

    function tick() {
      setRemaining(Math.max(0, new Date(deadline).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return { remaining, total: totalRef.current ?? remaining };
}

function formatTime(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  if (hours >= 1) {
    // Ex: "47h 49m" — mais legível que 47:49:49
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function TimerRing({ remaining, total }) {
  // pct sempre entre 0 e 1 — evita anel quebrado quando remaining > total
  const pct = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  // Urgência relativa ao total (últimos 5%) ou absoluta (< 2min) — o que vier primeiro
  const urgentThreshold  = Math.min(2 * 60 * 1000, total * 0.05);
  const warningThreshold = Math.min(5 * 60 * 1000, total * 0.20);
  const isUrgent  = remaining <= urgentThreshold;
  const isWarning = remaining <= warningThreshold;

  // Círculo maior para texto caber bem
  const size = 104;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  const color = isUrgent ? "#ef4444" : isWarning ? "#f59e0b" : "#0d9488";
  const textColor = isUrgent ? "#dc2626" : isWarning ? "#d97706" : "#0f766e";

  // Texto do timer: horas (ex: "47h 49m") ou minutos:segundos (ex: "09:42")
  const timeText = formatTime(remaining);
  // Quando mostra HH MM, divide em duas linhas para caber no círculo
  const isHourFormat = timeText.includes("h");

  return (
    <div className={`relative shrink-0 ${isUrgent ? "animate-pulse" : ""}`}
         style={{ width: size, height: size }}>
      {/* Track e arco */}
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        {/* Track (fundo cinza) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Arco de progresso — drena conforme o tempo passa */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
        />
      </svg>

      {/* Texto centralizado via inset-0 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {isHourFormat ? (
          /* "47h" e "49m" em duas linhas pequenas */
          <>
            <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800, lineHeight: 1, color: textColor, letterSpacing: "-0.02em" }}>
              {timeText.split(" ")[0]}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: textColor }}>
              {timeText.split(" ")[1]}
            </span>
          </>
        ) : (
          /* "09:42" em uma linha */
          <span style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 800, lineHeight: 1, color: textColor, letterSpacing: "-0.02em" }}>
            {timeText}
          </span>
        )}
        <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", marginTop: 3 }}>
          restante
        </span>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 shrink-0 text-base text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
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

  const { remaining, total: slaTotal } = useCountdown(offer?.slaDeadline);
  const urgentThreshold = Math.min(2 * 60 * 1000, slaTotal * 0.05);
  const isUrgent = remaining <= urgentThreshold;
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!offer) return undefined;
    function onKey(e) {
      if (e.key === "Escape") closeOffer();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [offer, closeOffer]);

  if (!offer) return null;

  const submitting = submittingId === offer.id;
  const queue = offers.length;

  const localidade = [offer.cidade, offer.estado || offer.uf].filter(Boolean).join(" / ");
  const contato = offer.celular || offer.telefone;
  const crm = offer.numeroRegistro ? `CRM ${offer.ufCrm || ""} ${offer.numeroRegistro}`.trim() : null;
  const origem = offer.origem || offer.evento;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sla-offer-title"
      onClick={(e) => e.target === overlayRef.current && closeOffer()}
      style={{ animation: "sla-overlay-in 0.18s ease-out" }}
    >
      <style>{`
        @keyframes sla-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sla-modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_32px_72px_rgba(15,23,42,0.32)]"
        style={{ animation: "sla-modal-in 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#1b346c] to-[#2563eb] px-5 pt-4 pb-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                  Novo lead · {offer.regiao || "Regional"}
                </p>
              </div>
              <h2 id="sla-offer-title" className="mt-1.5 text-xl font-bold leading-snug">
                {offer.nome || "Lead sem nome"}
              </h2>
              {queue > 1 && (
                <span className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                  +{queue - 1} na fila
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={closeOffer}
              className="shrink-0 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <MdClose className="text-lg" />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4 space-y-4">

          {/* Timer + status */}
          <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
            isUrgent
              ? "border-red-200 bg-red-50"
              : remaining <= Math.min(5 * 60 * 1000, slaTotal * 0.20)
                ? "border-amber-200 bg-amber-50"
                : "border-teal-100 bg-teal-50"
          }`}>
            <TimerRing remaining={remaining} total={slaTotal} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                {isUrgent ? "⚠️ Tempo quase esgotado!" : "Tempo para aceitar"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                Se expirar, o lead vai para o próximo consultor
              </p>
            </div>
          </div>

          {/* Informações do lead */}
          <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <InfoRow
              icon={MdLocationOn}
              label="Localidade"
              value={localidade || null}
            />
            <InfoRow
              icon={MdMedicalServices}
              label="Especialidade"
              value={offer.especialidade || offer.tipoLead || null}
            />
            <InfoRow
              icon={MdPhone}
              label="Contato"
              value={contato || null}
            />
            <InfoRow
              icon={MdBadge}
              label="Registro"
              value={crm}
            />
            {origem && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {origem}
                </span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => refuseOffer(offer)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Recusar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => acceptOffer(offer)}
              className="flex-[2] rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando…" : "✓ Aceitar lead"}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            <Link
              to={`/leads-medicos/${offer.id}`}
              onClick={closeOffer}
              className="font-medium text-blue-600 hover:underline"
            >
              Ver detalhes completos do lead →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
