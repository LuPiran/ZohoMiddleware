import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSpring, animated, config } from "@react-spring/web";
import TegraLosangosLoader from "../animation/TegraLosangosLoader";
import { ROUTES } from "../../utils/constants";

function RouteLoadingPulse() {
  const springs = useSpring({
    from: { opacity: 0.55 },
    to: { opacity: 1 },
    loop: { reverse: true },
    config: { ...config.gentle, duration: 420 },
  });

  return (
    <animated.p
      style={springs}
      className="route-loading-text !animate-none"
    >
      Carregando
    </animated.p>
  );
}

function RouteOverlay() {
  return (
    <motion.div
      className="route-transition-overlay !animate-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="route-transition-glass" />
      <div className="route-transition-content !animate-none flex flex-col items-center justify-center gap-4">
        <TegraLosangosLoader size="md" />
        <RouteLoadingPulse />
      </div>
    </motion.div>
  );
}

/**
 * Overlay breve ao trocar de rota: Framer Motion (fade), losangos Tegra com GSAP (desenho/desfazer), React Spring (texto).
 */
export default function RouteTransition({ children }) {
  const location = useLocation();
  const [showOverlay, setShowOverlay] = useState(false);
  const firstNavRef = useRef(true);
  const isAuthRoute =
    location.pathname === ROUTES.LOGIN || location.pathname === ROUTES.MFA;

  useEffect(() => {
    if (firstNavRef.current) {
      firstNavRef.current = false;
      return undefined;
    }

    const skip = sessionStorage.getItem("SKIP_ROUTE_LOADING");
    if (skip === "true") {
      sessionStorage.removeItem("SKIP_ROUTE_LOADING");
      return undefined;
    }

    setShowOverlay(true);
    const t = window.setTimeout(() => setShowOverlay(false), 400);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  // Evita scroll/área branca apenas em Login/2FA e durante loading overlay.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const shouldLock = isAuthRoute || showOverlay;
    html.style.overflow = shouldLock ? "hidden" : "";
    body.style.overflow = shouldLock ? "hidden" : "";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [isAuthRoute, showOverlay]);

  return (
    <>
      <div className="flex min-h-screen w-full flex-1 flex-col">
        {children}
      </div>
      <AnimatePresence>
        {showOverlay && <RouteOverlay key={location.pathname} />}
      </AnimatePresence>
    </>
  );
}
