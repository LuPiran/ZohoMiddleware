import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import logo from "../../assets/Logo-TegraPharma.webp";
import { MdLogout } from "react-icons/md";
import Avatar from "../ui/Avatar";
import SplashScreen from "../feedback/auth/SplashScreen";

export default function Header() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [showSplash, setShowSplash] = useState(false);

  function handleLogout() {
    // Mostra splash screen
    setShowSplash(true);

    // Aguarda um pouco para mostrar o splash, depois desloga
    setTimeout(() => {
      // Marca que houve logout bem-sucedido (usa sessionStorage para garantir que funcione)
      sessionStorage.setItem(STORAGE_KEYS.LOGOUT_SUCCESS, "true");

      // Desloga
      authService.logout();

      // Navega para login
      navigate(ROUTES.LOGIN);
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

      <header className="bg-tegra-bg-primary shadow-sm border-b border-tegra-gray-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <img
            src={logo}
            alt="Logo TegraPharma"
            className="h-10 w-auto object-contain"
          />
          <div className="flex items-center gap-4">
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
              className="p-2 text-tegra-error hover:text-red-700 hover:bg-tegra-error-light rounded-lg transition flex items-center justify-center"
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
