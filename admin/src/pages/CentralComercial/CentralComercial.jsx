import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  MdArrowBack,
  MdClose,
  MdHome,
  MdInfoOutline,
  MdLogin,
  MdSearch,
} from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  browseCentral,
  downloadCentralItem,
  getCentralStatus,
  searchCentral,
} from "../../services/centralComercial";
import { decorateItem, formatBytes, formatModified } from "./catalogHelpers";
import ResourceItem from "./ResourceItem";
import FileViewer from "./FileViewer";
import { acquireGraphAccessToken, clearCachedGraphToken } from "../../auth/graphToken";
import "./CentralComercial.css";

gsap.registerPlugin(useGSAP);

const HEX_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='74' viewBox='0 0 64 74'%3E%3Cpath d='M32 0 L64 18.5 L64 55.5 L32 74 L0 55.5 L0 18.5 Z' fill='none' stroke='%2325b3b8' stroke-opacity='0.22' stroke-width='1.5'/%3E%3C/svg%3E")`;
const HEADER_NAVY = "#244586";
const HEADER_NAVY_DEEP = "#1b3668";
const HEADER_TEAL = "#25b3b8";
const KIND_OPTIONS = [
  { value: "all", label: "Tudo" },
  { value: "folders", label: "Pastas" },
  { value: "files", label: "Arquivos" },
];

function apiErrorMessage(error, fallback) {
  return error.response?.data?.error || error.message || fallback;
}

function apiErrorCode(error) {
  return error.response?.data?.code || "";
}

function isDelegatedAuthError(error) {
  const code = apiErrorCode(error);
  return (
    code.startsWith("GRAPH_") ||
    error.response?.status === 401
  );
}

function persistHint(dynamo) {
  if (!dynamo) return null;
  if (dynamo.locationSaved) {
    return {
      tone: "ok",
      text: `IDs da pasta gravados no DynamoDB (${dynamo.table}).`,
    };
  }
  if (dynamo.lastError?.missingTable) {
    return {
      tone: "warn",
      text: `Tabela ${dynamo.table} ainda não existe. A pasta abre, mas o ID some no restart.`,
    };
  }
  if (dynamo.lastError) {
    return {
      tone: "warn",
      text: `Dynamo não gravou: ${dynamo.lastError.message}. Confira os logs [CENTRAL][DYNAMO].`,
    };
  }
  if (dynamo.locationInMemory) {
    return {
      tone: "warn",
      text: "Pasta resolvida só em memória. Ainda não confirmamos gravação no Dynamo.",
    };
  }
  return null;
}

