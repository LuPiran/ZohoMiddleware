import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import { CENTRAL_CATEGORIES } from "../data/centralCategories.js";
import { logCentralDynamo } from "../utils/graphLog.js";

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

function tableName() {
  return ENV.DYNAMODB_CENTRAL_TABLE || "portal_central_comercial";
}

function dynamoMeta() {
  return {
    table: tableName(),
    region: ENV.AWS_REGION || "us-east-1",
  };
}

function isMissingTable(error) {
  const name = error?.name || error?.Code || "";
  return (
    name === "ResourceNotFoundException" ||
    error?.message?.includes("Requested resource not found")
  );
}

function dynamoFail(error) {
  return {
    name: error?.name || null,
    http: error?.$metadata?.httpStatusCode || null,
    message: error?.message || String(error),
    missingTable: isMissingTable(error),
  };
}

export function getDynamoPersistStatus() {
  return {
    ...lastPersist,
    ...dynamoMeta(),
    locationInMemory: Boolean(memory.location),
    categoriesInMemory: memory.categories.size,
  };
}

export async function getStoredLocation() {
  if (memory.location) {
    return memory.location;
  }
  try {
    const result = await dynamoDocClient.send(
      new GetCommand({
        TableName: tableName(),
        Key: { pk: PK_LOCATION, sk: SK_ROOT },
      }),
    );
    const item = result.Item;
    if (item?.siteId && item?.driveId && item?.rootFolderId) {
      memory.location = {
        siteId: item.siteId,
        driveId: item.driveId,
        rootFolderId: item.rootFolderId,
      };
      lastPersist.locationSaved = true;
      lastPersist.lastError = null;
      logCentralDynamo("leitura LOCATION ok", {
        ...dynamoMeta(),
        rootFolderId: item.rootFolderId.slice(0, 12),
      });
      return memory.location;
    }
    logCentralDynamo("leitura LOCATION vazia", dynamoMeta());
  } catch (error) {
    lastPersist.lastError = dynamoFail(error);
    logCentralDynamo("leitura LOCATION falhou", {
      ok: false,
      ...dynamoMeta(),
      ...dynamoFail(error),
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
    await dynamoDocClient.send(
      new PutCommand({
        TableName: tableName(),
        Item: {
          pk: PK_LOCATION,
          sk: SK_ROOT,
          ...payload,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    lastPersist.locationSaved = true;
    lastPersist.lastError = null;
    logCentralDynamo("GRAVOU LOCATION", {
      ok: true,
      ...dynamoMeta(),
      pk: PK_LOCATION,
      sk: SK_ROOT,
      rootFolderId: payload.rootFolderId?.slice(0, 16),
    });
  } catch (error) {
    lastPersist.locationSaved = false;
    lastPersist.lastError = dynamoFail(error);
    logCentralDynamo("NÃO gravou LOCATION", {
      ok: false,
      ...dynamoMeta(),
      ...dynamoFail(error),
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
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": PK_CATEGORY },
      }),
    );
    for (const item of result.Items || []) {
      if (item.sk && item.sharepointFolderId) {
        bindings.set(item.sk, item.sharepointFolderId);
        memory.categories.set(item.sk, item.sharepointFolderId);
      }
    }
    lastPersist.categoriesSaved = bindings.size;
    lastPersist.lastError = null;
    logCentralDynamo("leitura CATEGORY ok", {
      ...dynamoMeta(),
      quantidade: bindings.size,
      ids: [...bindings.keys()],
    });
  } catch (error) {
    lastPersist.lastError = dynamoFail(error);
    logCentralDynamo("leitura CATEGORY falhou", {
      ok: false,
      ...dynamoMeta(),
      ...dynamoFail(error),
    });
  }
  return bindings;
}

export async function saveCategoryBinding(categoryId, sharepointFolderId) {
  memory.categories.set(categoryId, sharepointFolderId);
  try {
    await dynamoDocClient.send(
      new PutCommand({
        TableName: tableName(),
        Item: {
          pk: PK_CATEGORY,
          sk: categoryId,
          id: categoryId,
          sharepointFolderId,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    lastPersist.categoriesSaved = memory.categories.size;
    lastPersist.lastError = null;
    logCentralDynamo("GRAVOU CATEGORY", {
      ok: true,
      ...dynamoMeta(),
      pk: PK_CATEGORY,
      sk: categoryId,
      sharepointFolderId: String(sharepointFolderId).slice(0, 16),
    });
  } catch (error) {
    lastPersist.lastError = dynamoFail(error);
    logCentralDynamo("NÃO gravou CATEGORY", {
      ok: false,
      ...dynamoMeta(),
      sk: categoryId,
      ...dynamoFail(error),
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
