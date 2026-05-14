import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import { MdLogout, MdMenu, MdMessage, MdRefresh } from "react-icons/md";
import Avatar from "../ui/Avatar";
import SplashScreen from "../feedback/auth/SplashScreen";
import { useMenu } from "../../contexts/MenuContext";
import { useUserDropdown } from "../../contexts/UserContext";
import {
  obterFormulariosSalvos,
  sincronizarOwnerOcorrenciasSalvas,
} from "../../services/savedForms";

export default function Header() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [showSplash, setShowSplash] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { showUserDropdown, setShowUserDropdown } = useUserDropdown();
  const userMenuRef = useRef(null);
  const notificationMobileRef = useRef(null);
  const notificationDesktopRef = useRef(null);
  const { toggleMenu } = useMenu();

  const notificationSeenKey = `formularios_notifications_seen_${(user?.email || user?.id || "anonymous").toLowerCase()}`;
  const tipoLabelMap = {
    compra: "Compra",
    recompra: "Recompra",
    proposta: "Proposta",
    ocorrencia: "Ocorrência",
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }

      const clickedInsideNotificationMobile =
        notificationMobileRef.current?.contains(event.target);
      const clickedInsideNotificationDesktop =
        notificationDesktopRef.current?.contains(event.target);

      if (!clickedInsideNotificationMobile && !clickedInsideNotificationDesktop) {
        setShowNotifications(false);
      }
    }

    if (showUserDropdown || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showUserDropdown, showNotifications, setShowUserDropdown]);

  const formatRelativeTime = (isoDate) => {
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
  };

  const statusNotificationText = (form) => {
    const tipoLabel = tipoLabelMap[form?.tipo] || "Formulário";

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
  };

  const mapFormToNotification = (form) => {
    const updatedAt =
      form?.dataAtualizacao ||
      form?.crmSyncAt ||
      form?.crmResolvedAt ||
      form?.dataEnvio ||
      form?.dataSalvamento ||
      new Date().toISOString();

    const tipoLabel = tipoLabelMap[form?.tipo] || "Formulário";

    return {
      id: form?.id || `${form?.protocolo || "occ"}_${updatedAt}`,
      updatedAt,
      title: form?.paciente
        ? `${tipoLabel} de ${form.paciente}`
        : `Atualização de ${tipoLabel.toLowerCase()}`,
      message: statusNotificationText(form),
      status: form?.statusEnvio || form?.crmStatus || "enviado",
    };
  };

  const carregarNotificacoesFormularios = async () => {
    setLoadingNotifications(true);
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
        .map(mapFormToNotification)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 12);

      setNotifications(eventos);

      const lastSeenRaw = localStorage.getItem(notificationSeenKey);
      const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0;
      const nextUnread = eventos.filter(
        (item) => new Date(item.updatedAt).getTime() > lastSeen,
      ).length;
      setUnreadCount(nextUnread);
    } catch (error) {
      console.warn("Erro ao carregar notificações de formulários:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    carregarNotificacoesFormularios();
    const interval = setInterval(() => {
      carregarNotificacoesFormularios();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const abrirFecharNotificacoes = () => {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);

    if (willOpen) {
      localStorage.setItem(notificationSeenKey, new Date().toISOString());
      setUnreadCount(0);
    }
  };

  function handleLogout() {
    // Previne múltiplos cliques e loops
    if (showSplash || isLoggingOut) return;

    setIsLoggingOut(true);
    // Mostra splash screen
    setShowSplash(true);

    // Aguarda um pouco para mostrar o splash, depois desloga
    setTimeout(() => {
      try {
        // Marca que houve logout bem-sucedido (usa sessionStorage para garantir que funcione)
        sessionStorage.setItem(STORAGE_KEYS.LOGOUT_SUCCESS, "true");

        // Desloga (limpa ambos os storages)
        authService.logout();

        // Navega para login usando replace para evitar histórico duplicado
        navigate(ROUTES.LOGIN, { replace: true });
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        // Em caso de erro, ainda navega para login
        navigate(ROUTES.LOGIN, { replace: true });
      }
    }, 800); // 0.8 segundos de splash
  }

  // Obtém nome e email do usuário
  const nomeUsuario =
    user?.nome ||
    user?.Nome ||
    user?.Name ||
    user?.nome_completo ||
    user?.Nome_Completo ||
    "";

  const emailUsuario = user?.email || user?.Email || "";

  // Mostra o nome se disponível, senão mostra o email, senão mostra "Usuário"
  const displayName = nomeUsuario || emailUsuario || "Usuário";

  return (
    <>
      {showSplash && <SplashScreen message="Saindo..." />}

      <header className="app-header relative z-[35]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          {/* Mobile/Tablet: Hambúrguer + Logo */}
          <div className="flex items-center gap-3 sm:gap-4 lg:hidden">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
              }}
              className="p-2 text-tegra-text-primary hover:text-tegra-blue-dark hover:bg-tegra-gray-light rounded-lg transition flex items-center justify-center"
              aria-label="Abrir menu"
              type="button"
            >
              <MdMenu className="text-xl sm:text-2xl" />
            </button>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="cursor-pointer hover:opacity-80 transition flex flex-col items-center"
              type="button"
              aria-label="Ir para Dashboard"
            >
              <img
                src="/logoCorp.png"
                alt="Logo TegraCorp"
                className="header-logo h-8 sm:h-10 w-auto object-contain"
              />
            </button>
          </div>

          {/* Desktop: Logo */}
          <div className="hidden lg:block">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="cursor-pointer hover:opacity-80 transition flex flex-col items-center"
              type="button"
              aria-label="Ir para Dashboard"
            >
              <img
                src="/logoCorp.png"
                alt="Logo TegraCorp"
                className="header-logo h-10 w-auto object-contain"
              />
            </button>
          </div>

          {/* Mobile/Tablet: Avatar do usuário */}
          <div className="flex items-center gap-2 sm:gap-4 lg:hidden relative">
            <div className="relative" ref={notificationMobileRef}>
              <button
                onClick={abrirFecharNotificacoes}
                className="p-2 text-tegra-text-primary hover:text-tegra-blue-dark hover:bg-tegra-gray-light rounded-lg transition flex items-center justify-center relative"
                type="button"
                aria-label="Notificações de formulários"
                title="Notificações de formulários"
              >
                <MdMessage className="text-xl sm:text-2xl" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-[300px] bg-white rounded-xl shadow-xl border border-tegra-gray-light z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-tegra-gray-light bg-tegra-bg-accent">
                    <p className="text-sm font-semibold text-tegra-text-primary">Atualizações de formulários</p>
                    <button
                      type="button"
                      onClick={carregarNotificacoesFormularios}
                      className="p-1.5 rounded-md hover:bg-tegra-gray-light transition-colors"
                      aria-label="Atualizar notificações"
                      title="Atualizar"
                    >
                      <MdRefresh className={`text-base text-tegra-blue-dark ${loadingNotifications ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-5 text-sm text-tegra-text-secondary">Sem atualizações no momento.</p>
                    ) : (
                      notifications.map((item) => (
                        <div key={item.id} className="px-4 py-3 border-b border-tegra-gray-light last:border-b-0">
                          <p className="text-sm font-semibold text-tegra-text-primary">{item.title}</p>
                          <p className="text-xs text-tegra-text-secondary mt-1">{item.message}</p>
                          <p className="text-[11px] text-tegra-blue-dark mt-2">{formatRelativeTime(item.updatedAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
            {user && (
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="cursor-pointer hover:opacity-80 transition"
                type="button"
                aria-label="Menu do usuário"
              >
                <Avatar user={user} size="md" />
              </button>
            )}

            {/* Dropdown Mobile */}
            {showUserDropdown && user && (
              <div className="absolute top-full right-0 mt-2 bg-gradient-to-br from-tegra-blue to-tegra-blue-light rounded-lg shadow-lg z-50 p-0.5">
                <div className="bg-white rounded-lg p-4 min-w-[250px]">
                  {/* Informações do usuário */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar user={user} size="md" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-tegra-text-primary">
                        {displayName}
                      </span>
                      {emailUsuario && (
                        <span className="text-xs text-tegra-text-secondary">
                          {emailUsuario}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Separador */}
                  <div className="h-px bg-gray-200 mb-4" />

                  {/* Status Online */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-500">online</span>
                  </div>

                  {/* Botão Sair */}
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-tegra-error hover:bg-red-50 rounded-lg transition text-sm font-medium"
                    type="button"
                  >
                    <MdLogout className="text-lg" />
                    Sair
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Desktop: Avatar + Nome + Logout */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="relative" ref={notificationDesktopRef}>
              <button
                onClick={abrirFecharNotificacoes}
                className="p-2 text-tegra-text-primary hover:text-tegra-blue-dark hover:bg-tegra-gray-light rounded-lg transition flex items-center justify-center relative"
                type="button"
                aria-label="Notificações de formulários"
                title="Notificações de formulários"
              >
                <MdMessage className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-[360px] bg-white rounded-xl shadow-xl border border-tegra-gray-light z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-tegra-gray-light bg-tegra-bg-accent">
                    <p className="text-sm font-semibold text-tegra-text-primary">Atualizações de formulários</p>
                    <button
                      type="button"
                      onClick={carregarNotificacoesFormularios}
                      className="p-1.5 rounded-md hover:bg-tegra-gray-light transition-colors"
                      aria-label="Atualizar notificações"
                      title="Atualizar"
                    >
                      <MdRefresh className={`text-base text-tegra-blue-dark ${loadingNotifications ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-5 text-sm text-tegra-text-secondary">Sem atualizações no momento.</p>
                    ) : (
                      notifications.map((item) => (
                        <div key={item.id} className="px-4 py-3 border-b border-tegra-gray-light last:border-b-0">
                          <p className="text-sm font-semibold text-tegra-text-primary">{item.title}</p>
                          <p className="text-xs text-tegra-text-secondary mt-1">{item.message}</p>
                          <p className="text-[11px] text-tegra-blue-dark mt-2">{formatRelativeTime(item.updatedAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="header-user flex items-center gap-3">
                {/* Avatar */}
                <Avatar user={user} size="md" />

                {/* Nome e Email */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-tegra-text-primary">
                    {displayName}
                  </span>
                  {emailUsuario && (
                    <span className="text-xs text-tegra-text-secondary">
                      {emailUsuario}
                    </span>
                  )}
                </div>

                {/* Indicador Online */}
                <div className="flex items-center gap-2 ml-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-500">online</span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="header-logout p-2 text-tegra-error hover:text-red-700 hover:bg-tegra-error-light rounded-lg transition flex items-center justify-center cursor-pointer"
              title="Sair"
              aria-label="Sair"
            >
              <MdLogout className="text-xl" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
