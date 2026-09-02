/**
 * Logs de Graph / SharePoint sem vazar token ou secret.
 */

function graphBody(error) {
  return error.response?.data?.error || error.response?.data || null;
}

export function describeGraphError(error) {
  const body = graphBody(error);
  const inner = body?.innerError || {};
  return {
    http: error.response?.status || error.status || null,
    code: body?.code || error.code || null,
    message: body?.message || error.message || "erro desconhecido",
    innerCode: inner.code || null,
    innerMessage: inner.message || null,
    requestId:
      inner["request-id"] ||
      inner.requestId ||
      error.response?.headers?.["request-id"] ||
      error.response?.headers?.["x-ms-ags-diagnostic"] ||
      null,
    target: extraTarget(error),
  };
}

function extraTarget(error) {
  const url = error.config?.url || error.response?.config?.url || "";
  return String(url).replace(/https:\/\/graph\.microsoft\.com\/v1\.0/i, "");
}

export function logGraphInfo(step, extra = {}) {
  console.info("[GRAPH]", step, extra);
}

export function logGraphFailure(step, error, extra = {}) {
  const detail = describeGraphError(error);
  console.error("[GRAPH]", step, { ...detail, ...extra });
}

export function logSharePoint(step, extra = {}) {
  const failed = extra.ok === false || extra.failed;
  if (failed) console.error("[SHAREPOINT]", step, extra);
  else console.info("[SHAREPOINT]", step, extra);
}

export function logCentralDynamo(step, extra = {}) {
  const failed = Boolean(extra.ok === false || extra.failed);
  const line = ["[CENTRAL][DYNAMO]", step, extra];
  if (failed) console.error(...line);
  else console.info(...line);
}
