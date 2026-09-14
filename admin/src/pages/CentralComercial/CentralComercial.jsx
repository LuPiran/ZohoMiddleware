import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  MdArrowBack,
  MdClose,
  MdHome,
  MdInfoOutline,
  MdSearch,
} from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { CATALOG_META } from "./catalog";
import {
  CATEGORY_OPTIONS,
  resolveHomeSections,
  resolvePageGroups,
  searchCatalog,
} from "./catalogHelpers";
import { getCatalogIcon, getIconTone } from "./iconMap";
import ResourceItem from "./ResourceItem";
import "./CentralComercial.css";

gsap.registerPlugin(useGSAP);

const HOME_SECTIONS = resolveHomeSections();

const HEX_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='74' viewBox='0 0 64 74'%3E%3Cpath d='M32 0 L64 18.5 L64 55.5 L32 74 L0 55.5 L0 18.5 Z' fill='none' stroke='%2325b3b8' stroke-opacity='0.22' stroke-width='1.5'/%3E%3C/svg%3E")`;
const HEADER_NAVY = "#244586";
const HEADER_NAVY_DEEP = "#1b3668";
const HEADER_TEAL = "#25b3b8";

export default function CentralComercial() {
  const reduceMotion = useReducedMotion();
  const pageRef = useRef(null);
  const hexRef = useRef(null);
  const folderRef = useRef(null);

  const [stack, setStack] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const currentId = stack[stack.length - 1] || null;
  const searching = query.trim().length >= 2;
  const results = useMemo(
    () => (searching ? searchCatalog(query, category) : []),
    [searching, query, category],
  );
  const pageGroups = useMemo(
    () => (currentId && !searching ? resolvePageGroups(currentId) : []),
    [currentId, searching],
  );

  const viewKey = searching
    ? `search:${category}:${query}`
    : currentId
      ? `page:${stack.join("/")}`
      : "home";

  useEffect(() => {
    if (query.trim().length >= 2) return;
    setCategory(stack[0] || "all");
  }, [stack, query]);

  useGSAP(
    () => {
      const hex = hexRef.current;
      if (!hex || reduceMotion) return;

      gsap.to(hex, {
        backgroundPosition: "64px 74px",
        duration: 22,
        repeat: -1,
        ease: "none",
      });
    },
    { scope: pageRef, dependencies: [reduceMotion] },
  );

  useGSAP(
    () => {
      const folder = folderRef.current;
      if (!folder || reduceMotion) return;

      gsap.fromTo(
        folder,
        { clipPath: "inset(0% 0% 12% 0%)", filter: "blur(5px)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power3.out",
          clearProps: "clipPath,filter",
        },
      );
    },
    { scope: pageRef, dependencies: [viewKey, reduceMotion] },
  );

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function goTo(id) {
    setStack((prev) => [...prev, id]);
    setQuery("");
    scrollTop();
  }

  function goBack() {
    setStack((prev) => prev.slice(0, -1));
    scrollTop();
  }

  function goHome() {
    setStack([]);
    setQuery("");
    setCategory("all");
    scrollTop();
  }

  function goToPath(path) {
    setStack(path);
    setQuery("");
    setCategory(path[0] || "all");
    scrollTop();
  }

  function handleCategoryChange(event) {
    const next = event.target.value || "all";
    setCategory(next);

    if (query.trim().length >= 2) {
      return;
    }

    if (next === "all") {
      setStack([]);
    } else {
      setStack([next]);
    }
    scrollTop();
  }

  const subtitle = currentId
    ? CATALOG_META[currentId].label
    : "Materiais e recursos técnicos";

  return (
    <MainLayout>
      <div ref={pageRef} className="central-comercial-page max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10">
        <section className="relative overflow-hidden rounded-2xl shadow-md mb-5">
          <div
            className="relative px-5 py-6 sm:px-6"
            style={{ backgroundColor: HEADER_NAVY }}
          >
            <div
              ref={hexRef}
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: HEX_PATTERN,
                backgroundSize: "64px 74px",
              }}
              aria-hidden
            />
            <div className="relative z-10 min-w-0">
              <h1 className="text-[22px] sm:text-[25px] font-extrabold tracking-tight text-white">
                Central TegraPharma
              </h1>
              <p className="mt-1 text-sm sm:text-base text-[#a8d4e0]">
                {subtitle}
              </p>
            </div>
          </div>

          <div
            className="relative px-5 py-3.5 sm:px-6"
            style={{ backgroundColor: HEADER_NAVY_DEEP }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: HEX_PATTERN,
                backgroundSize: "64px 74px",
              }}
              aria-hidden
            />
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[minmax(11rem,14rem)_1fr] gap-2">
              <Select
                value={category}
                onChange={handleCategoryChange}
                options={CATEGORY_OPTIONS}
                placeholder="Filtrar categoria"
                isSearchable
                variant="onDark"
                inputId="central-categoria"
                aria-label="Filtrar categoria"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar um item…"
                icon={<MdSearch />}
                showIconClear={query.length > 0}
                iconClear={<MdClose />}
                onClearClick={() => setQuery("")}
                className="!rounded-[10px] !border-2 bg-white text-tegra-blue-dark focus:!ring-[#25b3b8]"
                style={{ borderColor: HEADER_TEAL }}
              />
            </div>
          </div>
        </section>

        {currentId && !searching ? (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                onClick={goBack}
                className="flex-1 inline-flex items-center justify-center gap-2"
              >
                <MdArrowBack aria-hidden />
                Voltar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={goHome}
                className="flex-1 inline-flex items-center justify-center gap-2"
              >
                <MdHome aria-hidden />
                Início
              </Button>
            </div>
            <nav
              aria-label="Navegação da pasta"
              className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-tegra-text-secondary"
            >
              <button
                type="button"
                onClick={goHome}
                className="text-[#3da2b8] underline-offset-2 hover:underline"
              >
                Início
              </button>
              {stack.map((id, index) => (
                <span key={id} className="inline-flex items-center gap-1.5">
                  <span className="text-slate-300" aria-hidden>
                    ›
                  </span>
                  {index === stack.length - 1 ? (
                    <span className="font-semibold text-tegra-blue-dark">
                      {CATALOG_META[id].label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStack(stack.slice(0, index + 1))}
                      className="text-[#3da2b8] underline-offset-2 hover:underline"
                    >
                      {CATALOG_META[id].label}
                    </button>
                  )}
                </span>
              ))}
            </nav>
          </div>
        ) : null}

        <div ref={folderRef} className="min-h-[12rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewKey}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {searching ? (
                <SearchView results={results} onGoToPath={goToPath} />
              ) : currentId ? (
                <FolderView
                  title={CATALOG_META[currentId].label}
                  groups={pageGroups}
                  onOpenFolder={goTo}
                />
              ) : (
                <HomeView onOpenFolder={goTo} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}

