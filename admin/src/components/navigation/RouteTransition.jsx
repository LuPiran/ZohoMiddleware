import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import SplashScreen from "../feedback/auth/SplashScreen";
import { useLoading } from "../../contexts/LoadingContext";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";

/**
 * Componente para mostrar splash screen durante transições de rota
 */
export default function RouteTransition({ children }) {
  const location = useLocation();
  const { isLoading } = useLoading();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [showSplashUI, setShowSplashUI] = useState(false);
  const [isSplashClosing, setIsSplashClosing] = useState(false);
  const prevLocationRef = useRef(location.pathname);
  const isFirstRender = useRef(true);
  const transitionStartRef = useRef(0);
  const splashTimerRef = useRef(null);
  const loginOverlayShownRef = useRef(false);

  useEffect(() => {
    // Ignora a primeira renderização
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevLocationRef.current = location.pathname;
      return;
    }

    // Se a rota mudou, mostra splash screen
    if (location.pathname !== prevLocationRef.current) {
      // Evita splash na transição Login -> pós login
      if (
        prevLocationRef.current === ROUTES.LOGIN &&
        location.pathname !== ROUTES.LOGIN
      ) {
        setIsTransitioning(false);
        prevLocationRef.current = location.pathname;
        return;
      }

      transitionStartRef.current = Date.now();
      setIsTransitioning(true);
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === ROUTES.LOGIN) {
      loginOverlayShownRef.current = false;
      return;
    }

    const loginTransition = sessionStorage.getItem(
      STORAGE_KEYS.LOGIN_TRANSITION,
    );

    if (
      loginTransition === "true" &&
      !loginOverlayShownRef.current &&
      !isTransitioning &&
      !isLoading &&
      !showSplashUI
    ) {
      sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TRANSITION);
      loginOverlayShownRef.current = true;
      setShowLoginOverlay(true);

      const timer = setTimeout(() => {
        setShowLoginOverlay(false);
      }, 300);

      return () => clearTimeout(timer);
    }

    if (loginTransition === "true" && (isTransitioning || isLoading || showSplashUI)) {
      sessionStorage.removeItem(STORAGE_KEYS.LOGIN_TRANSITION);
      loginOverlayShownRef.current = true;
      setShowLoginOverlay(false);
    }
  }, [location.pathname, isTransitioning, isLoading, showSplashUI]);

  useEffect(() => {
    const shouldShow = isTransitioning || isLoading;

    if (shouldShow) {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
        splashTimerRef.current = null;
      }
      setIsSplashClosing(false);
      setShowSplashUI(true);
      return;
    }

    if (showSplashUI) {
      setIsSplashClosing(true);
      splashTimerRef.current = setTimeout(() => {
        setIsSplashClosing(false);
        setShowSplashUI(false);
        splashTimerRef.current = null;
      }, 250);
    }
  }, [isTransitioning, isLoading, showSplashUI]);

  useEffect(() => {
    return () => {
      if (splashTimerRef.current) {
        clearTimeout(splashTimerRef.current);
      }
    };
  }, []);

  // Esconde a splash quando não está mais carregando E não está em transição
  useEffect(() => {
    // Se não está carregando e está em transição, espera 1.5 segundos e esconde
    if (!isLoading && isTransitioning) {
      const elapsed = Date.now() - transitionStartRef.current;
      const remaining = Math.max(1000 - elapsed, 0);

      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, remaining);
      return () => clearTimeout(timer);
    }

    // Se não está carregando e não está em transição, garante que está desativado
    if (!isLoading && !isTransitioning) {
      setIsTransitioning(false);
    }
  }, [isLoading, isTransitioning]);

  return (
    <>
      {showLoginOverlay && (
        <div className="login-post-overlay" aria-hidden="true" />
      )}
      {showSplashUI && (
        <SplashScreen
          message="Carregando..."
          className={isSplashClosing ? "splash-exit" : "splash-enter"}
        />
      )}
      {children}
    </>
  );
}
