import { ENV } from "../config/env.js";
import { mysqlMeta } from "../db/mysql.js";
import * as centralRepo from "../db/centralRepo.js";
import { CENTRAL_CATEGORIES } from "../data/centralCategories.js";
import { logCentralStore } from "../utils/graphLog.js";

const PK_LOCATION = "LOCATION";
const SK_ROOT = "ROOT";
const PK_CATEGORY = "CATEGORY";

const memory = {
  location: null,
  categories: new Map(),
};

let lastPersist = {
  table: null,
  region: null,
  locationSaved: false,
  categoriesSaved: 0,
  lastError: null,
};

function storeMeta() {
  return {
    engine: "mysql",
    table: "central_kv",
    host: ENV.MYSQL_HOST,
    database: ENV.MYSQL_DATABASE,
    ...mysqlMeta(),
  };
}

function storeFail(error) {
  return {
    name: error?.name || null,
    code: error?.code || null,
    message: error?.message || String(error),
    missingTable: error?.code === "ER_NO_SUCH_TABLE",
  };
}

export function getStorePersistStatus() {
  return {
    ...lastPersist,
    ...storeMeta(),
    locationInMemory: Boolean(memory.location),
    categoriesInMemory: memory.categories.size,
  };
}

/** Compatível com o contrato antigo da Central Comercial. */
export function getDynamoPersistStatus() {
  return getStorePersistStatus();
}

export async function getStoredLocation() {
  if (memory.location) {
    return memory.location;
  }
  try {
    const item = await centralRepo.getItem(PK_LOCATION, SK_ROOT);
    if (item?.siteId && item?.driveId && item?.rootFolderId) {
      memory.location = {
        siteId: item.siteId,
        driveId: item.driveId,
        rootFolderId: item.rootFolderId,
      };
      lastPersist.locationSaved = true;
      lastPersist.lastError = null;
      logCentralStore("leitura LOCATION ok", {
        ...storeMeta(),
        rootFolderId: item.rootFolderId.slice(0, 12),
      });
      return memory.location;
    }
    logCentralStore("leitura LOCATION vazia", storeMeta());
  } catch (error) {
    lastPersist.lastError = storeFail(error);
    logCentralStore("leitura LOCATION falhou", {
      ok: false,
      ...storeMeta(),
      ...storeFail(error),
    });
  }
  return null;
}

export async function saveLocation(location) {
  const payload = {
    siteId: location.siteId,
    driveId: location.driveId,
    rootFolderId: location.rootFolderId,
  };
  memory.location = payload;
  try {
    await centralRepo.putItem({
      pk: PK_LOCATION,
      sk: SK_ROOT,
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    lastPersist.locationSaved = true;
    lastPersist.lastError = null;
    logCentralStore("GRAVOU LOCATION", {
      ok: true,
      ...storeMeta(),
      pk: PK_LOCATION,
      sk: SK_ROOT,
      rootFolderId: payload.rootFolderId?.slice(0, 16),
    });
  } catch (error) {
    lastPersist.locationSaved = false;
    lastPersist.lastError = storeFail(error);
    logCentralStore("NÃO gravou LOCATION", {
      ok: false,
      ...storeMeta(),
      ...storeFail(error),
    });
  }
  return payload;
}

export async function getStoredCategoryBindings() {
  if (memory.categories.size > 0) {
    return new Map(memory.categories);
  }
  const bindings = new Map();
  try {
    const items = await centralRepo.listByPk(PK_CATEGORY);
    for (const item of items) {
      if (item.sk && item.sharepointFolderId) {
        bindings.set(item.sk, item.sharepointFolderId);
        memory.categories.set(item.sk, item.sharepointFolderId);
      }
    }
    lastPersist.categoriesSaved = bindings.size;
    lastPersist.lastError = null;
    logCentralStore("leitura CATEGORY ok", {
      ...storeMeta(),
      quantidade: bindings.size,
      ids: [...bindings.keys()],
    });
  } catch (error) {
    lastPersist.lastError = storeFail(error);
    logCentralStore("leitura CATEGORY falhou", {
      ok: false,
      ...storeMeta(),
      ...storeFail(error),
    });
  }
  return bindings;
}

export async function saveCategoryBinding(categoryId, sharepointFolderId) {
  memory.categories.set(categoryId, sharepointFolderId);
  try {
    await centralRepo.putItem({
      pk: PK_CATEGORY,
      sk: categoryId,
      id: categoryId,
      sharepointFolderId,
      updatedAt: new Date().toISOString(),
    });
    lastPersist.categoriesSaved = memory.categories.size;
    lastPersist.lastError = null;
    logCentralStore("GRAVOU CATEGORY", {
      ok: true,
      ...storeMeta(),
      pk: PK_CATEGORY,
      sk: categoryId,
      sharepointFolderId: String(sharepointFolderId).slice(0, 16),
    });
  } catch (error) {
    lastPersist.lastError = storeFail(error);
    logCentralStore("NÃO gravou CATEGORY", {
      ok: false,
      ...storeMeta(),
      sk: categoryId,
      ...storeFail(error),
    });
  }
}

export function mergeCategoriesWithBindings(bindings) {
  return CENTRAL_CATEGORIES.filter((category) => category.active !== false).map(
    (category) => ({
      id: category.id,
      name: category.name,
      desc: category.desc || "",
      icon: category.icon,
      sectionId: category.sectionId,
      sort: category.sort,
      sharepointFolderId: bindings.get(category.id) || null,
    }),
  );
}
