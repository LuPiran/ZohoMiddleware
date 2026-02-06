import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import logo from "../../assets/LogoTegra.png";
import { MdLogout, MdMenu } from "react-icons/md";
import Avatar from "../ui/Avatar";
import SplashScreen from "../feedback/auth/SplashScreen";
import { useMenu } from "../../contexts/MenuContext";

export default function Header() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [showSplash, setShowSplash] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toggleMenu } = useMenu();

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

      <header className="bg-tegra-bg-primary shadow-sm border-b border-tegra-gray-medium relative z-[35]">
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
            <img
              src={logo}
              alt="Logo TegraPharma"
              className="h-8 sm:h-10 w-auto object-contain"
            />
          </div>

          {/* Desktop: Logo */}
          <div className="hidden lg:block">
            <img
              src={logo}
              alt="Logo TegraPharma"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Mobile/Tablet: Avatar do usuário */}
          <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
            {user && <Avatar user={user} size="md" />}
          </div>

          {/* Desktop: Avatar + Nome + Logout */}
          <div className="hidden lg:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
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
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-tegra-error hover:text-red-700 hover:bg-tegra-error-light rounded-lg transition flex items-center justify-center cursor-pointer"
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
