import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import { MdLogout, MdMenu } from "react-icons/md";
import Avatar from "../ui/Avatar";
import SplashScreen from "../feedback/auth/SplashScreen";
import { useMenu } from "../../contexts/MenuContext";
import { useUserDropdown } from "../../contexts/UserContext";

export default function Header() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [showSplash, setShowSplash] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { showUserDropdown, setShowUserDropdown } = useUserDropdown();
  const userMenuRef = useRef(null);
  const { toggleMenu } = useMenu();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    }

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showUserDropdown]);

  function handleLogout() {
    // Previne múltiplos cliques e loops
    if (showSplash || isLoggingOut) return;

    setIsLoggingOut(true);
    // Mostra splash screen
    setShowSplash(true);

    // Aguarda um pouco para mostrar o splash, depois desloga
    setTimeout(async () => {
      try {
        // Marca que houve logout bem-sucedido (usa sessionStorage para garantir que funcione)
        sessionStorage.setItem(STORAGE_KEYS.LOGOUT_SUCCESS, "true");

        // Desloga (limpa ambos os storages)
        await authService.logout();

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
          <div className="flex items-center gap-2 sm:gap-4 lg:hidden relative" ref={userMenuRef}>
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

          {/* Desktop: Avatar + Nome + Logout */}
          <div className="hidden lg:flex items-center gap-4">
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
