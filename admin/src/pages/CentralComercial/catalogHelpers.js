export function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function formatModified(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function iconForPreview(preview, isFolder) {
  if (isFolder) return "folder";
  if (preview === "pdf") return "pdf";
  if (preview === "image") return "image";
  if (preview === "video") return "video";
  if (preview === "office") return "slides";
  if (preview === "text") return "file";
  return "file";
}

export function decorateItem(item) {
  const icon = item.isFolder
    ? item.icon || "folder"
    : iconForPreview(item.preview, false);
  const desc = item.isFolder
    ? item.desc ||
      (item.childCount != null
        ? `${item.childCount} ${item.childCount === 1 ? "item" : "itens"}`
        : "Pasta")
    : [formatBytes(item.size), formatModified(item.modifiedAt)]
        .filter(Boolean)
        .join(" · ");

  return { ...item, icon, desc };
}

export function categoryOptionsFromCatalog(categories) {
  return [
    { value: "all", label: "Tudo" },
    ...(categories || []).map((item) => ({
      value: item.id,
      label: item.name,
    })),
  ];
}
