import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

export async function getCentralStatus() {
  const response = await api.get(API_ENDPOINTS.CENTRAL.STATUS);
  return response.data;
}

export async function getCentralCatalog() {
  const response = await api.get(API_ENDPOINTS.CENTRAL.CATALOG);
  return response.data;
}

export async function browseCentral(parentId) {
  const response = await api.get(API_ENDPOINTS.CENTRAL.BROWSE, {
    params: parentId ? { parentId } : {},
  });
  return response.data;
}

export async function searchCentral(query, folderId) {
  const response = await api.get(API_ENDPOINTS.CENTRAL.SEARCH, {
    params: {
      q: query,
      ...(folderId ? { folderId } : {}),
    },
  });
  return response.data;
}

export async function fetchCentralBlob(itemId, mode = "preview") {
  try {
    const response = await api.get(API_ENDPOINTS.CENTRAL.CONTENT(itemId, mode), {
      responseType: "blob",
    });
    return {
      blob: response.data,
      contentType: String(response.headers["content-type"] || ""),
      disposition: String(response.headers["content-disposition"] || ""),
    };
  } catch (error) {
    const data = error.response?.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text());
        error.response.data = parsed;
      } catch {
        /* mantém o blob */
      }
    }
    throw error;
  }
}

export function filenameFromDisposition(disposition, fallback) {
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(disposition || "");
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const ascii = /filename="([^"]+)"/i.exec(disposition || "");
  return ascii?.[1] || fallback || "arquivo";
}

export async function downloadCentralItem(item) {
  const { blob, disposition } = await fetchCentralBlob(item.id, "download");
  const name = filenameFromDisposition(disposition, item.name);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