export default function CentralComercial() {
  const reduceMotion = useReducedMotion();
  const pageRef = useRef(null);
  const hexRef = useRef(null);
  const folderRef = useRef(null);

  const [stack, setStack] = useState([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [folderItems, setFolderItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearchingLive] = useState(false);
  const [error, setError] = useState("");
  const [needsMicrosoft, setNeedsMicrosoft] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [dynamo, setDynamo] = useState(null);

  const current = stack[stack.length - 1] || null;
  const isSearch = query.trim().length >= 2;
  const hint = persistHint(dynamo);

  const viewKey = isSearch
    ? `search:${query}:${current?.id || "root"}`
    : `page:${current?.id || "root"}:${kind}`;

  const visibleItems = useMemo(() => {
    if (kind === "folders") return folderItems.filter((item) => item.isFolder);
    if (kind === "files") return folderItems.filter((item) => !item.isFolder);
    return folderItems;
  }, [folderItems, kind]);

  const loadRootStatus = useCallback(async () => {
    try {
      const status = await getCentralStatus();
      setDynamo(status.dynamo || null);
    } catch {
      setDynamo(null);
    }
  }, []);

  const loadFolder = useCallback(async (folderId, cancelled) => {
    setLoading(true);
    setError("");
    try {
      const payload = await browseCentral(folderId || undefined);
      if (cancelled?.()) return;
      setNeedsMicrosoft(false);
      setFolderItems((payload.items || []).map(decorateItem));
      loadRootStatus();
    } catch (err) {
      if (cancelled?.()) return;
      setError(apiErrorMessage(err, "Não foi possível abrir esta pasta."));
      setNeedsMicrosoft(isDelegatedAuthError(err));
      setFolderItems([]);
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, [loadRootStatus]);

  useEffect(() => {
    loadRootStatus();
  }, [loadRootStatus]);

  useEffect(() => {
    let cancelled = false;
    loadFolder(current?.id, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [current?.id, loadFolder]);

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
        const payload = await searchCentral(q, current?.id);
        setSearchResults((payload.items || []).map(decorateItem));
        setError("");
      } catch (err) {
        setError(apiErrorMessage(err, "A busca não pôde ser concluída."));
        setNeedsMicrosoft(isDelegatedAuthError(err));
        setSearchResults([]);
      } finally {
        setSearchingLive(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, current?.id]);

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
          duration: 0.45,
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
    const folderId = item?.id;
    if (!folderId || String(folderId).length < 8) {
      setError("Esta pasta ainda não tem um identificador válido do SharePoint.");
      return;
    }
    setStack((prev) => [...prev, { id: folderId, name: item.name }]);
    setQuery("");
    scrollTop();
  }

  function openItem(item) {
    if (item.isFolder) openFolder(item);
    else setViewer(item);
  }

  async function connectMicrosoft() {
    setConnecting(true);
    setError("");
    try {
      clearCachedGraphToken();
      const token = await acquireGraphAccessToken({ interactive: true });
      if (!token) {
        setNeedsMicrosoft(true);
        setError("A Microsoft não retornou permissão para o SharePoint.");
        return;
      }
      setNeedsMicrosoft(false);
      await loadFolder(current?.id);
    } catch (err) {
      setNeedsMicrosoft(true);
      setError(
        err?.message ||
          "Não foi possível conectar a conta Microsoft. Aceite Sites.Read.All e tente de novo.",
      );
    } finally {
      setConnecting(false);
    }
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
    setKind("all");
    scrollTop();
  }

  const currentName = current?.name || "Documentos Compartilhados";
  const subtitle = stack.length
    ? stack.map((crumb) => crumb.name).join(" / ")
    : "Documentos Compartilhados";
  const listingItems = isSearch ? searchResults : visibleItems;
  const listingLoading = isSearch ? searching : loading;

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
                value={kind}
                onChange={(event) => setKind(event.target.value || "all")}
                options={KIND_OPTIONS}
                placeholder="Filtrar"
                variant="onDark"
                inputId="central-tipo"
                aria-label="Filtrar pastas ou arquivos"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nesta pasta…"
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

        {hint?.tone === "warn" ? (
          <p className="mb-4 flex gap-2 text-xs sm:text-sm leading-relaxed text-[#8a4a4d]">
            <MdInfoOutline className="mt-0.5 shrink-0 text-base" aria-hidden />
            <span>{hint.text}</span>
          </p>
        ) : null}

        <div ref={folderRef} className="min-h-[12rem]">
          {error && !listingLoading ? (
            <ErrorCard
              message={error}
              needsMicrosoft={needsMicrosoft}
              connecting={connecting}
              onConnect={connectMicrosoft}
              onRetry={() => {
                loadRootStatus();
                loadFolder(current?.id);
              }}
            />
          ) : null}

          {!needsMicrosoft ? (
            <ExplorerView
              items={listingItems}
              loading={listingLoading}
              kind={isSearch ? "all" : kind}
              stack={stack}
              currentName={currentName}
              isSearch={isSearch}
              query={query.trim()}
              onOpen={openItem}
              onDownload={handleDownload}
              onHome={goHome}
              onBack={goBack}
              onCrumb={(index) => setStack(stack.slice(0, index + 1))}
            />
          ) : null}
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

function ErrorCard({ message, onRetry, needsMicrosoft, connecting, onConnect }) {
  return (
    <div className="mb-5 rounded-2xl border border-[#E5989B]/40 bg-white p-4 sm:p-5 shadow-sm">
      <p className="text-sm sm:text-base text-tegra-blue-dark">{message}</p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        {needsMicrosoft && onConnect ? (
          <Button
            type="button"
            variant="microsoft"
            onClick={onConnect}
            disabled={connecting}
            loading={connecting}
            className="inline-flex items-center justify-center gap-2"
          >
            <MdLogin aria-hidden />
            {connecting ? "Conectando…" : "Conectar Microsoft"}
          </Button>
        ) : null}
        {onRetry ? (
          <Button
            type="button"
            variant={needsMicrosoft ? "secondary" : undefined}
            onClick={onRetry}
            disabled={connecting}
          >
            Tentar de novo
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function emptyCopy({ kind, stack, isSearch, query }) {
  if (isSearch) {
    return {
      title: "Nada encontrado",
      detail: query
        ? `Nenhum item corresponde a “${query}” nesta pasta.`
        : "Tente outra palavra ou abra a pasta certa antes de buscar.",
    };
  }
  if (kind === "folders") {
    return {
      title: "Nenhuma pasta aqui",
      detail: stack.length
        ? "Esta pasta só tem arquivos. Mostre Tudo para vê-los."
        : "A biblioteca ainda não tem pastas neste nível.",
    };
  }
  if (kind === "files") {
    return {
      title: "Nenhum arquivo aqui",
      detail: stack.length
        ? "Esta pasta só tem subpastas. Abra uma pasta ou mostre Tudo."
        : "Não há arquivos soltos na raiz. Abra uma pasta da biblioteca.",
    };
  }
  if (stack.length) {
    return {
      title: "Pasta vazia",
      detail: "Não há subpastas nem documentos neste nível.",
    };
  }
  return {
    title: "Nenhum item na biblioteca",
    detail:
      "Se o SharePoint tem pastas aqui, reconecte a Microsoft e atualize a página.",
  };
}

function ExplorerView({
  items,
  loading,
  kind,
  stack = [],
  currentName,
  isSearch = false,
  query = "",
  onOpen,
  onDownload,
  onHome,
  onBack,
  onCrumb,
}) {
  const folders = items.filter((item) => item.isFolder).length;
  const files = items.length - folders;
  const empty = emptyCopy({ kind, stack, isSearch, query });

  return (
    <section className="central-explorer rounded-xl">
      <div className="central-explorer-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!stack.length}
            className="central-explorer-nav"
          >
            <MdArrowBack aria-hidden />
            Voltar
          </button>
          <button type="button" onClick={onHome} className="central-explorer-nav">
            <MdHome aria-hidden />
            Início
          </button>
        </div>
        <nav aria-label="Caminho da pasta" className="central-explorer-path">
          <button type="button" onClick={onHome}>
            Documentos Compartilhados
          </button>
          {stack.map((crumb, index) => (
            <span key={crumb.id} className="inline-flex items-center gap-1.5 min-w-0">
              <span aria-hidden>›</span>
              {index === stack.length - 1 ? (
                <span className="font-semibold text-tegra-blue-dark truncate">
                  {currentName || crumb.name}
                </span>
              ) : (
                <button type="button" onClick={() => onCrumb(index)} className="truncate">
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </nav>
        {!loading && items.length > 0 ? (
          <p className="central-explorer-count">
            {isSearch
              ? `${items.length} ${items.length === 1 ? "resultado" : "resultados"}`
              : `${folders} ${folders === 1 ? "pasta" : "pastas"} · ${files} ${files === 1 ? "arquivo" : "arquivos"}`}
          </p>
        ) : null}
      </div>
      <div className="central-explorer-head hidden sm:grid" aria-hidden>
        <span>Nome</span>
        <span>Modificado</span>
        <span>{isSearch ? "Tipo" : "Tamanho"}</span>
        <span />
      </div>
      {loading ? (
        <div className="p-3">
          <LoadingList />
        </div>
      ) : items.length === 0 ? (
        <div className="central-explorer-empty">
          <p className="text-base font-semibold text-tegra-blue-dark">
            {empty.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5b6b80]">
            {empty.detail}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <ResourceItem
              key={item.id}
              layout="explorer"
              icon={item.isFolder ? "folder" : item.icon}
              toneKey={item.isFolder ? "folder" : item.icon}
              title={item.name}
              description={item.desc}
              modified={formatModified(item.modifiedAt)}
              sizeLabel={
                item.isFolder
                  ? item.desc || "Pasta"
                  : formatBytes(item.size) || "—"
              }
              isFolder={item.isFolder}
              onOpen={() => onOpen(item)}
              onDownload={() => onDownload(item)}
              delay={Math.min(index * 0.02, 0.12)}
            />
          ))}
        </div>
      )}
      {!loading && items.length > 0 ? (
        <p className="central-explorer-foot">
          {isSearch
            ? `Busca em ${currentName}`
            : `Contagem ${items.length}${
                kind === "all"
                  ? ` · ${folders} ${folders === 1 ? "pasta" : "pastas"} · ${files} ${
                      files === 1 ? "arquivo" : "arquivos"
                    }`
                  : ""
              }`}
        </p>
      ) : null}
    </section>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[3.35rem] rounded-lg bg-white shadow-sm central-file-pulse"
        />
      ))}
    </div>
  );
}
