import { useEffect, useRef, useState } from "react";
import { MdMessage, MdRefresh, MdCheckCircle, MdError, MdSchedule, MdInbox } from "react-icons/md";
import { authService } from "../../services/auth";
import {
  obterFormulariosSalvos,
  sincronizarOwnerOcorrenciasSalvas,
} from "../../services/savedForms";

const TIPO_LABEL = {
  compra: "Compra",
  recompra: "Recompra",
  proposta: "Proposta",
  ocorrencia: "Ocorrência",
};

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Agora";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Agora";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${days}d atrás`;
}

function statusNotificationText(form) {
  const tipoLabel = TIPO_LABEL[form?.tipo] || "Formulário";
  if (form?.statusEnvio === "falha_envio") {
    return `${tipoLabel} com falha de envio: ${form?.erroEnvio || "erro não informado"}.`;
  }
  if (form?.tipo !== "ocorrencia") {
    const protocoloTexto = form?.protocolo ? ` #${form.protocolo}` : "";
    return `${tipoLabel}${protocoloTexto} enviado com sucesso.`;
  }
  const protocolo = form?.protocolo ? `#${form.protocolo}` : "sem protocolo";
  if (form?.crmStatus === "em_tratamento") return `Ocorrência ${protocolo} em tratamento por ${form.crmOwnerName || "analista"}.`;
  if (form?.crmStatus === "nao_atendida") return `Ocorrência ${protocolo} aguardando atendimento.`;
  if (form?.crmStatus === "resolvida") return `Ocorrência ${protocolo} finalizada.`;
  if (form?.crmStatus === "erro_sincronizacao_crm") return `Ocorrência ${protocolo} com falha de sincronização.`;
  if (form?.crmStatus === "nao_localizado_no_crm") return `Ocorrência ${protocolo} aguardando confirmação no CRM.`;
  return `Ocorrência ${protocolo} enviada com sucesso.`;
}

function itemIcon(form) {
  if (form?.statusEnvio === "falha_envio" || form?.crmStatus === "erro_sincronizacao_crm") {
    return <MdError className="text-base text-red-500" aria-hidden />;
  }
  if (form?.crmStatus === "resolvida" || form?.statusEnvio === "enviado") {
    return <MdCheckCircle className="text-base text-emerald-500" aria-hidden />;
  }
  return <MdSchedule className="text-base text-amber-500" aria-hidden />;
}

export default function MessagesBell() {
  const user = authService.getUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [rawForms, setRawForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);
  const seenKey = `formularios_notifications_seen_${(user?.email || user?.id || "anonymous").toLowerCase()}`;

  const load = async () => {
    setLoading(true);
    try {
      await sincronizarOwnerOcorrenciasSalvas();
      const forms = await obterFormulariosSalvos();
      const eventos = forms
        .filter((form) =>
          form?.statusEnvio === "enviado" ||
          form?.statusEnvio === "falha_envio" ||
          (form?.tipo === "ocorrencia" && form?.enviado === true),
        )
        .map((form) => {
          const updatedAt =
            form?.dataAtualizacao || form?.crmSyncAt || form?.crmResolvedAt ||
            form?.dataEnvio || form?.dataSalvamento || new Date().toISOString();
          const tipoLabel = TIPO_LABEL[form?.tipo] || "Formulário";
          return {
            id: form?.id || `${form?.protocolo || "occ"}_${updatedAt}`,
            updatedAt,
            title: form?.paciente
              ? `${tipoLabel} · ${form.paciente}`
              : `${tipoLabel}`,
            message: statusNotificationText(form),
            _form: form,
          };
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 12);

      setItems(eventos);
      setRawForms(forms);
      const lastSeenRaw = localStorage.getItem(seenKey);
      const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
      setUnreadCount(eventos.filter((item) => new Date(item.updatedAt).getTime() > lastSeen).length);
    } catch (error) {
      console.warn("Erro ao carregar notificações de formulários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onPointerDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
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

  const toggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      localStorage.setItem(seenKey, new Date().toISOString());
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão */}
      <button
        type="button"
        onClick={toggle}
        className="relative flex items-center justify-center rounded-lg p-2 text-tegra-text-primary transition hover:bg-tegra-gray-light hover:text-tegra-blue-dark"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Atualizações de formulários"
        title="Atualizações de formulários"
      >
        <MdMessage className="text-xl sm:text-2xl" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Painel */}
      {open && (
        <div
          role="dialog"
          aria-label="Atualizações de formulários"
          className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-1rem))] origin-top-right"
          style={{ animation: "confirm-modal-in 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          {/* Seta */}
          <span aria-hidden className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white" />

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b346c]/8">
                  <MdMessage className="text-base text-[#1b346c]" aria-hidden />
                </span>
                <h2 className="text-sm font-bold text-slate-800">Formulários</h2>
              </div>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                aria-label="Atualizar"
                title="Atualizar"
              >
                <MdRefresh className={`text-base ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Lista */}
            <div className="max-h-[min(26rem,70vh)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <MdInbox className="text-2xl text-slate-400" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-slate-500">Sem atualizações</p>
                  <p className="text-xs text-slate-400">Nenhum formulário enviado ainda.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                      {itemIcon(item._form)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 leading-snug truncate">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                        {item.message}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                        {formatRelativeTime(item.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