function HomeView({ onOpenFolder }) {
  return (
    <div className="space-y-7">
      <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
          Como usar
        </h2>
        <p className="flex gap-3 text-sm sm:text-base text-tegra-text-secondary leading-relaxed">
          <MdInfoOutline className="mt-0.5 shrink-0 text-lg text-tegra-blue-dark" aria-hidden />
          <span>
            Navegue pelas pastas. Os arquivos ficam no SharePoint — é preciso
            estar logado na conta TegraPharma para abrir os materiais.
          </span>
        </p>
      </div>

      {HOME_SECTIONS.map((section) => (
        <section key={section.label} className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
            {section.label}
          </h2>
          <div
            className={
              section.asGrid
                ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
                : "flex flex-col gap-3"
            }
          >
            {section.items.map((item, index) => (
              <ResourceItem
                key={item.label}
                layout={section.asGrid ? "grid" : "row"}
                icon={item.icon}
                title={item.label}
                description={item.desc}
                href={item.kind === "link" ? item.href : undefined}
                onOpen={item.kind === "nav" ? () => onOpenFolder(item.nav) : undefined}
                delay={Math.min(index * 0.04, 0.2)}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="pb-6 text-center text-xs text-tegra-text-light">
        Central TegraPharma · Materiais e recursos técnicos
      </p>
    </div>
  );
}

function FolderView({ title, groups, onOpenFolder }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-tegra-blue-dark">
          {title}
        </h2>
        <p className="mt-1 text-sm sm:text-base text-tegra-text-secondary">
          Toque em um item para abrir a pasta no SharePoint.
        </p>
      </div>

      {groups.map((group, groupIndex) => (
        <section
          key={group.label || `grupo-${groupIndex}`}
          className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6"
        >
          {group.label ? (
            <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
              {group.label}
            </h2>
          ) : null}
          <div className="flex flex-col gap-3">
            {group.items.map((item, index) => (
              <ResourceItem
                key={`${item.label}-${index}`}
                icon={item.kind === "nav" ? "folder" : item.toneIcon || "file"}
                toneKey={item.toneIcon || item.icon}
                title={item.label}
                description={item.desc}
                tag={item.tag}
                href={item.kind === "link" ? item.href : undefined}
                onOpen={item.kind === "nav" ? () => onOpenFolder(item.nav) : undefined}
                delay={Math.min(index * 0.035, 0.18)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SearchView({ results, onGoToPath }) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-base font-semibold text-tegra-blue-dark">
          Nada encontrado
        </p>
        <p className="mt-2 text-sm text-tegra-text-secondary">
          Tente outra palavra ou mude a categoria do filtro.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
        {results.length} {results.length === 1 ? "resultado" : "resultados"}
      </h2>
      <div className="flex flex-col gap-3">
        {results.map((result, index) => {
          const Icon = getCatalogIcon(result.icon);
          const tone = getIconTone(result.icon);
          return (
            <motion.button
              key={`${result.label}-${result.where}`}
              type="button"
              onClick={() => onGoToPath(result.path)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.25 }}
              className={`flex items-center gap-3.5 rounded-xl bg-white p-3.5 text-left shadow-sm transition hover:shadow-md ${tone.border} ${tone.hover}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.wrap}`}
              >
                <Icon className="text-lg" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-tegra-blue-dark">
                    {result.label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone.wrap}`}
                  >
                    {result.typeLabel}
                  </span>
                </span>
                <span className="mt-1 block text-xs sm:text-sm text-tegra-text-secondary">
                  Onde fica: {result.where}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
