import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MdHelpOutline } from "react-icons/md";
import { PlatformUpdatePopup } from "../feedback/auth";
import { getPlatformUpdateStorageKey, ROUTES } from "../../utils/constants";
import { authService } from "../../services/auth";
import Header from "./Header";
import Navbar from "./Navbar";
import BounceFooter from "./BounceFooter";

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
    <div className="flex min-h-screen w-full flex-1 flex-col bg-tegra-bg-secondary">
      <Header />
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <BounceFooter />
      {!isFaqRoute && (
        <NavLink
          to={ROUTES.FAQ}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-3 rounded-full border border-white/20 bg-gradient-to-r from-tegra-blue-dark to-tegra-blue px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(27,52,108,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:from-tegra-blue hover:to-tegra-blue-dark hover:shadow-[0_18px_36px_rgba(27,52,108,0.36)] focus:outline-none focus:ring-2 focus:ring-tegra-blue-light focus:ring-offset-2"
          aria-label="Abrir FAQ e Ajuda"
          title="FAQ e Ajuda"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/20">
            <MdHelpOutline className="text-lg" />
          </span>
          <span className="hidden sm:inline">FAQ e Ajuda</span>
          <span className="sm:hidden">FAQ</span>
        </NavLink>
      )}
      <PlatformUpdatePopup
        isOpen={showPlatformUpdate && isDashboardRoute}
        onContinue={handleContinue}
      />
    </div>
  );
}
