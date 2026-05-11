import { useSpring, animated, config } from "@react-spring/web";

/**
 * Microinteração em molas (React Spring) — hover suave, alinhado ao visual Tegra.
 */
export default function SpringHover({ children, className = "" }) {
  const [springs, api] = useSpring(() => ({
    transform: "translateY(0px) scale(1)",
    config: { ...config.gentle, tension: 320, friction: 22 },
  }));

  return (
    <animated.div
      className={className}
      style={springs}
      onMouseEnter={() =>
        api.start({ transform: "translateY(-2px) scale(1.02)" })
      }
      onMouseLeave={() =>
        api.start({ transform: "translateY(0px) scale(1)" })
      }
    >
      {children}
    </animated.div>
  );
}
