import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PlatformUpdatePopup } from "../feedback/auth";
import { getPlatformUpdateStorageKey, ROUTES } from "../../utils/constants";
import { authService } from "../../services/auth";
import Header from "./Header";
import Navbar from "./Navbar";

/**
 * Layout principal da aplicação
 * Inclui Header e Navbar
 */
export default function MainLayout({ children }) {
  const location = useLocation();
  const [showPlatformUpdate, setShowPlatformUpdate] = useState(false);
  const isDashboardRoute = location.pathname === ROUTES.DASHBOARD;
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
    <div className="min-h-screen bg-tegra-bg-secondary">
      <Header />
      <Navbar />
      <main>{children}</main>
      <PlatformUpdatePopup
        isOpen={showPlatformUpdate && isDashboardRoute}
        onContinue={handleContinue}
      />
    </div>
  );
}
