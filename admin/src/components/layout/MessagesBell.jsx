import { useEffect, useRef, useState } from "react";
import { MdMessage, MdRefresh } from "react-icons/md";
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
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours} h`;
  return `${days} d`;
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

  if (form?.crmStatus === "em_tratamento") {
    return `Ocorrência ${protocolo} em tratamento por ${form.crmOwnerName || "analista"}.`;
  }
  if (form?.crmStatus === "nao_atendida") {
    return `Ocorrência ${protocolo} ainda aguardando atendimento.`;
  }
  if (form?.crmStatus === "resolvida") {
    return `Ocorrência ${protocolo} foi finalizada.`;
  }
  if (form?.crmStatus === "erro_sincronizacao_crm") {
    return `Ocorrência ${protocolo} com falha temporária de sincronização.`;
  }
  if (form?.crmStatus === "nao_localizado_no_crm") {
    return `Ocorrência ${protocolo} enviada e aguardando confirmação no CRM.`;
  }

  return `Ocorrência ${protocolo} enviada com sucesso.`;
}

export default function MessagesBell() {
  const user = authService.getUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
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
            message: statusNotificationText(form),
          };
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 12);

      setItems(eventos);
      const lastSeenRaw = localStorage.getItem(seenKey);
      const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
      setUnreadCount(
        eventos.filter((item) => new Date(item.updatedAt).getTime() > lastSeen)
          .length,
      );
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
      <button
        type="button"
        onClick={toggle}
        className="relative flex items-center justify-center rounded-lg p-2 text-tegra-text-primary transition hover:bg-tegra-gray-light hover:text-tegra-blue-dark"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Notificações de formulários"
        title="Notificações de formulários"
      >
        <MdMessage className="text-xl sm:text-2xl" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Atualizações de formulários"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-tegra-gray-light bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-tegra-gray-light bg-tegra-bg-accent px-4 py-3">
            <p className="text-sm font-semibold text-tegra-text-primary">
              Atualizações de formulários
            </p>
            <button
              type="button"
              onClick={load}
              className="rounded-md p-1.5 transition-colors hover:bg-tegra-gray-light"
              aria-label="Atualizar notificações"
              title="Atualizar"
            >
              <MdRefresh
                className={`text-base text-tegra-blue-dark ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-5 text-sm text-tegra-text-secondary">
                Sem atualizações no momento.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-tegra-gray-light px-4 py-3 last:border-b-0"
                >
                  <p className="text-sm font-semibold text-tegra-text-primary">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-tegra-text-secondary">
                    {item.message}
                  </p>
                  <p className="mt-2 text-[11px] text-tegra-blue-dark">
                    {formatRelativeTime(item.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
