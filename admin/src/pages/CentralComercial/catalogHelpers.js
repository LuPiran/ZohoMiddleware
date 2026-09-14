import {
  CATALOG_META,
  CATALOG_PAGES,
  HOME_SECTIONS,
  TOP_CATEGORY_IDS,
} from "./catalog";

export const CATEGORY_OPTIONS = [
  { value: "all", label: "Tudo" },
  ...TOP_CATEGORY_IDS.map((id) => ({
    value: id,
    label: CATALOG_META[id].label,
  })),
];

const PARENT_MAP = {};
Object.entries(CATALOG_PAGES).forEach(([pageId, page]) => {
  page.groups.forEach((group) => {
    group.items.forEach((item) => {
      if (item.nav) PARENT_MAP[item.nav] = pageId;
    });
  });
});

export function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPathTo(pageId) {
  const path = [];
  let current = pageId;
  while (current) {
    path.unshift(current);
    current = PARENT_MAP[current];
  }
  return path;
}

export function searchCatalog(query, categoryId) {
  const q = normalizeSearch(query);
  if (q.length < 2) return [];

  const results = [];
  Object.entries(CATALOG_PAGES).forEach(([pageId, page]) => {
    page.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (!item.leaf) return;
        const haystack = normalizeSearch(
          `${item.label} ${item.desc || ""} ${item.tag || ""}`,
        );
        if (!haystack.includes(q)) return;

        const path = getPathTo(pageId);
        if (categoryId && categoryId !== "all" && path[0] !== categoryId) {
          return;
        }

        const topId = path[0];
        results.push({
          label: item.label,
          typeLabel: CATALOG_META[topId]?.label || "",
          icon: CATALOG_META[topId]?.icon || "file",
          where: ["Início", ...path.map((id) => CATALOG_META[id].label)].join(
            " › ",
          ),
          path,
        });
      });
    });
  });

  return results.slice(0, 30);
}

export function resolveHomeSections() {
  return HOME_SECTIONS.map((section, index) => ({
    label: section.label,
    asGrid: index === 0,
    items: section.items.map((entry) => {
      if (typeof entry === "object") {
        return {
          kind: "link",
          label: entry.label,
          desc: entry.desc || "",
          icon: entry.icon || "file",
          href: entry.url,
        };
      }
      const meta = CATALOG_META[entry];
      return {
        kind: "nav",
        nav: entry,
        label: meta.label,
        desc: meta.desc || "",
        icon: meta.icon,
      };
    }),
  }));
}

export function resolvePageGroups(pageId) {
  const page = CATALOG_PAGES[pageId];
  if (!page) return [];

  return page.groups.map((group) => ({
    label: group.label || "",
    items: group.items.map((item) => {
      if (item.nav) {
        const meta = CATALOG_META[item.nav];
        return {
          kind: "nav",
          nav: item.nav,
          label: meta.label,
          desc: meta.desc || "",
          icon: "folder",
          toneIcon: meta.icon,
        };
      }
      return {
        kind: "link",
        label: item.label,
        desc: item.desc || "",
        tag: item.tag || "",
        href: item.url,
        icon: "file",
        toneIcon: item.tag === "Isolate" ? "isolate" : "file",
      };
    }),
  }));
}
