import { motion, useReducedMotion } from "framer-motion";
import {
  getCatalogIcon,
  getIconTone,
  MdChevronRight,
  MdDownload,
  MdVisibility,
} from "./iconMap";

const itemTransition = { duration: 0.28, ease: [0.16, 1, 0.3, 1] };

export default function ResourceItem({
  layout = "row",
  icon,
  toneKey,
  title,
  description,
  modified = "",
  sizeLabel = "",
  isFolder = true,
  onOpen,
  onDownload,
  delay = 0,
}) {
  const reduceMotion = useReducedMotion();
  const Icon = getCatalogIcon(icon);
  const tone = getIconTone(toneKey || icon);
  const isGrid = layout === "grid";
  const isExplorer = layout === "explorer";

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ ...itemTransition, delay: reduceMotion ? 0 : delay }}
      whileHover={reduceMotion ? undefined : { y: isExplorer ? 0 : -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      className={`group relative text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3da2b8] ${
        isExplorer
          ? "central-explorer-row"
          : `rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md ${tone.border} ${tone.hover} ${
              isGrid
                ? "flex flex-col gap-3 p-4 sm:p-5"
                : "flex items-center gap-3.5 p-3.5 sm:p-4"
            }`
      }`}
    >
      {isExplorer ? (
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.wrap}`}
          >
            <Icon className="text-xl" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-tegra-blue-dark leading-snug text-[15px] sm:text-base">
              {title}
            </span>
            <span className="mt-0.5 block text-xs text-tegra-text-secondary sm:hidden">
              {[modified, sizeLabel].filter((value) => value && value !== "—").join(" · ")}
            </span>
          </span>
        </span>
      ) : (
        <>
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg ${tone.wrap} ${
              isGrid ? "h-11 w-11" : "h-11 w-11 sm:h-12 sm:w-12"
            }`}
          >
            <Icon className="text-xl" aria-hidden />
          </span>
          <span className={`min-w-0 ${isGrid ? "" : "flex-1"}`}>
            <span className="font-semibold text-tegra-blue-dark leading-snug text-[15px] sm:text-base">
              {title}
            </span>
            {description ? (
              <span className="mt-1 block text-sm text-tegra-text-secondary leading-snug">
                {description}
              </span>
            ) : null}
          </span>
        </>
      )}
      {isExplorer ? (
        <>
          <span className="central-explorer-meta hidden sm:block">
            {modified || "—"}
          </span>
          <span className="central-explorer-meta hidden sm:block">
            {sizeLabel || "—"}
          </span>
        </>
      ) : null}

      {!isGrid ? (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {!isFolder && onDownload ? (
            <span
              role="button"
              tabIndex={0}
              title="Baixar arquivo"
              aria-label={`Baixar ${title}`}
              onClick={(event) => {
                event.stopPropagation();
                onDownload();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onDownload();
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-tegra-blue-dark hover:bg-[#3da2b8]/12"
            >
              <MdDownload className="text-lg" aria-hidden />
            </span>
          ) : null}
          {!isFolder ? (
            <MdVisibility
              className="text-base text-tegra-blue group-hover:text-tegra-blue-dark"
              aria-hidden
            />
          ) : (
            <MdChevronRight
              className="text-xl text-slate-300 group-hover:text-tegra-blue-dark"
              aria-hidden
            />
          )}
        </span>
      ) : null}
    </motion.button>
  );
}
