import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { MdClose, MdDownload, MdInsertDriveFile } from "react-icons/md";
import Button from "../../components/ui/Button";
import { fetchCentralBlob, downloadCentralItem } from "../../services/centralComercial";
import { formatBytes } from "./catalogHelpers";

export default function FileViewer({ item, onClose }) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [objectUrl, setObjectUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [textBody, setTextBody] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || reduceMotion) return undefined;
    const tween = gsap.fromTo(
      panel,
      { clipPath: "inset(8% 6% 12% 6% round 24px)", filter: "blur(8px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        filter: "blur(0px)",
        duration: 0.55,
        ease: "power3.out",
        clearProps: "clipPath,filter",
      },
    );
    return () => tween.kill();
  }, [reduceMotion, item?.id]);

  useEffect(() => {
    if (!item?.id) return undefined;
    let cancelled = false;
    let url = "";

    async function load() {
      setStatus("loading");
      setError("");
      setTextBody("");
      try {
        if (item.preview === "download" || !item.previewable) {
          if (!cancelled) setStatus("download-only");
          return;
        }
        const payload = await fetchCentralBlob(item.id, "preview");
        if (cancelled) return;
        const type = payload.contentType || item.mimeType || "";
        setContentType(type);
        if (item.preview === "text" || type.startsWith("text/")) {
          const text = await payload.blob.text();
          if (!cancelled) {
            setTextBody(text);
            setStatus("ready");
          }
          return;
        }
        url = URL.createObjectURL(payload.blob);
        setObjectUrl(url);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const statusCode = err.response?.status;
        if (statusCode === 413 || statusCode === 415) {
          setError(
            err.response?.data?.error ||
              "Não foi possível visualizar. Use o download.",
          );
          setStatus("download-only");
          return;
        }
        setError(
          err.response?.data?.error ||
            "Não foi possível abrir este arquivo agora.",
        );
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadCentralItem(item);
    } catch {
      setError("Não foi possível baixar este arquivo.");
    } finally {
      setDownloading(false);
    }
  }

  const kind = item.preview === "office" ? "pdf" : item.preview;
  const isPdf =
    kind === "pdf" || contentType.includes("pdf") || contentType.includes("application/pdf");
  const isImage = kind === "image" || contentType.startsWith("image/");
  const isVideo = kind === "video" || contentType.startsWith("video/");
  const isAudio = kind === "audio" || contentType.startsWith("audio/");

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-[#1b3668]/72 p-3 sm:p-5"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="central-file-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f4f7fb] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 bg-[#244586] px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p
              id="central-file-title"
              className="truncate text-sm sm:text-base font-semibold text-white"
            >
              {item.name}
            </p>
            <p className="text-xs text-[#a8d4e0]">
              {[formatBytes(item.size), "Visualização no portal"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={downloading}
            onClick={handleDownload}
            className="!border-white/40 !bg-white/10 !text-white hover:!bg-white/20 inline-flex items-center gap-1.5"
          >
            <MdDownload aria-hidden />
            Baixar
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/15"
            aria-label="Fechar visualização"
          >
            <MdClose className="text-2xl" />
          </button>
        </header>

        <div className="relative min-h-[22rem] flex-1 bg-[#0f2448]/6">
          {status === "loading" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="central-file-pulse h-16 w-16 rounded-2xl bg-[#244586]/15" />
              <p className="text-sm text-tegra-text-secondary">Abrindo arquivo…</p>
            </div>
          ) : null}

          {status === "error" ? (
            <EmptyPreview
              title="Não foi possível visualizar"
              body={error}
              onDownload={handleDownload}
              downloading={downloading}
            />
          ) : null}

          {status === "download-only" ? (
            <EmptyPreview
              title="Pré-visualização indisponível"
              body={error || "Este formato abre pelo download, ainda no portal."}
              onDownload={handleDownload}
              downloading={downloading}
            />
          ) : null}

          {status === "ready" && isImage && objectUrl ? (
            <img
              src={objectUrl}
              alt={item.name}
              className="mx-auto max-h-[min(78vh,860px)] w-full object-contain p-4"
            />
          ) : null}

          {status === "ready" && isPdf && objectUrl ? (
            <iframe
              title={item.name}
              src={objectUrl}
              className="h-[min(78vh,860px)] w-full border-0 bg-white"
            />
          ) : null}

          {status === "ready" && isVideo && objectUrl ? (
            <video
              src={objectUrl}
              controls
              className="mx-auto max-h-[min(78vh,860px)] w-full p-4"
            />
          ) : null}

          {status === "ready" && isAudio && objectUrl ? (
            <div className="flex h-full min-h-[22rem] items-center justify-center px-6">
              <audio src={objectUrl} controls className="w-full max-w-xl" />
            </div>
          ) : null}

          {status === "ready" && textBody ? (
            <pre className="h-[min(78vh,860px)] overflow-auto whitespace-pre-wrap p-5 text-sm text-tegra-blue-dark">
              {textBody}
            </pre>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyPreview({ title, body, onDownload, downloading }) {
  return (
    <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#244586]/10 text-[#244586]">
        <MdInsertDriveFile className="text-2xl" aria-hidden />
      </span>
      <p className="text-base font-semibold text-tegra-blue-dark">{title}</p>
      <p className="max-w-md text-sm text-tegra-text-secondary">{body}</p>
      <Button type="button" loading={downloading} onClick={onDownload}>
        Baixar arquivo
      </Button>
    </div>
  );
}
