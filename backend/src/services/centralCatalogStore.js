import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocClient } from "../config/dynamodb.js";
import { ENV } from "../config/env.js";
import { CENTRAL_CATEGORIES } from "../data/centralCategories.js";

const PK_LOCATION = "LOCATION";
const SK_ROOT = "ROOT";
const PK_CATEGORY = "CATEGORY";

const memory = {
  location: null,
  categories: new Map(),
};

function tableName() {
  return ENV.DYNAMODB_CENTRAL_TABLE || "portal_central_comercial";
}

function isMissingTable(error) {
  const name = error?.name || error?.Code || "";
  return (
    name === "ResourceNotFoundException" ||
    error?.message?.includes("Requested resource not found")
  );
}

export async function getStoredLocation() {
  if (memory.location) return memory.location;
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
      return memory.location;
    }
  } catch (error) {
    if (!isMissingTable(error)) {
      console.warn("[CENTRAL][STORE] leitura da localização:", error.message);
    }
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
  } catch (error) {
    if (!isMissingTable(error)) {
      console.warn("[CENTRAL][STORE] persistir localização:", error.message);
    }
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
  } catch (error) {
    if (!isMissingTable(error)) {
      console.warn("[CENTRAL][STORE] leitura das categorias:", error.message);
    }
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
  } catch (error) {
    if (!isMissingTable(error)) {
      console.warn("[CENTRAL][STORE] persistir categoria:", error.message);
    }
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
