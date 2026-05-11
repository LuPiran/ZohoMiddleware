import { useLayoutEffect, useRef, useId } from "react";
import gsap from "gsap";

/** Larguras — mais altura para letras maiores */
const SIZE = {
  sm: "h-12 w-[min(100%,18rem)]",
  md: "h-16 w-[min(100%,24rem)]",
  lg: "h-24 w-[min(100%,30rem)]",
};

const FONT = {
  sm: { fontSize: 40, viewW: 440, viewH: 88, strokeWidth: 1.6, cx: 220, cy: 48 },
  md: { fontSize: 52, viewW: 520, viewH: 104, strokeWidth: 2, cx: 260, cy: 56 },
  lg: { fontSize: 64, viewW: 600, viewH: 120, strokeWidth: 2.35, cx: 300, cy: 64 },
};

/** Ciclo completo (traço se completa + se apaga) em 4s */
const CYCLE_SECONDS = 4;
const PAUSE_BETWEEN_MS = 80;

const DEFAULT_LABEL = "tegrapharma";

/**
 * Texto com traço em gradiente (efeito DrawSVG) + GSAP.
 */
export default function TegraLosangosLoader({
  size = "md",
  className = "",
  text = DEFAULT_LABEL,
  "aria-label": ariaLabel = "Carregando",
}) {
  const textRef = useRef(null);
  const svgRef = useRef(null);
  const uid = useId();
  const gradId = `tegra-text-grad-${uid.replace(/:/g, "")}`;
  const cfg = FONT[size] ?? FONT.md;

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || typeof el.getTotalLength !== "function") return undefined;

    let len;
    try {
      len = el.getTotalLength();
    } catch {
      return undefined;
    }

    if (!Number.isFinite(len) || len <= 0) return undefined;

    gsap.set(el, {
      strokeDasharray: len,
      strokeDashoffset: len,
    });

    const pauseSec = PAUSE_BETWEEN_MS / 1000;
    const half = (CYCLE_SECONDS - pauseSec) / 2;

    const tl = gsap.timeline({
      repeat: -1,
      defaults: { ease: "power2.inOut" },
    });

    tl.to(el, { strokeDashoffset: 0, duration: half });
    tl.to({}, { duration: pauseSec });
    tl.to(el, { strokeDashoffset: len, duration: half });

    return () => {
      tl.kill();
    };
  }, [text, size]);

  return (
    <svg
      ref={svgRef}
      className={`${SIZE[size] ?? SIZE.md} ${className}`}
      viewBox={`0 0 ${cfg.viewW} ${cfg.viewH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      <defs>
        <linearGradient
          id={gradId}
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#0f2440" />
          <stop offset="22%" stopColor="#1a2f5b" />
          <stop offset="42%" stopColor="#3da2b8" />
          <stop offset="62%" stopColor="#5ec8d4" />
          <stop offset="82%" stopColor="#8FA9C1" />
          <stop offset="100%" stopColor="#c9a8b8" />
        </linearGradient>
      </defs>
      <text
        ref={textRef}
        x={cfg.cx}
        y={cfg.cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="700"
        fontSize={cfg.fontSize}
        letterSpacing="0.06em"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={cfg.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
      >
        {text}
      </text>
    </svg>
  );
}
