import { useSpring, animated, config } from "@react-spring/web";
import TegraLosangosLoader from "../../animation/TegraLosangosLoader";

/**
 * Splash com losangos Tegra desenhados via GSAP (efeito DrawSVG) + texto em leve pulso (React Spring).
 */
export default function SplashScreen({ message = "Carregando..." }) {
  const textSpring = useSpring({
    from: { opacity: 0.65 },
    to: { opacity: 1 },
    loop: { reverse: true },
    config: { ...config.gentle, duration: 550 },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tegra-bg-primary/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8">
        <TegraLosangosLoader size="lg" />
        {message && (
          <animated.p
            style={textSpring}
            className="text-tegra-text-secondary text-sm font-medium text-center max-w-xs px-4"
          >
            {message}
          </animated.p>
        )}
      </div>
    </div>
  );
}
