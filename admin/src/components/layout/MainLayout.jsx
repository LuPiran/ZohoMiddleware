import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MdHelpOutline } from "react-icons/md";
import { PlatformUpdatePopup } from "../feedback/auth";
import { getPlatformUpdateStorageKey, ROUTES } from "../../utils/constants";
import { authService } from "../../services/auth";
import Header from "./Header";
import Navbar from "./Navbar";
import SlaOfferModal from "./SlaOfferModal";
import { SlaOfferProvider } from "../../contexts/SlaOfferContext";

/**
 * Layout principal da aplicação
 * Inclui Header e Navbar
 */
export default function MainLayout({ children }) {
  const location = useLocation();
  const [showPlatformUpdate, setShowPlatformUpdate] = useState(false);
  const isDashboardRoute = location.pathname === ROUTES.DASHBOARD;
  const isFaqRoute = location.pathname === ROUTES.FAQ;
  const user = authService.getUser();
  const updateStorageKey = getPlatformUpdateStorageKey(user);

  useEffect(() => {
    if (!isDashboardRoute || !user) {
      setShowPlatformUpdate(false);
      return;
    }

    const hasSeenUpdate = localStorage.getItem(updateStorageKey) === "true";
    setShowPlatformUpdate(!hasSeenUpdate);
  }, [isDashboardRoute, updateStorageKey, user]);

  function handleContinue() {
    localStorage.setItem(updateStorageKey, "true");
    setShowPlatformUpdate(false);
  }

  return (
    <SlaOfferProvider>
      <div className="min-h-screen bg-tegra-bg-secondary">
      <Header />
      <Navbar />
      <main>{children}</main>
      {!isFaqRoute && (
        <NavLink
          to={ROUTES.FAQ}
          aria-label="Abrir FAQ e Ajuda"
          title="FAQ e Ajuda"
          className={[
            "fixed z-40 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-tegra-blue-light focus:ring-offset-2",
            // Mobile: ícone circular simples, canto inferior direito
            "bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full",
            "bg-tegra-blue-dark text-white shadow-[0_6px_20px_rgba(27,52,108,0.35)]",
            "hover:bg-tegra-blue active:scale-95",
            // Desktop: pill completo com texto
            "sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:inline-flex sm:items-center sm:gap-3 sm:rounded-full",
            "sm:border sm:border-white/20 sm:bg-gradient-to-r sm:from-tegra-blue-dark sm:to-tegra-blue",
            "sm:px-4 sm:py-3 sm:text-sm sm:font-semibold",
            "sm:shadow-[0_14px_32px_rgba(27,52,108,0.28)]",
            "sm:hover:-translate-y-0.5 sm:hover:from-tegra-blue sm:hover:to-tegra-blue-dark",
            "sm:hover:shadow-[0_18px_36px_rgba(27,52,108,0.36)]",
          ].join(" ")}
        >
          {/* Mobile: só ícone */}
          <MdHelpOutline className="text-xl sm:hidden" aria-hidden />

          {/* Desktop: ícone com círculo + texto */}
          <span className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/20">
            <MdHelpOutline className="text-lg" aria-hidden />
          </span>
          <span className="hidden sm:inline">FAQ e Ajuda</span>
        </NavLink>
      )}
      <PlatformUpdatePopup
        isOpen={showPlatformUpdate && isDashboardRoute}
        onContinue={handleContinue}
      />
      <SlaOfferModal />
      </div>
    </SlaOfferProvider>
  );
}
