import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../../assets/LogoTegra.png';

export default function RouteTransition({ children }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [previousPath, setPreviousPath] = useState(location.pathname);

  useEffect(() => {
    // Detecta mudança de rota (exceto no primeiro render)
    if (previousPath !== null && previousPath !== location.pathname) {
      // Verifica se é uma transição de login (não mostra loading nesse caso)
      const skipLoading = sessionStorage.getItem('SKIP_ROUTE_LOADING');
      
      if (skipLoading === 'true') {
        // Limpa o flag e apenas troca o conteúdo sem animação de loading
        sessionStorage.removeItem('SKIP_ROUTE_LOADING');
        setDisplayChildren(children);
        setPreviousPath(location.pathname);
      } else {
        // Mostra animação normal de loading
        setIsTransitioning(true);
        setIsExiting(false);
        
        // Delay de 1 segundo antes de trocar o conteúdo
        const contentTimer = setTimeout(() => {
          setDisplayChildren(children);
          // Inicia animação de saída após trocar conteúdo
          setTimeout(() => {
            setIsExiting(true);
          }, 100);
        }, 1000);

        // Finaliza a transição após animação de saída
        const transitionTimer = setTimeout(() => {
          setIsTransitioning(false);
          setIsExiting(false);
          setPreviousPath(location.pathname);
        }, 1400);

        return () => {
          clearTimeout(contentTimer);
          clearTimeout(transitionTimer);
        };
      }
    } else if (previousPath === null) {
      // Primeiro render - só atualiza previousPath
      setDisplayChildren(children);
      setPreviousPath(location.pathname);
    }
  }, [location.pathname, children]);

  return (
    <>
      {displayChildren}
      {isTransitioning && (
        <div className={`route-transition-overlay ${isExiting ? 'route-transition-exit' : ''}`}>
          <div className="route-transition-glass"></div>
          <div className="route-transition-content">
            <div className="route-loader-container">
              <img src={logo} alt="TegraPharma" className="route-logo" />
              <svg className="route-spinner" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#2e4a86', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#21b3b3', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#2e4a86', stopOpacity: 0.3 }} />
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
