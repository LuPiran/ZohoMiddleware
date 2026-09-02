import {
  enterGraphContext,
  resolveDelegatedGraphToken,
} from "../services/graphAuth.js";

function readGraphHeader(req) {
  return String(
    req.headers["x-graph-token"] ||
      req.headers["x-microsoft-graph-token"] ||
      "",
  ).trim();
}

export async function delegatedGraphMiddleware(req, res, next) {
  const raw = readGraphHeader(req);
  if (!raw) {
    return res.status(401).json({
      success: false,
      error: "Conecte sua conta Microsoft para abrir a Central Comercial.",
      code: "GRAPH_DELEGATED_TOKEN_MISSING",
    });
  }

  try {
    const ctx = await resolveDelegatedGraphToken(raw);
    req.graphUserOid = ctx.oid;
    req.graphDelegated = true;
    enterGraphContext(ctx);
    return next();
  } catch (error) {
    const status = error.status || 401;
    console.error("[CENTRAL] token delegado recusado", {
      http: status,
      code: error.code || null,
      message: error.message,
      user: req.user?.id || null,
      oid: error.oid || null,
    });
    return res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || "GRAPH_TOKEN_INVALID",
    });
  }
}

export async function optionalDelegatedGraph(req, res, next) {
  const raw = readGraphHeader(req);
  if (!raw) {
    req.graphDelegated = false;
    return next();
  }
  return delegatedGraphMiddleware(req, res, next);
}
