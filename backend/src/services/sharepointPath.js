/**
 * Confina itens do Graph à pasta-raiz da Central Comercial.
 * Não aceita webUrl/downloadUrl do cliente — só IDs já validados no servidor.
 */

export function normalizeFolderPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function buildRootPathPrefix(root, configuredRootPath) {
  const parentPath = String(root?.parentReference?.path || "").replace(
    /\/$/,
    "",
  );
  const name = String(root?.name || "").trim();
  if (parentPath && name) {
    return `${parentPath}/${name}`;
  }
  const configured = normalizeFolderPath(configuredRootPath);
  if (configured) {
    return configured;
  }
  return "";
}

export function isItemUnderRoot(item, root, configuredRootPath = "") {
  if (!item?.id || !root?.id) return false;

  const rootDriveId = root.parentReference?.driveId || root.driveId || null;
  const itemDriveId = item.parentReference?.driveId || item.driveId || null;
  if (rootDriveId && itemDriveId && rootDriveId !== itemDriveId) {
    return false;
  }

  if (item.id === root.id) return true;
  if (item.parentReference?.id === root.id) return true;

  const itemPath = String(item.parentReference?.path || "");
  if (!itemPath) return false;

  const prefix = buildRootPathPrefix(root, configuredRootPath);
  if (prefix && (itemPath === prefix || itemPath.startsWith(`${prefix}/`))) {
    return true;
  }

  const configured = normalizeFolderPath(configuredRootPath);
  if (configured && itemPath.includes(`/${configured}`)) {
    return true;
  }

  return false;
}
