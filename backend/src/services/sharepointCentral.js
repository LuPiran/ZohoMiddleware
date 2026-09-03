import axios from "axios";
import { ENV } from "../config/env.js";
import { getGraphAccessToken, getGraphSubject, isGraphFilesConfigured } from "./graphAuth.js";
import { isItemUnderRoot, normalizeFolderPath } from "./sharepointPath.js";
import { getStoredLocation, saveLocation } from "./centralCatalogStore.js";
import { logGraphFailure, logGraphInfo, logSharePoint } from "../utils/graphLog.js";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SELECT =
  "id,name,size,file,folder,lastModifiedDateTime,parentReference,createdDateTime";

const OFFICE_EXT = new Set([
  "csv",
  "doc",
  "docx",
  "odp",
  "ods",
  "odt",
  "pot",
  "potm",
  "potx",
  "pps",
  "ppsx",
  "ppt",
  "pptx",
  "rtf",
  "xls",
  "xlsx",
]);

let rootCache = {
  siteId: null,
  driveId: null,
  root: null,
  expiresAt: 0,
};

const listCache = new Map();
const LIST_TTL_MS = 45_000;

function previewMaxBytes() {
  const raw = Number(ENV.GRAPH_PREVIEW_MAX_BYTES || 80 * 1024 * 1024);
  return Number.isFinite(raw) && raw > 0 ? raw : 80 * 1024 * 1024;
}

export function isSharePointConfigured() {
  return isGraphFilesConfigured();
}

function graphError(error, fallback, extra = {}) {
  const status = error.response?.status;
  const graphCode = error.response?.data?.error?.code;
  const message =
    error.response?.data?.error?.message || error.message || fallback;

  const isOwn =
    typeof error.code === "string" &&
    (error.code.startsWith("GRAPH_") || error.code.startsWith("SHAREPOINT_"));
  if (isOwn && error.status) {
    throw error;
  }

  logGraphFailure(fallback, error, extra);

  if (status === 401) {
    const err = new Error(
      "Sessão Microsoft expirada ou inválida para o SharePoint. Conecte a conta novamente.",
    );
    err.status = 401;
    err.code = "GRAPH_TOKEN_EXPIRED";
    err.graphCode = graphCode || undefined;
    throw err;
  }

  if (status === 403 || status === 404) {
    const err = new Error(
      status === 403
        ? `SharePoint recusou o acesso (403 ${graphCode || "accessDenied"}). Sua conta precisa ter permissão na pasta da Central.`
        : "Material não encontrado ou sem permissão.",
    );
    err.status = status === 403 ? 403 : 404;
    err.code = status === 403 ? "SHAREPOINT_FORBIDDEN" : "SHAREPOINT_NOT_FOUND";
    err.graphCode = graphCode || undefined;
    throw err;
  }

  const err = new Error(fallback);
  err.status = 502;
  err.code = "SHAREPOINT_ERROR";
  throw err;
}

