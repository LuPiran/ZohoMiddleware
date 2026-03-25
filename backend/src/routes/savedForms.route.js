import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { authenticateToken } from "../services/jwtService.js";

const router = express.Router();
const STORAGE_FILE = path.join(process.cwd(), "logs", "saved-forms.json");
const MAX_FORMS_PER_USER = 50;
const BUSINESS_DAYS_TO_EXPIRE = 7;

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

function addBusinessDays(startDate, businessDays) {
  const result = new Date(startDate);
  let remaining = businessDays;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    const isWeekend = day === 0 || day === 6;
    if (!isWeekend) {
      remaining -= 1;
    }
  }

  return result;
}

function isFormExpired(form, now = new Date()) {
  const savedAt = new Date(form?.dataSalvamento);
  if (Number.isNaN(savedAt.getTime())) {
    return false;
  }

  const expireAt = addBusinessDays(savedAt, BUSINESS_DAYS_TO_EXPIRE);
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
