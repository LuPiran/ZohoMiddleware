import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteTransition({ children }) {
  const MAX_TRANSITION_MS = 5000;
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const previousPathRef = useRef(location.pathname);
  const exitTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const watchdogTimerRef = useRef(null);

  const clearTransitionTimers = () => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      // Verifica se é uma transição de login (não mostra loading nesse caso)
      const skipLoading = sessionStorage.getItem('SKIP_ROUTE_LOADING');

      // Atualiza o caminho imediatamente para evitar reinício da animação em re-renders.
      previousPathRef.current = location.pathname;
      
      if (skipLoading === 'true') {
        // Limpa o flag e apenas troca o conteúdo sem animação de loading
        sessionStorage.removeItem('SKIP_ROUTE_LOADING');
        clearTransitionTimers();
        setIsTransitioning(false);
        setIsExiting(false);
      } else {
        // Evita reiniciar timers em redirecionamentos rápidos de rota.
        if (isTransitioning) {
          return;
        }

        // Mostra animação normal de loading
        clearTransitionTimers();
        setIsTransitioning(true);
        setIsExiting(false);
        
        // Inicia animação de saída após breve exibição do loader
        exitTimerRef.current = setTimeout(() => {
          setIsExiting(true);
        }, 1000);

        // Finaliza a transição após animação de saída
        transitionTimerRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setIsExiting(false);
        }, 1400);

        // Failsafe: garante desligamento do overlay mesmo em casos inesperados.
        watchdogTimerRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setIsExiting(false);
          clearTransitionTimers();
        }, MAX_TRANSITION_MS);
      }
    }
  }, [location.pathname, isTransitioning]);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, []);

  return (
    <>
      {children}
      {isTransitioning && (
        <div className={`route-transition-overlay ${isExiting ? 'route-transition-exit' : ''}`}>
          <div className="route-transition-glass"></div>
          <div className="route-transition-content">
            <div className="route-loader-container">
              <img src="/logoCorp.png" alt="Logo corporativo" className="route-logo" />
              <svg className="route-spinner" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#8FA9C1', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#E5989B', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#8FA9C1', stopOpacity: 0.3 }} />
                  </linearGradient>
                </defs>
                <circle
                  className="route-spinner-circle"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#spinnerGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="route-loading-text">Carregando</p>
          </div>
        </div>
      )}
    </>
  );
}
