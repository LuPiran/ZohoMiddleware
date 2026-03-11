import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PlatformUpdatePopup } from "../feedback/auth";
import {
  getPlatformUpdateStorageKey,
  ROUTES,
  STORAGE_KEYS,
} from "../../utils/constants";
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

  useEffect(() => {
    const shouldShow =
      sessionStorage.getItem(STORAGE_KEYS.LOGIN_SUCCESS) === "true";

    const user = authService.getUser();
    const updateStorageKey = getPlatformUpdateStorageKey(user);
    const hasSeenUpdate = localStorage.getItem(updateStorageKey) === "true";

    if (shouldShow && !hasSeenUpdate && isDashboardRoute) {
      localStorage.setItem(updateStorageKey, "true");
      setShowPlatformUpdate(true);
    }

    sessionStorage.removeItem(STORAGE_KEYS.LOGIN_SUCCESS);
  }, [isDashboardRoute]);

  function handleContinue() {
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
