import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const DOTS = ['', '.', '..', '...'];
function useLoadingDots(active) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) { setStep(0); return; }
    const id = setInterval(() => setStep(s => (s + 1) % 4), 420);
    return () => clearInterval(id);
  }, [active]);
  return DOTS[step];
}

export default function RouteTransition({ children }) {
  const MAX_TRANSITION_MS = 5000;
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const dots = useLoadingDots(isTransitioning);
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
          {/* Barra shimmer no topo */}
          <div className="route-top-bar" />

          <div className="route-transition-glass" />
          <div className="route-transition-content">
            <div className="route-loader-container">
              {/* Logo centralizado */}
              <img src="/logoCorp.png" alt="Logo corporativo" className="route-logo" />

              {/* Comet spinner — trilha que some, arco curto */}
              <svg className="route-rings-svg" viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                  <linearGradient id="sgComet" gradientUnits="userSpaceOnUse"
                    x1="60" y1="8" x2="115" y2="60">
                    <stop offset="0%"   style={{ stopColor: '#8FA9C1', stopOpacity: 0 }} />
                    <stop offset="70%"  style={{ stopColor: '#8FA9C1', stopOpacity: 0.7 }} />
                    <stop offset="100%" style={{ stopColor: '#8FA9C1', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                {/* Track fantasma */}
                <circle cx="60" cy="60" r="52" fill="none"
                  stroke="rgba(143,169,193,0.10)" strokeWidth="2.5" />
                {/* Arco comet girando */}
                <g className="route-ring-outer">
                  <circle cx="60" cy="60" r="52" fill="none"
                    stroke="url(#sgComet)" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray="90 237" />
                </g>
              </svg>

              {/* Texto posicionado abaixo do container */}
              <p className="route-loading-text">
                Carregando<span className="route-dots">{dots}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
