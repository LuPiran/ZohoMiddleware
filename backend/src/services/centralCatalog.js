import { CENTRAL_CATEGORIES, CENTRAL_SECTIONS, matchCategoryBySharePointName } from "../data/centralCategories.js";
import {
  getStoredCategoryBindings,
  mergeCategoriesWithBindings,
  saveCategoryBinding,
} from "./centralCatalogStore.js";
import { isSharePointConfigured, listFolder } from "./sharepointCentral.js";

let bindingInFlight = null;

export async function ensureCategoryBindings() {
  const bindings = await getStoredCategoryBindings();
  const missing = CENTRAL_CATEGORIES.filter(
    (category) => category.active !== false && !bindings.get(category.id),
  );
  if (missing.length === 0) return bindings;
  if (!isSharePointConfigured()) return bindings;
  if (bindingInFlight) return bindingInFlight;

  bindingInFlight = (async () => {
    try {
      const payload = await listFolder(null);
      for (const item of payload.items || []) {
        const category = matchCategoryBySharePointName(item.name);
        if (!category || bindings.get(category.id)) continue;
        await saveCategoryBinding(category.id, item.id);
        bindings.set(category.id, item.id);
      }
      return bindings;
    } finally {
      bindingInFlight = null;
    }
  })();

  return bindingInFlight;
}

export async function getPublicCatalog() {
  let bindings = new Map();
  try {
    bindings = await ensureCategoryBindings();
  } catch (error) {
    console.warn("[CENTRAL] bootstrap de categorias:", error.message);
    bindings = await getStoredCategoryBindings();
  }

  const categories = mergeCategoriesWithBindings(bindings);
  const sections = CENTRAL_SECTIONS.map((section) => ({
    ...section,
    items: categories
      .filter((category) => category.sectionId === section.id)
      .sort((a, b) => a.sort - b.sort)
      .map((category) => ({
        id: category.id,
        name: category.name,
        desc: category.desc,
        icon: category.icon,
        sharepointFolderId: category.sharepointFolderId,
        isFolder: true,
      })),
  })).filter((section) => section.items.length > 0);

  return {
    sections,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sharepointFolderId: category.sharepointFolderId,
    })),
  };
}

export async function folderIdForCategory(categoryId) {
  const bindings = await getStoredCategoryBindings();
  return bindings.get(categoryId) || null;
}
