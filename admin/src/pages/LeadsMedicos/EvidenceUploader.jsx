import { useEffect, useMemo, useRef, useState } from "react";
import { MdAddPhotoAlternate, MdClose, MdImage } from "react-icons/md";
import api from "../../services/api";
import { API_ENDPOINTS } from "../../utils/constants";

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function EvidenceUploader({
  files,
  onChange,
  disabled,
  error,
}) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const next = files.map((file) => ({
      key: fileKey(file),
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviews(next);
    return () => {
      next.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  const remaining = MAX_FILES - files.length;
  const helper = useMemo(() => {
    if (files.length === 0) return "Obrigatório: 1 a 5 imagens (JPG, PNG, WEBP ou GIF).";
    return `${files.length} de ${MAX_FILES} evidências selecionadas.`;
  }, [files.length]);

  const addFiles = (incoming) => {
    if (disabled) return;
    const accepted = [];
    for (const file of incoming) {
      if (!String(file.type || "").startsWith("image/")) continue;
      if (file.size > MAX_BYTES) continue;
      accepted.push(file);
    }
    if (!accepted.length) return;
    const existing = new Set(files.map(fileKey));
    const merged = [...files];
    for (const file of accepted) {
      if (merged.length >= MAX_FILES) break;
      if (existing.has(fileKey(file))) continue;
      merged.push(file);
      existing.add(fileKey(file));
    }
    onChange(merged);
  };

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-tegra-blue-dark">
          Evidências fotográficas
        </p>
        <span className="text-[11px] font-semibold tabular-nums text-tegra-text-secondary">
          {files.length}/{MAX_FILES}
        </span>
      </div>
      <p className={`mt-1 text-xs ${error ? "text-tegra-error" : "text-tegra-text-secondary"}`}>
        {error || helper}
      </p>

      <div
        className={`mt-3 rounded-xl border border-dashed px-4 py-4 transition ${
          disabled
            ? "border-tegra-gray-medium bg-tegra-gray-light/40"
            : "border-tegra-gray-medium bg-white hover:border-tegra-teal"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          addFiles([...event.dataTransfer.files]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          disabled={disabled || remaining <= 0}
          onChange={(event) => {
            addFiles([...event.target.files]);
            event.target.value = "";
          }}
        />

        {previews.length > 0 && (
          <ul className="mb-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {previews.map((item, index) => (
              <li
                key={item.key}
                className="group relative overflow-hidden rounded-lg border border-tegra-gray-medium/80 bg-tegra-gray-light"
              >
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white opacity-90 hover:bg-black"
                  aria-label={`Remover ${item.name}`}
                >
                  <MdClose />
                </button>
                <p className="truncate px-1.5 py-1 text-[10px] text-tegra-text-secondary">
                  {index + 1} · {item.name}
                </p>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={disabled || remaining <= 0}
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-tegra-gray-medium bg-tegra-bg-secondary px-3 py-2.5 text-sm font-semibold text-tegra-blue-dark hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {files.length ? (
            <>
              <MdAddPhotoAlternate className="text-lg" aria-hidden />
              Adicionar mais imagens
            </>
          ) : (
            <>
              <MdImage className="text-lg" aria-hidden />
              Selecionar ou soltar imagens
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function evidenceImageSrc(evidencia) {
  return evidencia?.previewUrl || evidencia?.url || "";
}

function isDirectImageUrl(url) {
  const value = String(url || "");
  return (
    value.includes("previewengine") ||
    value.includes("/image/WD/") ||
    /\.(jpe?g|png|gif|webp)(\?|$)/i.test(value)
  );
}

function EvidenceImage({ leadId, evidencia, className }) {
  const direct = evidenceImageSrc(evidencia);
  const [src, setSrc] = useState(isDirectImageUrl(direct) ? direct : "");
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    if (isDirectImageUrl(direct)) {
      setSrc(direct);
      return undefined;
    }

    let objectUrl = "";
    let cancelled = false;
    async function load() {
      try {
        const response = await api.get(
          API_ENDPOINTS.LEADS_MEDICOS.EVIDENCIA_ARQUIVO(leadId, evidencia.id),
          { responseType: "blob" },
        );
        objectUrl = URL.createObjectURL(response.data);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc("");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [leadId, evidencia.id, direct]);

  if (!src || errored) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1 bg-slate-50`}>
        <MdImage className="text-slate-300" style={{ fontSize: 28 }} />
        <span className="text-[9px] text-slate-400 text-center px-1 w-full truncate">
          {evidencia.fileName || "imagem"}
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={evidencia.fileName || `Evidência ${evidencia.n}`}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
    />
  );
}

export function EvidenceGallery({ evidencias = [], leadId }) {
  const items = Array.isArray(evidencias) ? evidencias : [];
  if (!items.length || !leadId) return null;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-tegra-text-secondary">
        Evidências
      </p>
      <ul className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {items.map((item) => {
          const href = evidenceImageSrc(item);
          return (
            <li key={item.id}>
              <a
                href={href || "#"}
                target={href ? "_blank" : undefined}
                rel={href ? "noreferrer" : undefined}
                className="block overflow-hidden rounded-lg border border-tegra-gray-medium/80 bg-tegra-gray-light"
                onClick={(event) => {
                  if (!href) event.preventDefault();
                }}
              >
                <EvidenceImage
                  leadId={leadId}
                  evidencia={item}
                  className="h-24 w-full object-cover"
                />
                <p className="truncate px-1.5 py-1 text-[10px] text-tegra-text-secondary">
                  {item.n ? `${item.n} · ` : ""}
                  {item.fileName || "Imagem"}
                </p>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