async function graphRequest(method, url, { params, data, responseType, timeout } = {}) {
  const token = await getGraphAccessToken();
  const fullUrl = url.startsWith("http") ? url : `${GRAPH}${url}`;
  const started = Date.now();
  const path = String(url).replace(GRAPH, "");
  logGraphInfo("request", { method, path: path.slice(0, 180) });
  try {
    const response = await axios({
      method,
      url: fullUrl,
      params,
      data,
      responseType: responseType || "json",
      timeout: timeout || 30000,
      headers: { Authorization: `Bearer ${token}` },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    logGraphInfo("ok", {
      method,
      path: path.slice(0, 180),
      ms: Date.now() - started,
      http: response.status,
      requestId: response.headers?.["request-id"] || null,
    });
    return response;
  } catch (error) {
    graphError(error, "Falha ao consultar o SharePoint.", {
      method,
      path: path.slice(0, 180),
      ms: Date.now() - started,
    });
  }
}

function sharePointDefaults() {
  return {
    hostname:
      ENV.GRAPH_SHAREPOINT_HOSTNAME || "onixcann.sharepoint.com",
    sitePath:
      ENV.GRAPH_SHAREPOINT_SITE_PATH ||
      "sites/EstruturadePastas-TegraPharma",
    driveName:
      ENV.GRAPH_SHAREPOINT_DRIVE_NAME || "Documentos Compartilhados",
    rootPath: "",
    siteId:
      ENV.GRAPH_SHAREPOINT_SITE_ID || ENV.SHAREPOINT_SITE_ID || "",
    driveId:
      ENV.GRAPH_SHAREPOINT_DRIVE_ID || ENV.SHAREPOINT_DRIVE_ID || "",
    rootItemId:
      ENV.GRAPH_SHAREPOINT_ROOT_ITEM_ID ||
      ENV.SHAREPOINT_ROOT_ITEM_ID ||
      "",
  };
}

async function resolveSiteId(defaults) {
  if (defaults.siteId) return defaults.siteId;
  const sitePath = defaults.sitePath.replace(/^\/+|\/+$/g, "");
  const encoded = encodeURIComponent(sitePath).replace(/%2F/gi, "/");
  const response = await graphRequest(
    "GET",
    `/sites/${defaults.hostname}:/${encoded}`,
    { params: { $select: "id,name,webUrl" } },
  );
  return response.data?.id;
}

function foldName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isDefaultDocumentLibraryName(name) {
  const folded = foldName(name);
  return (
    folded === "documentos compartilhados" ||
    folded === "shared documents" ||
    folded === "documents" ||
    folded === "documentos" ||
    folded.includes("documentos compartilhado") ||
    folded.includes("shared document")
  );
}

function isSecondaryLibraryName(name) {
  return /style|estilo|asset|form template|site pages|paginas do site/i.test(
    String(name || ""),
  );
}

function siteDriveChildrenUrl(defaults) {
  const sitePath = String(defaults.sitePath || "")
    .replace(/^\/+|\/+$/g, "");
  const encoded = encodeURIComponent(sitePath).replace(/%2F/gi, "/");
  return `/sites/${defaults.hostname}:/${encoded}:/drive/root/children`;
}

async function resolveDriveId(siteId, defaults) {
  if (defaults.driveId) return defaults.driveId;

  try {
    const def = await graphRequest("GET", `/sites/${siteId}/drive`, {
      params: { $select: "id,name,driveType" },
    });
    if (def.data?.id) {
      logSharePoint("biblioteca padrão do site", {
        nome: def.data.name,
        id: String(def.data.id).slice(0, 20),
      });
      return def.data.id;
    }
  } catch (error) {
    logSharePoint("biblioteca padrão indisponível, listando drives", {
      ok: false,
      message: error.message,
    });
  }

  const response = await graphRequest("GET", `/sites/${siteId}/drives`, {
    params: { $select: "id,name,driveType" },
  });
  const drives = Array.isArray(response.data?.value) ? response.data.value : [];
  const wanted = foldName(defaults.driveName);
  const match =
    drives.find((drive) => foldName(drive.name) === wanted) ||
    drives.find((drive) => isDefaultDocumentLibraryName(drive.name)) ||
    drives.find(
      (drive) =>
        drive.driveType === "documentLibrary" &&
        !isSecondaryLibraryName(drive.name),
    ) ||
    drives.find((drive) => drive.driveType === "documentLibrary");

  logSharePoint("drives do site", {
    nomes: drives.map((drive) => `${drive.name}:${drive.driveType}`),
    escolhida: match?.name || null,
  });
  return match?.id || null;
}

async function resolveRootItem(driveId, defaults) {
  if (defaults.rootItemId) {
    const response = await graphRequest(
      "GET",
      `/drives/${driveId}/items/${defaults.rootItemId}`,
      { params: { $select: SELECT } },
    );
    return response.data;
  }

  const rootPath = defaults.rootPath;
  if (!rootPath) {
    const response = await graphRequest("GET", `/drives/${driveId}/root`, {
      params: { $select: SELECT },
    });
    return response.data;
  }

  const encodedPath = rootPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const response = await graphRequest(
    "GET",
    `/drives/${driveId}/root:/${encodedPath}`,
    { params: { $select: SELECT } },
  );
  return response.data;
}

export async function getSharePointRoot({ force = false } = {}) {
  if (!force && rootCache.root && rootCache.expiresAt > Date.now()) {
    return rootCache;
  }

  const defaults = sharePointDefaults();
  const stored = force ? null : await getStoredLocation();
  const libraryRoot = !defaults.rootPath;
  const siteIdHint = stored?.siteId || defaults.siteId;
  const driveIdHint =
    defaults.driveId || (!libraryRoot ? stored?.driveId : "") || "";
  const rootItemHint =
    defaults.rootItemId || (!libraryRoot ? stored?.rootFolderId : "") || "";

  let siteId = siteIdHint;
  let driveId = driveIdHint;
  let root;

  if (driveIdHint && rootItemHint) {
    root = await resolveRootItem(driveIdHint, {
      ...defaults,
      rootItemId: rootItemHint,
    });
    siteId = siteIdHint || stored?.siteId || "";
    driveId = driveIdHint;
  } else {
    siteId = await resolveSiteId({ ...defaults, siteId: siteIdHint });
    if (!siteId) {
      const err = new Error("Site do SharePoint não encontrado.");
      err.status = 503;
      err.code = "SHAREPOINT_SITE_MISSING";
      throw err;
    }
    driveId = await resolveDriveId(siteId, { ...defaults, driveId: driveIdHint });
    if (!driveId) {
      const err = new Error("Biblioteca de documentos do SharePoint não encontrada.");
      err.status = 503;
      err.code = "SHAREPOINT_DRIVE_MISSING";
      throw err;
    }
    root = await resolveRootItem(driveId, defaults);
  }

  if (!root?.id) {
    const err = new Error("Pasta raiz da Central Comercial não encontrada.");
    err.status = 503;
    err.code = "SHAREPOINT_ROOT_MISSING";
    throw err;
  }

  if (!stored || stored.rootFolderId !== root.id) {
    logSharePoint("persistindo LOCATION no Dynamo", {
      motivo: stored ? "root mudou" : "primeira resolução",
      rootId: String(root.id).slice(0, 16),
    });
    await saveLocation({
      siteId: siteId || stored?.siteId || "",
      driveId,
      rootFolderId: root.id,
    });
  } else {
    logSharePoint("LOCATION já conhecida", {
      rootId: String(root.id).slice(0, 16),
      origem: "dynamo-ou-memoria",
    });
  }

  logSharePoint("raiz resolvida", {
    siteId: (siteId || stored?.siteId || "").slice(0, 24),
    driveId: String(driveId).slice(0, 20),
    rootId: String(root.id).slice(0, 16),
    rootName: root.name,
    childCount: root.folder?.childCount ?? null,
    via: libraryRoot ? "biblioteca" : "subpasta",
  });

  rootCache = {
    siteId: siteId || stored?.siteId || "",
    driveId,
    root,
    configuredRootPath: defaults.rootPath,
    hostname: defaults.hostname,
    sitePath: defaults.sitePath,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  return rootCache;
}

function extensionOf(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function classifyPreview(item) {
  if (item?.folder) return "folder";
  const mime = String(item?.file?.mimeType || "").toLowerCase();
  const ext = extensionOf(item?.name);
  const size = Number(item?.size || 0);

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a"].includes(ext)) {
    return "audio";
  }
  if (OFFICE_EXT.has(ext)) return "office";
  if (mime.startsWith("text/") || ["txt", "md", "csv"].includes(ext)) {
    return size <= 1_000_000 ? "text" : "download";
  }
  return "download";
}

export function publicItem(item) {
  const isFolder = Boolean(item?.folder) || (!item?.file && Boolean(item?.id));
  const preview = classifyPreview(item);
  const size = Number(item?.size || 0);
  return {
    id: item.id,
    name: item.name || "",
    isFolder,
    mimeType: item.file?.mimeType || null,
    size,
    childCount: item.folder?.childCount ?? null,
    modifiedAt: item.lastModifiedDateTime || null,
    preview,
    previewable:
      !isFolder &&
      ["image", "pdf", "video", "audio", "office", "text"].includes(preview) &&
      size <= previewMaxBytes(),
  };
}

function notFound() {
  const err = new Error("Material não encontrado ou sem permissão.");
  err.status = 404;
  err.code = "SHAREPOINT_NOT_FOUND";
  throw err;
}

function withRootContext(resolved, item) {
  return {
    item,
    driveId: resolved.driveId,
    root: resolved.root,
    configuredRootPath: resolved.configuredRootPath,
    hostname: resolved.hostname,
    sitePath: resolved.sitePath,
    siteId: resolved.siteId,
  };
}

async function loadAllowedItem(itemId) {
  const resolved = await getSharePointRoot();
  const { driveId, root, configuredRootPath } = resolved;
  if (itemId === root.id) return withRootContext(resolved, root);

  const response = await graphRequest(
    "GET",
    `/drives/${driveId}/items/${encodeURIComponent(itemId)}`,
  );
  const item = response.data;
  if (!isItemUnderRoot(item, root, configuredRootPath)) {
    notFound();
  }
  return withRootContext(resolved, item);
}

async function collectPages(firstUrl, params) {
  const items = [];
  let url = firstUrl;
  let query = params;
  let pages = 0;

  while (url && pages < 20) {
    const response = await graphRequest("GET", url, { params: query });
    const rows = Array.isArray(response.data?.value) ? response.data.value : [];
    items.push(...rows);
    url = response.data?.["@odata.nextLink"] || null;
    query = undefined;
    pages += 1;
    if (rows.length === 0) break;
  }

  return items;
}

async function listChildrenTrying(urls) {
  let lastError = null;
  for (const url of urls.filter(Boolean)) {
    try {
      const rows = await collectPages(url, { $top: 200 });
      logSharePoint("tentativa de lista", {
        url: String(url).slice(0, 140),
        itens: rows.length,
        nomes: rows.slice(0, 8).map((row) => row.name),
      });
      if (rows.length > 0) return rows;
    } catch (error) {
      lastError = error;
      logSharePoint("tentativa de lista falhou", {
        ok: false,
        url: String(url).slice(0, 140),
        message: error.message,
        code: error.code || null,
      });
    }
  }
  if (lastError && urls.filter(Boolean).length === 1) throw lastError;
  return [];
}

async function listViaSharePointList(siteId) {
  if (!siteId) return [];
  try {
    const response = await graphRequest("GET", `/sites/${siteId}/lists`, {
      params: { $select: "id,name,displayName,list" },
    });
    const lists = Array.isArray(response.data?.value) ? response.data.value : [];
    const library =
      lists.find((row) => isDefaultDocumentLibraryName(row.displayName || row.name)) ||
      lists.find((row) => row.list?.template === "documentLibrary" && !isSecondaryLibraryName(row.displayName || row.name));
    if (!library?.id) {
      logSharePoint("nenhuma lista de documentos", {
        listas: lists.map((row) => row.displayName || row.name),
      });
      return [];
    }

    const rows = await collectPages(`/sites/${siteId}/lists/${library.id}/items`, {
      $top: 200,
      $expand: "driveItem,fields",
    });
    const driveItems = rows
      .map((row) => row.driveItem)
      .filter(Boolean);
    const rootOnly = driveItems.filter((item) => {
      const path = String(item.parentReference?.path || "");
      return /\/root:?$/.test(path) || path.endsWith("/root:");
    });
    const picked = rootOnly.length > 0 ? rootOnly : driveItems;
    logSharePoint("lista via SharePoint list", {
      lista: library.displayName || library.name,
      brutos: rows.length,
      raiz: picked.length,
    });
    return picked;
  } catch (error) {
    logSharePoint("lista via SharePoint list falhou", {
      ok: false,
      message: error.message,
    });
    return [];
  }
}

export async function listFolder(itemId) {
  const cacheKey = `${getGraphSubject()}:${itemId || "ROOT"}`;
  const cached = listCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const ctx = itemId
    ? await loadAllowedItem(itemId)
    : await getSharePointRoot().then((resolved) => withRootContext(resolved, resolved.root));
  const { item, driveId, root, configuredRootPath, siteId } = ctx;
  const defaults = sharePointDefaults();

  if (!item.folder && itemId && item.id !== root.id) {
    return {
      folder: publicItem(item),
      items: [],
    };
  }

  const atLibraryRoot = !configuredRootPath && item.id === root.id;
  const urls = atLibraryRoot
    ? [
        siteDriveChildrenUrl({
          hostname: ctx.hostname || defaults.hostname,
          sitePath: ctx.sitePath || defaults.sitePath,
        }),
        siteId ? `/sites/${siteId}/drive/root/children` : null,
        `/drives/${driveId}/root/children`,
        `/drives/${driveId}/items/${item.id}/children`,
      ]
    : [`/drives/${driveId}/items/${item.id}/children`];

  let raw = await listChildrenTrying(urls);
  if (raw.length === 0 && atLibraryRoot) {
    raw = await listViaSharePointList(siteId);
  }

  const children = raw
    .map(publicItem)
    .sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    });

  const payload = {
    folder: publicItem({
      ...item,
      folder: item.folder || { childCount: children.length },
    }),
    items: children,
  };
  if (children.length > 0) {
    listCache.set(cacheKey, { payload, expiresAt: Date.now() + LIST_TTL_MS });
  }
  logSharePoint("pasta listada", {
    pasta: payload.folder?.name,
    id: String(payload.folder?.id || cacheKey).slice(0, 16),
    brutos: raw.length,
    itens: children.length,
    pastas: children.filter((row) => row.isFolder).length,
    arquivos: children.filter((row) => !row.isFolder).length,
    nomes: children.slice(0, 12).map((row) => row.name),
  });
  return payload;
}

export async function searchCentral(query, { folderId } = {}) {
  const q = String(query || "")
    .replace(/['"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  if (q.length < 2) {
    return { items: [] };
  }

  const { driveId, root, configuredRootPath } = await getSharePointRoot();
  let scope = root;
  if (folderId) {
    const loaded = await loadAllowedItem(folderId);
    scope = loaded.item;
  }

  const path = `/drives/${driveId}/items/${scope.id}/search(q='${q.replace(/'/g, "")}')`;
  let raw = [];
  try {
    raw = await collectPages(path, { $select: SELECT, $top: 50 });
  } catch (error) {
    logGraphFailure("busca na pasta falhou; tentando raiz do drive", error, {
      q,
      scopeId: String(scope.id).slice(0, 16),
    });
    raw = await collectPages(
      `/drives/${driveId}/root/search(q='${q.replace(/'/g, "")}')`,
      { $select: SELECT, $top: 50 },
    );
  }

  const items = raw
    .filter((item) => isItemUnderRoot(item, scope, configuredRootPath))
    .map(publicItem)
    .slice(0, 40);

  logSharePoint("busca", {
    q,
    escopo: scope.name,
    encontrados: items.length,
    brutos: raw.length,
  });
  return { items };
}

export async function getCentralItem(itemId) {
  const { item } = await loadAllowedItem(itemId);
  return publicItem(item);
}

function asciiFilename(name) {
  return String(name || "arquivo")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "")
    .slice(0, 150) || "arquivo";
}

export function contentDisposition(filename, type = "attachment") {
  const ascii = asciiFilename(filename);
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function shouldConvertToPdf(item, mode) {
  if (mode !== "preview") return false;
  return classifyPreview(item) === "office";
}

export async function streamCentralContent(itemId, res, { mode = "preview" } = {}) {
  const { item, driveId } = await loadAllowedItem(itemId);
  if (item.folder) {
    const err = new Error("Pastas não podem ser baixadas por este endpoint.");
    err.status = 400;
    throw err;
  }

  const previewKind = classifyPreview(item);
  const asPdf = shouldConvertToPdf(item, mode);
  const download = mode === "download";

  if (
    !download &&
    Number(item.size || 0) > previewMaxBytes() &&
    previewKind !== "video" &&
    previewKind !== "audio"
  ) {
    const err = new Error(
      "Arquivo grande demais para visualizar no portal. Use o download.",
    );
    err.status = 413;
    err.code = "PREVIEW_TOO_LARGE";
    throw err;
  }

  const token = await getGraphAccessToken();
  let url = `${GRAPH}/drives/${driveId}/items/${encodeURIComponent(item.id)}/content`;
  if (asPdf) url += "?format=pdf";

  logSharePoint("conteúdo", {
    modo: mode,
    nome: item.name,
    id: String(item.id).slice(0, 16),
    pdf: asPdf,
    tamanho: Number(item.size || 0),
  });

  let response;
  try {
    response = await axios.get(url, {
      responseType: "stream",
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });
  } catch (error) {
    graphError(error, "Falha ao obter o arquivo no SharePoint.", {
      modo: mode,
      itemId: String(item.id).slice(0, 16),
    });
  }

  if (response.status >= 400) {
    logSharePoint("conteúdo recusado", {
      ok: false,
      http: response.status,
      modo: mode,
      pdf: asPdf,
      nome: item.name,
      requestId: response.headers?.["request-id"] || null,
    });
    response.data?.destroy?.();
    if (asPdf) {
      const err = new Error(
        "Pré-visualização indisponível para este arquivo. Use o download.",
      );
      err.status = 415;
      err.code = "PREVIEW_UNAVAILABLE";
      throw err;
    }
    const err = new Error("Não foi possível abrir este arquivo.");
    err.status = response.status === 404 ? 404 : 502;
    throw err;
  }

  const filename = asPdf
    ? String(item.name || "arquivo").replace(/\.[^.]+$/, "") + ".pdf"
    : item.name || "arquivo";
  const contentType = asPdf
    ? "application/pdf"
    : response.headers["content-type"] ||
      item.file?.mimeType ||
      "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader(
    "Content-Disposition",
    contentDisposition(filename, download ? "attachment" : "inline"),
  );
  if (response.headers["content-length"]) {
    res.setHeader("Content-Length", response.headers["content-length"]);
  }

  response.data.on("error", (error) => {
    console.error("[SHAREPOINT] stream", error.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: "Falha ao transmitir o arquivo.",
      });
    } else {
      res.end();
    }
  });

  response.data.pipe(res);
}
