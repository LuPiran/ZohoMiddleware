import express from "express";
import { centralContentRateLimiter } from "../middleware/rateLimiter.js";
import {
  getSharePointRoot,
  listFolder,
  searchCentral,
  streamCentralContent,
  isSharePointConfigured,
} from "../services/sharepointCentral.js";
import { getDynamoPersistStatus } from "../services/centralCatalogStore.js";
import { getPublicCatalog } from "../services/centralCatalog.js";

const router = express.Router();

function graphIdGuard(req, res, next) {
  const value = String(req.params.itemId || "").trim();
  if (!/^[A-Za-z0-9!._=-]{8,512}$/.test(value)) {
    return res.status(400).json({
      success: false,
      error: "Identificador de material inválido",
    });
  }
  req.params.itemId = value;
  return next();
}

function sendServiceError(res, error) {
  const status = error.status || 500;
  console.error("[CENTRAL] resposta de erro", {
    http: status,
    code: error.code || null,
    graphCode: error.graphCode || null,
    message: error.message,
    path: res.req?.originalUrl || null,
    user: res.req?.user?.id || null,
  });
  return res.status(status).json({
    success: false,
    error: error.message || "Erro ao acessar a Central Comercial",
    code: error.code || undefined,
  });
}

router.get("/status", async (req, res) => {
  try {
    if (!isSharePointConfigured()) {
      const dynamo = getDynamoPersistStatus();
      console.info("[CENTRAL] status", { configured: false, dynamo });
      return res.json({
        success: true,
        configured: false,
        dynamo,
      });
    }
    const { root } = await getSharePointRoot();
    const dynamo = getDynamoPersistStatus();
    console.info("[CENTRAL] status", {
      configured: true,
      root: root.name,
      dynamo,
    });
    return res.json({
      success: true,
      configured: true,
      root: { id: root.id, name: root.name },
      dynamo,
    });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.get("/catalog", async (req, res) => {
  try {
    if (!isSharePointConfigured()) {
      const err = new Error(
        "A Central ainda não está conectada ao SharePoint. Peça à gestão para configurar o Microsoft Graph.",
      );
      err.status = 503;
      err.code = "GRAPH_NOT_CONFIGURED";
      throw err;
    }
    const payload = await getPublicCatalog();
    return res.json({ success: true, ...payload });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.get("/browse", async (req, res) => {
  try {
    if (!isSharePointConfigured()) {
      const err = new Error(
        "A Central ainda não está conectada ao SharePoint. Peça à gestão para configurar o Microsoft Graph.",
      );
      err.status = 503;
      err.code = "GRAPH_NOT_CONFIGURED";
      throw err;
    }
    const parentId = String(req.query.parentId || "").trim();
    if (parentId && !/^[A-Za-z0-9!._=-]{8,512}$/.test(parentId)) {
      console.warn("[CENTRAL] browse recusado", {
        parentId,
        motivo: "id curto ou inválido (não é Graph)",
        user: req.user?.id,
      });
      return res.status(400).json({
        success: false,
        error: "Identificador de pasta inválido",
      });
    }
    console.info("[CENTRAL] browse", {
      user: req.user?.id,
      parentId: parentId || "ROOT",
    });
    const payload = await listFolder(parentId || null);
    return res.json({ success: true, ...payload });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.get("/search", async (req, res) => {
  try {
    if (!isSharePointConfigured()) {
      const err = new Error(
        "A Central ainda não está conectada ao SharePoint.",
      );
      err.status = 503;
      err.code = "GRAPH_NOT_CONFIGURED";
      throw err;
    }
    const folderId = String(req.query.folderId || "").trim();
    const scoped =
      folderId && /^[A-Za-z0-9!._=-]{8,512}$/.test(folderId)
        ? folderId
        : null;
    const payload = await searchCentral(req.query.q, { folderId: scoped });
    return res.json({ success: true, ...payload });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

router.get(
  "/items/:itemId/content",
  graphIdGuard,
  centralContentRateLimiter,
  async (req, res) => {
    try {
      if (!isSharePointConfigured()) {
        const err = new Error(
          "A Central ainda não está conectada ao SharePoint.",
        );
        err.status = 503;
        err.code = "GRAPH_NOT_CONFIGURED";
        throw err;
      }
      const mode =
        String(req.query.mode || "preview").toLowerCase() === "download"
          ? "download"
          : "preview";
      console.info(
        `[CENTRAL] ${mode} user=${req.user?.id || "?"} item=${req.params.itemId}`,
      );
      await streamCentralContent(req.params.itemId, res, { mode });
    } catch (error) {
      if (res.headersSent) {
        return res.end();
      }
      return sendServiceError(res, error);
    }
  },
);

router.get("/items/:itemId", graphIdGuard, async (req, res) => {
  try {
    if (!isSharePointConfigured()) {
      const err = new Error(
        "A Central ainda não está conectada ao SharePoint.",
      );
      err.status = 503;
      err.code = "GRAPH_NOT_CONFIGURED";
      throw err;
    }
    const payload = await listFolder(req.params.itemId);
    return res.json({ success: true, ...payload });
  } catch (error) {
    return sendServiceError(res, error);
  }
});

export default router;
