import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { authenticateToken } from "../services/jwtService.js";
import { chamarZohoApi } from "../services/zohoApi.js";

const router = express.Router();
const STORAGE_FILE = path.join(process.cwd(), "logs", "saved-forms.json");
const MAX_FORMS_PER_USER = 50;
const DAYS_TO_EXPIRE = 10;
const DAYS_TO_KEEP_RESOLVED_OCCURRENCES = 3;

async function ensureStorageDir() {
  await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
}

async function readStorage() {
  await ensureStorageDir();

  try {
    const raw = await fs.readFile(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeStorage(data) {
  await ensureStorageDir();
  await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getUserKey(req) {
  return String(req.user?.id || req.user?.email || "anonymous");
}

function addDays(startDate, days) {
  const result = new Date(startDate);
  result.setDate(result.getDate() + days);
  return result;
}

function isValidDateString(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function getResolvedUntil(form) {
  if (form?.crmResolvedUntil && isValidDateString(form.crmResolvedUntil)) {
    return new Date(form.crmResolvedUntil);
  }

  if (form?.crmResolvedAt && isValidDateString(form.crmResolvedAt)) {
    return addDays(form.crmResolvedAt, DAYS_TO_KEEP_RESOLVED_OCCURRENCES);
  }

  return null;
}

function isFormExpired(form, now = new Date()) {
  if (form?.tipo === "ocorrencia" && form?.enviado === true) {
    if (form?.crmStatus === "resolvida") {
      const resolvedUntil = getResolvedUntil(form);
      return resolvedUntil ? now > resolvedUntil : false;
    }

    return false;
  }

  const savedAt = new Date(form?.dataSalvamento);
  if (Number.isNaN(savedAt.getTime())) {
    return false;
  }

  const expireAt = addDays(savedAt, DAYS_TO_EXPIRE);
  return now > expireAt;
}

function pruneExpiredForms(storage) {
  const now = new Date();
  let changed = false;

  Object.keys(storage).forEach((userKey) => {
    const userForms = Array.isArray(storage[userKey]) ? storage[userKey] : [];
    const filtered = userForms.filter((form) => !isFormExpired(form, now));

    if (filtered.length !== userForms.length) {
      changed = true;
      storage[userKey] = filtered;
    }
  });

  return changed;
}

router.use(authenticateToken);

router.get("/", async (req, res) => {
  try {
    const storage = await readStorage();
    const pruned = pruneExpiredForms(storage);
    if (pruned) {
      await writeStorage(storage);
    }

    const userKey = getUserKey(req);
    const forms = Array.isArray(storage[userKey]) ? storage[userKey] : [];

    res.json({
      success: true,
      data: forms,
      total: forms.length,
    });
  } catch (error) {
    console.error("[SAVED_FORMS] Erro ao listar formulários:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar formulários salvos",
    });
  }
});

router.get("/count", async (req, res) => {
  try {
    const storage = await readStorage();
    const pruned = pruneExpiredForms(storage);
    if (pruned) {
      await writeStorage(storage);
    }

    const userKey = getUserKey(req);
    const forms = Array.isArray(storage[userKey]) ? storage[userKey] : [];

    res.json({
      success: true,
      count: forms.length,
    });
  } catch (error) {
    console.error("[SAVED_FORMS] Erro ao contar formulários:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao contar formulários salvos",
    });
  }
});

function extractOwnerName(ownerField) {
  if (!ownerField) return "";
  if (typeof ownerField === "string") return ownerField.trim();
  if (typeof ownerField === "object") {
    return String(
      ownerField.name || ownerField.full_name || ownerField.email || "",
    ).trim();
  }
  return "";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isOwnerStillUnassigned(ownerName) {
  const normalized = normalizeText(ownerName);
  return normalized === "suporteti";
}

function isOcorrenciaFinalizada(statusValue) {
  return normalizeText(statusValue) === "ocorrenciafinalizada";
}

async function fetchOcorrenciaById(recordId) {
  const endpoint = `/Ocorrencias/${recordId}?fields=${encodeURIComponent("id,Owner,Protocolo_Portal,Modified_Time,Status_da_Ocorrencia")}`;
  const response = await chamarZohoApi("GET", endpoint, null, { timeoutMs: 12000 });
  return response?.data?.[0] || null;
}

async function fetchOcorrenciaByProtocolo(protocolo) {
  const criteria = `(Protocolo_Portal:equals:${protocolo})`;
  const endpoint = `/Ocorrencias/search?criteria=${encodeURIComponent(criteria)}&fields=${encodeURIComponent("id,Owner,Protocolo_Portal,Modified_Time,Status_da_Ocorrencia")}`;
  const response = await chamarZohoApi("GET", endpoint, null, { timeoutMs: 12000 });
  return Array.isArray(response?.data) && response.data.length > 0
    ? response.data[0]
    : null;
}

router.post("/ocorrencias/sync-owner", async (req, res) => {
  try {
    const storage = await readStorage();
    const pruned = pruneExpiredForms(storage);

    const userKey = getUserKey(req);
    const forms = Array.isArray(storage[userKey]) ? storage[userKey] : [];
    const ocorrenciasEnviadas = forms.filter(
      (form) => form?.tipo === "ocorrencia" && form?.enviado === true,
    );

    if (ocorrenciasEnviadas.length === 0) {
      if (pruned) {
        await writeStorage(storage);
      }

      return res.json({
        success: true,
        updated: 0,
        total: 0,
      });
    }

    let updated = 0;
    const finalizedFormIds = new Set();

    for (const form of ocorrenciasEnviadas) {
      try {
        const record = form.zohoRecordId
          ? await fetchOcorrenciaById(form.zohoRecordId)
          : await fetchOcorrenciaByProtocolo(form.protocolo);

        if (!record) {
          const nextStatus = "nao_localizado_no_crm";
          if (form.crmStatus !== nextStatus) {
            form.crmStatus = nextStatus;
            form.crmSyncAt = new Date().toISOString();
            updated += 1;
          }
          continue;
        }

        const crmStatusName = String(record.Status_da_Ocorrencia || "").trim();

        if (isOcorrenciaFinalizada(crmStatusName)) {
          const resolvedAt = form.crmResolvedAt || new Date().toISOString();
          const resolvedUntil = form.crmResolvedUntil || addDays(resolvedAt, DAYS_TO_KEEP_RESOLVED_OCCURRENCES).toISOString();

          const changed =
            form.crmStatus !== "resolvida" ||
            form.crmStatusLabel !== crmStatusName ||
            form.crmResolvedAt !== resolvedAt ||
            form.crmResolvedUntil !== resolvedUntil ||
            form.crmOwnerName !== (extractOwnerName(record.Owner) || null) ||
            form.crmOwnerId !== (record.Owner?.id || null) ||
            form.zohoRecordId !== record.id;

          if (changed) {
            form.crmStatus = "resolvida";
            form.crmStatusLabel = crmStatusName;
            form.crmResolvedAt = resolvedAt;
            form.crmResolvedUntil = resolvedUntil;
            form.crmOwnerName = extractOwnerName(record.Owner) || null;
            form.crmOwnerId = record.Owner?.id || null;
            form.zohoRecordId = record.id || form.zohoRecordId || null;
            form.crmSyncAt = new Date().toISOString();
            form.dataAtualizacao = new Date().toISOString();
            updated += 1;
          }

          continue;
        }

        const ownerName = extractOwnerName(record.Owner);
        const ownerIsUnassigned = isOwnerStillUnassigned(ownerName);
        const effectiveOwnerName = ownerIsUnassigned ? "" : ownerName;
        const nextStatus = effectiveOwnerName ? "em_tratamento" : ownerIsUnassigned ? "nao_atendida" : "aguardando_triagem";

        const changed =
          form.crmOwnerName !== (effectiveOwnerName || null) ||
          form.crmOwnerId !== (record.Owner?.id || null) ||
          form.crmStatusLabel !== (crmStatusName || null) ||
          form.crmStatus !== nextStatus ||
          form.zohoRecordId !== record.id;

        if (changed) {
          form.crmOwnerName = effectiveOwnerName || null;
          form.crmOwnerId = record.Owner?.id || null;
          form.crmStatus = nextStatus;
          form.crmStatusLabel = crmStatusName || null;
          form.zohoRecordId = record.id || form.zohoRecordId || null;
          form.crmSyncAt = new Date().toISOString();
          form.dataAtualizacao = new Date().toISOString();
          updated += 1;
        }
      } catch (error) {
        console.warn("[SAVED_FORMS] Falha ao sincronizar ocorrencia com CRM:", {
          formId: form.id,
          protocolo: form.protocolo,
          error: error.response?.data?.message || error.message,
        });

        const nextStatus = "erro_sincronizacao_crm";
        if (form.crmStatus !== nextStatus) {
          form.crmStatus = nextStatus;
          form.crmSyncAt = new Date().toISOString();
          updated += 1;
        }
      }
    }

    storage[userKey] = forms;
    if (pruned || updated > 0) {
      await writeStorage(storage);
    }

    return res.json({
      success: true,
      updated,
      total: ocorrenciasEnviadas.length,
      removed: 0,
      data: forms,
    });
  } catch (error) {
    console.error("[SAVED_FORMS] Erro ao sincronizar owner de ocorrencias:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao sincronizar ocorrencias com CRM",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const storage = await readStorage();
    pruneExpiredForms(storage);

    const userKey = getUserKey(req);
    const forms = Array.isArray(storage[userKey]) ? storage[userKey] : [];

    const incoming = req.body || {};
    const newForm = {
      ...incoming,
      id:
        incoming.id ||
        `form_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      dataSalvamento: incoming.dataSalvamento || new Date().toISOString(),
      enviado: incoming.enviado ?? false,
      statusEnvio: incoming.statusEnvio || "pendente",
      dataEnvio: incoming.dataEnvio || null,
    };

    const filtered = forms.filter((form) => form.id !== newForm.id);
    filtered.push(newForm);

    if (filtered.length > MAX_FORMS_PER_USER) {
      filtered.splice(0, filtered.length - MAX_FORMS_PER_USER);
    }

    storage[userKey] = filtered;
    await writeStorage(storage);

    res.status(201).json({
      success: true,
      data: newForm,
    });
  } catch (error) {
    console.error("[SAVED_FORMS] Erro ao salvar formulário:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao salvar formulário",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const storage = await readStorage();
    pruneExpiredForms(storage);

    const userKey = getUserKey(req);
    const forms = Array.isArray(storage[userKey]) ? storage[userKey] : [];

    const index = forms.findIndex((form) => form.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Formulário não encontrado",
      });
    }

    forms[index] = {
      ...forms[index],
      ...req.body,
      id: forms[index].id,
      dataAtualizacao: new Date().toISOString(),
    };

    storage[userKey] = forms;
    await writeStorage(storage);

    res.json({
      success: true,
      data: forms[index],
    });
  } catch (error) {
    console.error("[SAVED_FORMS] Erro ao atualizar formulário:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar formulário",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const storage = await readStorage();
    pruneExpiredForms(storage);

    const userKey = getUserKey(req);
    const forms = Array.isArray(storage[userKey]) ? storage[userKey] : [];

    const nextForms = forms.filter((form) => form.id !== req.params.id);
    storage[userKey] = nextForms;
    await writeStorage(storage);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("[SAVED_FORMS] Erro ao excluir formulário:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao excluir formulário",
    });
  }
});

export default router;
