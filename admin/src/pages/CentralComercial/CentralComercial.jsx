import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  browseCentral,
  downloadCentralItem,
  searchCentral,
} from "../../services/centralComercial";
import {
  buildHomeSections,
  categoryOptionsFromRoot,
  decorateItem,
  FALLBACK_CATEGORY_OPTIONS,
} from "./catalogHelpers";
import { getCatalogIcon, getIconTone } from "./iconMap";
import ResourceItem from "./ResourceItem";
import FileViewer from "./FileViewer";
import "./CentralComercial.css";

gsap.registerPlugin(useGSAP);

const HEX_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='74' viewBox='0 0 64 74'%3E%3Cpath d='M32 0 L64 18.5 L64 55.5 L32 74 L0 55.5 L0 18.5 Z' fill='none' stroke='%2325b3b8' stroke-opacity='0.22' stroke-width='1.5'/%3E%3C/svg%3E")`;
const HEADER_NAVY = "#244586";
const HEADER_NAVY_DEEP = "#1b3668";
const HEADER_TEAL = "#25b3b8";

function apiErrorMessage(error, fallback) {
  return (
    error.response?.data?.error ||
    error.message ||
    fallback
  );
}

export default function CentralComercial() {
  const reduceMotion = useReducedMotion();
  const pageRef = useRef(null);
  const hexRef = useRef(null);
  const folderRef = useRef(null);

  const [stack, setStack] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [rootItems, setRootItems] = useState([]);
  const [folderItems, setFolderItems] = useState([]);
  const [folderMeta, setFolderMeta] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearchingLive] = useState(false);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState(null);

  const current = stack[stack.length - 1] || null;
  const isSearch = query.trim().length >= 2;
  const homeSections = useMemo(
    () => buildHomeSections(rootItems),
    [rootItems],
  );
  const categoryOptions = useMemo(() => {
    const live = categoryOptionsFromRoot(rootItems);
    return live.length > 1 ? live : FALLBACK_CATEGORY_OPTIONS;
  }, [rootItems]);

  const viewKey = isSearch
    ? `search:${query}`
    : current
      ? `page:${current.id}`
      : "home";

  const loadRoot = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await browseCentral();
      setRootItems((payload.items || []).map(decorateItem));
      setFolderMeta(payload.folder || null);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Não foi possível abrir a Central Comercial agora.",
        ),
      );
      setRootItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  useEffect(() => {
    if (!current) {
      setFolderItems([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    browseCentral(current.id)
      .then((payload) => {
        if (cancelled) return;
        setFolderMeta(payload.folder || current);
        setFolderItems((payload.items || []).map(decorateItem));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          apiErrorMessage(err, "Não foi possível abrir esta pasta."),
        );
        setFolderItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchingLive(false);
      return undefined;
    }
    const handle = window.setTimeout(async () => {
      setSearchingLive(true);
      try {
        const payload = await searchCentral(q);
        let items = (payload.items || []).map(decorateItem);
        if (category !== "all") {
          const selected = rootItems.find((item) => item.id === category);
          if (selected) {
            const needle = selected.name.toLowerCase();
            items = items.filter((item) =>
              String(item.name || "")
                .toLowerCase()
                .includes(needle.slice(0, 12)),
            );
          }
        }
        setSearchResults(items);
        setError("");
      } catch (err) {
        setError(apiErrorMessage(err, "A busca não pôde ser concluída."));
        setSearchResults([]);
      } finally {
        setSearchingLive(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, category, rootItems]);

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

  function openFolder(item) {
    setStack((prev) => [...prev, { id: item.id, name: item.name }]);
    setQuery("");
    scrollTop();
  }

  function openItem(item) {
    if (item.isFolder) openFolder(item);
    else setViewer(item);
  }

  async function handleDownload(item) {
    try {
      await downloadCentralItem(item);
    } catch (err) {
      setError(apiErrorMessage(err, "Não foi possível baixar o arquivo."));
    }
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

  function handleCategoryChange(event) {
    const next = event.target.value || "all";
    setCategory(next);
    if (query.trim().length >= 2) return;
    if (next === "all") {
      setStack([]);
    } else {
      const folder = rootItems.find((item) => item.id === next);
      if (folder) setStack([{ id: folder.id, name: folder.name }]);
    }
    scrollTop();
  }

  useEffect(() => {
    if (query.trim().length >= 2) return;
    setCategory(stack[0]?.id || "all");
  }, [stack, query]);

  const subtitle = current
    ? current.name
    : "Materiais e recursos técnicos";

  return (
    <MainLayout>
      <div
        ref={pageRef}
        className="central-comercial-page max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10"
      >
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
                options={categoryOptions}
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

        {current && !isSearch ? (
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
              {stack.map((crumb, index) => (
                <span key={crumb.id} className="inline-flex items-center gap-1.5">
                  <span className="text-slate-300" aria-hidden>
                    ›
                  </span>
                  {index === stack.length - 1 ? (
                    <span className="font-semibold text-tegra-blue-dark">
                      {crumb.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStack(stack.slice(0, index + 1))}
                      className="text-[#3da2b8] underline-offset-2 hover:underline"
                    >
                      {crumb.name}
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
              {error && !loading ? (
                <ErrorCard message={error} onRetry={current ? undefined : loadRoot} />
              ) : null}

              {isSearch ? (
                <SearchView
                  results={searchResults}
                  loading={searching}
                  onOpen={openItem}
                />
              ) : current ? (
                <FolderView
                  title={folderMeta?.name || current.name}
                  items={folderItems}
                  loading={loading}
                  onOpen={openItem}
                  onDownload={handleDownload}
                />
              ) : (
                <HomeView
                  sections={homeSections}
                  loading={loading}
                  onOpen={openItem}
                  onDownload={handleDownload}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {viewer ? (
          <FileViewer item={viewer} onClose={() => setViewer(null)} />
        ) : null}
      </AnimatePresence>
    </MainLayout>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="mb-5 rounded-2xl border border-[#E5989B]/40 bg-white p-4 sm:p-5 shadow-sm">
      <p className="text-sm sm:text-base text-tegra-blue-dark">{message}</p>
      {onRetry ? (
        <Button type="button" className="mt-3" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

function HomeView({ sections, loading, onOpen, onDownload }) {
  return (
    <div className="space-y-7">
      <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
          Como usar
        </h2>
        <p className="flex gap-3 text-sm sm:text-base text-tegra-text-secondary leading-relaxed">
          <MdInfoOutline
            className="mt-0.5 shrink-0 text-lg text-tegra-blue-dark"
            aria-hidden
          />
          <span>
            Navegue pelas pastas da Central. Arquivos abrem e baixam aqui no
            portal — sem sair para o SharePoint.
          </span>
        </p>
      </div>

      {loading && sections.length === 0 ? <LoadingGrid /> : null}

      {!loading && sections.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-base font-semibold text-tegra-blue-dark">
            Nenhum material disponível
          </p>
          <p className="mt-2 text-sm text-tegra-text-secondary">
            A pasta da Central está vazia ou ainda não foi conectada.
          </p>
        </div>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.label}
          className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6"
        >
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
                key={item.id}
                layout={section.asGrid ? "grid" : "row"}
                icon={item.icon}
                toneKey={item.icon}
                title={item.name}
                description={item.desc}
                isFolder={item.isFolder}
                onOpen={() => onOpen(item)}
                onDownload={() => onDownload(item)}
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

function FolderView({ title, items, loading, onOpen, onDownload }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-tegra-blue-dark">
          {title}
        </h2>
        <p className="mt-1 text-sm sm:text-base text-tegra-text-secondary">
          Abra uma pasta ou visualize o arquivo no portal.
        </p>
      </div>

      <section className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
        {loading ? (
          <LoadingList />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-tegra-text-secondary">
            Esta pasta está vazia.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <ResourceItem
                key={item.id}
                icon={item.isFolder ? "folder" : item.icon}
                toneKey={item.icon}
                title={item.name}
                description={item.desc}
                isFolder={item.isFolder}
                onOpen={() => onOpen(item)}
                onDownload={() => onDownload(item)}
                delay={Math.min(index * 0.035, 0.18)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SearchView({ results, loading, onOpen }) {
  if (loading) {
    return (
      <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
        <LoadingList />
      </div>
    );
  }

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
        {results.map((item, index) => {
          const Icon = getCatalogIcon(item.icon);
          const tone = getIconTone(item.icon);
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
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
                <span className="font-semibold text-tegra-blue-dark">
                  {item.name}
                </span>
                <span className="mt-1 block text-xs sm:text-sm text-tegra-text-secondary">
                  {item.desc || (item.isFolder ? "Pasta" : "Arquivo")}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[5.5rem] rounded-xl bg-white shadow-sm central-file-pulse"
        />
      ))}
    </div>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[4.25rem] rounded-xl bg-white shadow-sm central-file-pulse"
        />
      ))}
    </div>
  );
}
