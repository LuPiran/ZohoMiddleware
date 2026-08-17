import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdNotifications,
  MdPersonAdd,
  MdDescription,
  MdCheck,
  MdClose,
} from "react-icons/md";
import { authService } from "../../services/auth";
import {
  obterFormulariosSalvos,
  sincronizarOwnerOcorrenciasSalvas,
} from "../../services/savedForms";
import { useSlaOffers } from "../../contexts/SlaOfferContext";

function formatCountdown(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Agora";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Agora";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours} h`;
  return `${days} d`;
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

const TIPO_LABEL = {
  compra: "Compra",
  recompra: "Recompra",
  proposta: "Proposta",
  ocorrencia: "Ocorrência",
};

function formStatusText(form) {
  const tipoLabel = TIPO_LABEL[form?.tipo] || "Formulário";

  if (form?.statusEnvio === "falha_envio") {
    return `${tipoLabel} com falha de envio.`;
  }
  if (form?.tipo !== "ocorrencia") {
    const protocoloTexto = form?.protocolo ? ` #${form.protocolo}` : "";
    return `${tipoLabel}${protocoloTexto} enviado com sucesso.`;
  }

  const protocolo = form?.protocolo ? `#${form.protocolo}` : "sem protocolo";
  if (form?.crmStatus === "em_tratamento") {
    return `Ocorrência ${protocolo} em tratamento.`;
  }
  if (form?.crmStatus === "nao_atendida") {
    return `Ocorrência ${protocolo} aguardando atendimento.`;
  }
  if (form?.crmStatus === "resolvida") {
    return `Ocorrência ${protocolo} finalizada.`;
  }
  return `Ocorrência ${protocolo} enviada.`;
}

export default function NotificationBell() {
  const user = authService.getUser();
  const {
    offers,
    acceptOffer,
    refuseOffer,
    openOffer,
    submittingId,
  } = useSlaOffers();
  const [open, setOpen] = useState(false);
  const [formItems, setFormItems] = useState([]);
  const [formUnread, setFormUnread] = useState(0);
  const panelRef = useRef(null);
  const seenKey = `formularios_notifications_seen_${(user?.email || user?.id || "anonymous").toLowerCase()}`;

  const loadForms = async () => {
    try {
      await sincronizarOwnerOcorrenciasSalvas();
      const forms = await obterFormulariosSalvos();
      const eventos = forms
        .filter(
          (form) =>
            form?.statusEnvio === "enviado" ||
            form?.statusEnvio === "falha_envio" ||
            (form?.tipo === "ocorrencia" && form?.enviado === true),
        )
        .map((form) => {
          const updatedAt =
            form?.dataAtualizacao ||
            form?.crmSyncAt ||
            form?.crmResolvedAt ||
            form?.dataEnvio ||
            form?.dataSalvamento ||
            new Date().toISOString();
          const tipoLabel = TIPO_LABEL[form?.tipo] || "Formulário";
          return {
            id: form?.id || `${form?.protocolo || "occ"}_${updatedAt}`,
            updatedAt,
            title: form?.paciente
              ? `${tipoLabel} de ${form.paciente}`
              : `Atualização de ${tipoLabel.toLowerCase()}`,
            message: formStatusText(form),
          };
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 8);

      setFormItems(eventos);
      const lastSeenRaw = localStorage.getItem(seenKey);
      const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
      setFormUnread(
        eventos.filter((item) => new Date(item.updatedAt).getTime() > lastSeen)
          .length,
      );
    } catch (error) {
      console.warn("Erro ao carregar notificações de formulários:", error);
    }
  };

  useEffect(() => {
    loadForms();
    const interval = setInterval(loadForms, 60_000);
    return () => clearInterval(interval);
  }, []);

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
  const badgeCount = pendingCount + (pendingCount ? 0 : formUnread);
  const showDot = pendingCount > 0 || formUnread > 0;

  const lastSeen = useMemo(() => {
    const raw = localStorage.getItem(seenKey);
    return raw ? new Date(raw).getTime() : 0;
  }, [seenKey, open, formItems]);

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      localStorage.setItem(seenKey, new Date().toISOString());
      setFormUnread(0);
    }
  };

  const handleAccept = async (event, offer) => {
    event.stopPropagation();
    await acceptOffer(offer);
  };

  const handleRefuse = async (event, offer) => {
    event.stopPropagation();
    await refuseOffer(offer);
  };

  const empty = pendingCount === 0 && formItems.length === 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          pendingCount
            ? `${pendingCount} lead${pendingCount > 1 ? "s" : ""} aguardando aceite`
            : "Notificações"
        }
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition duration-200 ${
          open
            ? "border-tegra-blue/40 bg-white text-[#2D8CFF] shadow-[0_8px_18px_rgba(45,140,255,0.16)]"
            : "border-tegra-gray-medium bg-white text-[#2D8CFF] hover:border-tegra-blue/35 hover:shadow-[0_6px_14px_rgba(26,47,91,0.08)]"
        }`}
      >
        <MdNotifications className="text-[22px]" aria-hidden />
        {showDot && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#F5A623] px-1 text-[9px] font-bold leading-none text-white shadow-[0_0_0_2px_#fff]">
            {badgeCount > 1 ? (badgeCount > 9 ? "9+" : badgeCount) : ""}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
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
              {empty && (
                <p className="px-4 py-8 text-center text-sm text-tegra-text-secondary">
                  Nenhuma notificação no momento.
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

              {formItems.map((item) => {
                const unread = new Date(item.updatedAt).getTime() > lastSeen;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 border-t border-tegra-gray-light px-4 py-3.5"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F6F8] text-tegra-text-secondary">
                      <MdDescription className="text-lg" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-tegra-text-primary">
                          {item.title}
                        </p>
                        {unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2D8CFF]" />
                        ) : (
                          <MdCheck className="mt-0.5 shrink-0 text-base text-tegra-text-light" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-tegra-text-secondary">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] text-tegra-text-light">
                        {formatRelativeTime(item.updatedAt)}
                      </p>
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
