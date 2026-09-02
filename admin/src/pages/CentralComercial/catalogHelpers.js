import { CATALOG_META, HOME_SECTIONS, TOP_CATEGORY_IDS } from "./catalog";

export function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

export function metaForName(name) {
  const n = normalizeSearch(name);
  if (!n) return { label: name, desc: "", icon: "folder" };

  const entries = Object.values(CATALOG_META);
  const exact = entries.find((meta) => normalizeSearch(meta.label) === n);
  if (exact) return exact;

  const loose = entries.find((meta) => {
    const label = normalizeSearch(meta.label);
    if (label.length < 4 || n.length < 4) return false;
    return label.startsWith(n) || n.startsWith(label) || label.includes(n);
  });
  return loose || { label: name, desc: "", icon: "folder" };
}

export function decorateItem(item) {
  const meta = metaForName(item.name);
  const icon = item.isFolder
    ? meta.icon || "folder"
    : iconForPreview(item.preview, false);
  const desc = item.isFolder
    ? meta.desc ||
      (item.childCount != null
        ? `${item.childCount} ${item.childCount === 1 ? "item" : "itens"}`
        : "Pasta")
    : [formatBytes(item.size), formatModified(item.modifiedAt)]
        .filter(Boolean)
        .join(" · ");

  return { ...item, icon, desc };
}

function findItemForEntry(items, entry) {
  if (typeof entry === "object") {
    const target = normalizeSearch(entry.label);
    return (
      items.find((item) => normalizeSearch(item.name) === target) ||
      items.find((item) => {
        const n = normalizeSearch(item.name);
        return target && n && (n.includes(target) || target.includes(n));
      })
    );
  }

  const meta = CATALOG_META[entry];
  if (!meta) return null;
  const target = normalizeSearch(meta.label);
  return (
    items.find((item) => normalizeSearch(item.name) === target) ||
    items.find((item) => {
      const n = normalizeSearch(item.name);
      if (!n || n.length < 4) return false;
      return n.includes(target) || target.includes(n);
    })
  );
}

export function buildHomeSections(items) {
  const decorated = items.map(decorateItem);
  const used = new Set();

  const sections = HOME_SECTIONS.map((section, index) => {
    const sectionItems = [];
    for (const entry of section.items) {
      const found = findItemForEntry(decorated, entry);
      if (!found || used.has(found.id)) continue;
      used.add(found.id);
      const extra =
        typeof entry === "object"
          ? { icon: entry.icon || found.icon, desc: entry.desc || found.desc }
          : {};
      sectionItems.push({ ...found, ...extra });
    }
    return {
      label: section.label,
      asGrid: index === 0,
      items: sectionItems,
    };
  }).filter((section) => section.items.length > 0);

  const leftovers = decorated.filter((item) => !used.has(item.id));
  if (leftovers.length) {
    sections.push({
      label: "Outros materiais",
      asGrid: false,
      items: leftovers,
    });
  }

  return sections;
}

export function categoryOptionsFromRoot(items) {
  const folders = items.filter((item) => item.isFolder);
  return [
    { value: "all", label: "Tudo" },
    ...folders.map((item) => ({ value: item.id, label: item.name })),
  ];
}

export const FALLBACK_CATEGORY_OPTIONS = [
  { value: "all", label: "Tudo" },
  ...TOP_CATEGORY_IDS.map((id) => ({
    value: id,
    label: CATALOG_META[id].label,
  })),
];
