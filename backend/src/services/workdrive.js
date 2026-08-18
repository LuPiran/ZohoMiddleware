import axios from "axios";
import FormData from "form-data";
import { ENV } from "../config/env.js";
import { getWorkDriveAccessToken, isWorkDriveConfigured } from "./workdriveAuth.js";
import { leadFolderName } from "../domain/leadProtocol.js";

function apiBase() {
  return (
    String(ENV.ZOHO_WORKDRIVE_API_BASE || "")
      .replace(/\/$/, "") || "https://www.zohoapis.com/workdrive/api/v1"
  );
}

async function workdriveRequest(method, path, { data, headers, responseType, timeout } = {}) {
  const token = await getWorkDriveAccessToken();
  const url = path.startsWith("http") ? path : `${apiBase()}${path}`;
  try {
    const response = await axios({
      method,
      url,
      data,
      responseType: responseType || "json",
      timeout: timeout || 60000,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        ...headers,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return response.data;
  } catch (error) {
    console.error(
      "[WORKDRIVE]",
      method,
      path,
      error.response?.status,
      error.response?.data || error.message,
    );
    const err = new Error(
      error.response?.data?.errors?.[0]?.title ||
        error.response?.data?.message ||
        "Falha ao comunicar com o Zoho WorkDrive.",
    );
    err.status = error.response?.status === 401 ? 503 : 502;
    err.code = "WORKDRIVE_ERROR";
    throw err;
  }
}

function folderIdFromCreate(payload) {
  return (
    payload?.data?.id ||
    payload?.data?.attributes?.resource_id ||
    payload?.data?.attributes?.id ||
    null
  );
}

function fileMetaFromUpload(payload) {
  const item = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  const attrs = item?.attributes || {};
  return {
    fileId: item?.id || attrs.resource_id || attrs.FileId || null,
    url:
      attrs.Permalink ||
      attrs.permalink ||
      attrs.Download_Url ||
      attrs.download_url ||
      null,
    downloadUrl: attrs.Download_Url || attrs.download_url || null,
    name: attrs.name || attrs.File_Name || null,
  };
}

async function listChildFolders(parentId) {
  const items = [];
  let page = 1;
  while (page <= 10) {
    const payload = await workdriveRequest(
      "GET",
      `/files/${parentId}/files?page%5Blimit%5D=50&page%5Boffset%5D=${(page - 1) * 50}&filter%5Btype%5D=folder`,
    );
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    items.push(...rows);
    if (rows.length < 50) break;
    page += 1;
  }
  return items;
}

async function findFolderByName(parentId, name) {
  const children = await listChildFolders(parentId);
  const target = String(name).toLowerCase();
  const match = children.find((row) => {
    const rowName = String(row?.attributes?.name || row?.attributes?.Name || "").toLowerCase();
    return rowName === target;
  });
  return match?.id || match?.attributes?.resource_id || null;
}

export async function ensureLeadWorkDriveFolder(lead) {
  if (!isWorkDriveConfigured()) {
    const err = new Error("WorkDrive não configurado no servidor.");
    err.status = 503;
    err.code = "WORKDRIVE_NOT_CONFIGURED";
    throw err;
  }

  if (lead?.workdriveFolderId) {
    return {
      folderId: lead.workdriveFolderId,
      folderName: lead.workdriveFolderName || leadFolderName(lead.nome, lead.protocolo),
    };
  }

  const parentId = ENV.ZOHO_WORKDRIVE_FOLDER_ID;
  const folderName = leadFolderName(lead.nome, lead.protocolo);

  const existing = await findFolderByName(parentId, folderName);
  if (existing) {
    return { folderId: existing, folderName };
  }

  const created = await workdriveRequest("POST", "/files", {
    data: {
      data: {
        attributes: {
          name: folderName,
          parent_id: parentId,
        },
        type: "files",
      },
    },
    headers: { "Content-Type": "application/json" },
  });

  const folderId = folderIdFromCreate(created) || (await findFolderByName(parentId, folderName));
  if (!folderId) {
    const err = new Error("Não foi possível criar a pasta do lead no WorkDrive.");
    err.status = 502;
    err.code = "WORKDRIVE_ERROR";
    throw err;
  }

  return { folderId, folderName };
}

async function createShareLink(fileId, linkName) {
  try {
    const payload = await workdriveRequest("POST", "/links", {
      data: {
        data: {
          attributes: {
            resource_id: fileId,
            link_name: String(linkName || "evidencia").slice(0, 40),
            request_user_data: false,
            allow_download: true,
          },
          type: "links",
        },
      },
      headers: { "Content-Type": "application/json" },
    });
    const attrs = payload?.data?.attributes || {};
    return attrs.link || attrs.Link || attrs.permalink || attrs.Permalink || null;
  } catch (error) {
    console.warn("[WORKDRIVE] Link público indisponível:", error.message);
    return null;
  }
}

export async function uploadEvidenceFile({ folderId, fileName, buffer, mimeType }) {
  const form = new FormData();
  form.append("filename", fileName);
  form.append("parent_id", folderId);
  form.append("override-name-exist", "true");
  form.append("content", buffer, {
    filename: fileName,
    contentType: mimeType,
  });

  const uploaded = await workdriveRequest("POST", "/upload", {
    data: form,
    headers: form.getHeaders(),
    timeout: 120000,
  });

  const meta = fileMetaFromUpload(uploaded);
  if (!meta.fileId) {
    const err = new Error(`Falha ao enviar ${fileName} para o WorkDrive.`);
    err.status = 502;
    err.code = "WORKDRIVE_ERROR";
    throw err;
  }

  const shareUrl = await createShareLink(meta.fileId, fileName.replace(/\.[^.]+$/, ""));
  return {
    ...meta,
    url: shareUrl || meta.url,
  };
}

export async function downloadWorkDriveFile(fileId) {
  const token = await getWorkDriveAccessToken();
  const url = `${apiBase().replace(/\/api\/v1$/, "")}/download/${fileId}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      responseType: "arraybuffer",
      timeout: 60000,
    });
    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers["content-type"] || "application/octet-stream",
    };
  } catch (error) {
    const downloadBase =
      ENV.ZOHO_WORKDRIVE_DOWNLOAD_BASE || "https://download.zoho.com/v1/workdrive/download";
    const fallback = await axios.get(`${downloadBase}/${fileId}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      responseType: "arraybuffer",
      timeout: 60000,
    });
    return {
      buffer: Buffer.from(fallback.data),
      contentType: fallback.headers["content-type"] || "application/octet-stream",
    };
  }
}

export { isWorkDriveConfigured };
