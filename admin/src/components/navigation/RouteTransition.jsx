import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import SplashScreen from "../feedback/auth/SplashScreen";
import { useLoading } from "../../contexts/LoadingContext";

/**
 * Componente para mostrar splash screen durante transições de rota
 */
export default function RouteTransition({ children }) {
  const location = useLocation();
  const { isLoading } = useLoading();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevLocationRef = useRef(location.pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Ignora a primeira renderização
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevLocationRef.current = location.pathname;
      return;
    }

    // Se a rota mudou, mostra splash screen
    if (location.pathname !== prevLocationRef.current) {
      setIsTransitioning(true);
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Esconde a splash quando não está mais carregando E não está em transição
  useEffect(() => {
    // Se não está carregando e está em transição, espera 1.5 segundos e esconde
    if (!isLoading && isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 1500); // 1.5 segundos de splash
      return () => clearTimeout(timer);
    }

    // Se não está carregando e não está em transição, garante que está desativado
    if (!isLoading && !isTransitioning) {
      setIsTransitioning(false);
    }
  }, [isLoading, isTransitioning]);

  // Mostra splash se estiver em transição OU carregando dados
  const showSplash = isTransitioning || isLoading;

  return (
    <>
      {showSplash && <SplashScreen message="Carregando..." />}
      {children}
    </>
  );
}
