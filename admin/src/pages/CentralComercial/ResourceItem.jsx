import { motion, useReducedMotion } from "framer-motion";
import {
  getCatalogIcon,
  getIconTone,
  TAG_STYLES,
  MdChevronRight,
  MdOpenInNew,
} from "./iconMap";

const itemTransition = { duration: 0.28, ease: [0.16, 1, 0.3, 1] };

export default function ResourceItem({
  layout = "row",
  icon,
  toneKey,
  title,
  description,
  tag,
  href,
  onOpen,
  delay = 0,
}) {
  const reduceMotion = useReducedMotion();
  const Icon = getCatalogIcon(icon);
  const tone = getIconTone(toneKey || icon);
  const isLink = Boolean(href) && !onOpen;
  const Tag = isLink ? motion.a : motion.button;
  const extraProps = isLink
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { type: "button", onClick: onOpen };

  const tagClass = tag ? TAG_STYLES[tag] || TAG_STYLES["Broad Spectrum"] : "";
  const isGrid = layout === "grid";

  return (
    <Tag
      {...extraProps}
      initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ ...itemTransition, delay: reduceMotion ? 0 : delay }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      className={`group relative text-left rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-tegra-blue-light/40 ${tone.border} ${
        isGrid
          ? "flex flex-col gap-3 p-4 sm:p-5"
          : "flex items-center gap-3.5 p-3.5 sm:p-4"
      } ${tone.hover}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg ${tone.wrap} ${
          isGrid ? "h-11 w-11" : "h-11 w-11 sm:h-12 sm:w-12"
        }`}
      >
        <Icon className="text-xl" aria-hidden />
      </span>

      <span className={`min-w-0 ${isGrid ? "" : "flex-1"}`}>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-tegra-blue-dark leading-snug text-[15px] sm:text-base">
            {title}
          </span>
          {tag ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tagClass}`}
            >
              {tag}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-1 block text-sm text-tegra-text-secondary leading-snug">
            {description}
          </span>
        ) : null}
      </span>

      {!isGrid ? (
        isLink ? (
          <MdOpenInNew
            className="ml-auto shrink-0 text-base text-tegra-blue group-hover:text-tegra-blue-dark"
            aria-hidden
          />
        ) : (
          <MdChevronRight
            className="ml-auto shrink-0 text-xl text-slate-300 group-hover:text-tegra-blue-dark"
            aria-hidden
          />
        )
      ) : null}
    </Tag>
  );
}
