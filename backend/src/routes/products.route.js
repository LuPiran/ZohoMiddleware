import express from "express";
import { authenticateToken } from "../services/jwtService.js";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";
import {
  getAdminProfileByRequest,
  readProfileTipo,
} from "./users.route.js";

const router = express.Router();

// Wrapper para capturar erros assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function isStrictAdminTipo(tipo) {
  return String(tipo ?? "")
    .trim()
    .toLowerCase() === "admin";
}

async function requireSupabaseStrictAdmin(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({
      success: false,
      error: "Supabase Admin não configurado no servidor",
    });
    return null;
  }

  const profile = await getAdminProfileByRequest(req);
  const requesterTipo = readProfileTipo(profile);
  if (!profile) {
    res.status(403).json({
      success: false,
      error: "Perfil não encontrado para este usuário",
      code: "PROFILE_NOT_FOUND",
    });
    return null;
  }
  if (!isStrictAdminTipo(requesterTipo)) {
    res.status(403).json({
      success: false,
      error: "Apenas administradores podem gerenciar o catálogo de produtos",
      code: "ADMIN_ONLY",
    });
    return null;
  }

  return supabaseAdmin;
}

function formatProdutoFormSelect(row) {
  return {
    id: row.id,
    nome: row.nome || "",
    active: row.ativo !== false,
    unitPrice: row.preco != null ? Number(row.preco) : 0,
  };
}

/**
 * Catálogo de produtos (Supabase) — apenas usuário com tipo "Admin" no perfil.
 * GET /v1/products/catalog?page=1&per_page=10&search=&fabricante=&marca=&preco_min=&preco_max=
 */
router.get(
  "/catalog",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabaseAdmin = await requireSupabaseStrictAdmin(req, res);
    if (!supabaseAdmin) return;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, parseInt(req.query.per_page, 10) || 10),
    );
    const search = String(req.query.search || "")
      .trim()
      .replace(/%/g, "")
      .replace(/,/g, " ")
      .slice(0, 200);
    const fabricante = String(req.query.fabricante || "")
      .trim()
      .replace(/%/g, "")
      .slice(0, 120);
    const marca = String(req.query.marca || "")
      .trim()
      .replace(/%/g, "")
      .slice(0, 120);
    const precoMinRaw = req.query.preco_min;
    const precoMaxRaw = req.query.preco_max;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabaseAdmin
      .from("produtos")
      .select(
        "id, nome, preco, fabricante, descricao, codigo_produto, marca, peso, sku, ativo, created_at, updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (search) {
      const s = search.replace(/%/g, "\\%");
      query = query.or(
        `nome.ilike.%${s}%,sku.ilike.%${s}%,codigo_produto.ilike.%${s}%,marca.ilike.%${s}%,fabricante.ilike.%${s}%,descricao.ilike.%${s}%`,
      );
    }
    if (fabricante) {
      query = query.ilike("fabricante", `%${fabricante}%`);
    }
    if (marca) {
      query = query.ilike("marca", `%${marca}%`);
    }
    if (precoMinRaw !== undefined && precoMinRaw !== "" && precoMinRaw != null) {
      const n = Number(precoMinRaw);
      if (!Number.isNaN(n)) query = query.gte("preco", n);
    }
    if (precoMaxRaw !== undefined && precoMaxRaw !== "" && precoMaxRaw != null) {
      const n = Number(precoMaxRaw);
      if (!Number.isNaN(n)) query = query.lte("preco", n);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("[PRODUCTS CATALOG]", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar produtos",
        code: error.code,
      });
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        perPage,
        total,
        totalPages,
      },
    });
  }),
);

/**
 * POST /v1/products/catalog — criar produto (admin).
 */
router.post(
  "/catalog",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabaseAdmin = await requireSupabaseStrictAdmin(req, res);
    if (!supabaseAdmin) return;

    const {
      nome,
      preco,
      sku,
      fabricante,
      descricao,
      marca,
      peso,
      codigo_produto,
    } = req.body || {};

    if (!nome || !String(nome).trim()) {
      return res.status(400).json({
        success: false,
        error: "Nome é obrigatório",
      });
    }
    if (!sku || !String(sku).trim()) {
      return res.status(400).json({
        success: false,
        error: "SKU é obrigatório",
      });
    }

    const precoNum = Number(preco);
    if (Number.isNaN(precoNum) || precoNum < 0) {
      return res.status(400).json({
        success: false,
        error: "Preço inválido",
      });
    }

    let pesoVal = null;
    if (peso !== undefined && peso !== null && String(peso).trim() !== "") {
      pesoVal = Number(peso);
      if (Number.isNaN(pesoVal)) {
        return res.status(400).json({
          success: false,
          error: "Peso inválido",
        });
      }
    }

    const row = {
      nome: String(nome).trim(),
      preco: precoNum,
      sku: String(sku).trim(),
      fabricante: fabricante != null && String(fabricante).trim() !== ""
        ? String(fabricante).trim()
        : null,
      descricao: descricao != null && String(descricao).trim() !== ""
        ? String(descricao).trim()
        : null,
      marca: marca != null && String(marca).trim() !== ""
        ? String(marca).trim()
        : null,
      peso: pesoVal,
      ativo: req.body?.ativo === false ? false : true,
    };

    if (codigo_produto != null && String(codigo_produto).trim() !== "") {
      row.codigo_produto = String(codigo_produto).trim();
    }

    const { data, error } = await supabaseAdmin
      .from("produtos")
      .insert(row)
      .select(
        "id, nome, preco, fabricante, descricao, codigo_produto, marca, peso, sku, ativo, created_at, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error:
            "Já existe um produto com o mesmo nome, SKU ou código de produto",
          code: "DUPLICATE",
        });
      }
      console.error("[PRODUCTS CREATE]", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao criar produto",
        code: error.code,
      });
    }

    return res.status(201).json({ success: true, data });
  }),
);

/**
 * PATCH /v1/products/catalog/:id — atualizar produto (admin).
 */
router.patch(
  "/catalog/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabaseAdmin = await requireSupabaseStrictAdmin(req, res);
    if (!supabaseAdmin) return;

    const { id } = req.params;
    if (!id || !String(id).trim()) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }

    const body = req.body || {};
    const updates = {};

    if (body.nome !== undefined) {
      const v = String(body.nome).trim();
      if (!v) {
        return res.status(400).json({
          success: false,
          error: "Nome não pode ficar vazio",
        });
      }
      updates.nome = v;
    }
    if (body.preco !== undefined) {
      const n = Number(body.preco);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({
          success: false,
          error: "Preço inválido",
        });
      }
      updates.preco = n;
    }
    if (body.sku !== undefined) {
      const v = String(body.sku).trim();
      if (!v) {
        return res.status(400).json({
          success: false,
          error: "SKU não pode ficar vazio",
        });
      }
      updates.sku = v;
    }
    if (body.fabricante !== undefined) {
      updates.fabricante =
        body.fabricante != null && String(body.fabricante).trim() !== ""
          ? String(body.fabricante).trim()
          : null;
    }
    if (body.descricao !== undefined) {
      updates.descricao =
        body.descricao != null && String(body.descricao).trim() !== ""
          ? String(body.descricao).trim()
          : null;
    }
    if (body.marca !== undefined) {
      updates.marca =
        body.marca != null && String(body.marca).trim() !== ""
          ? String(body.marca).trim()
          : null;
    }
    if (body.peso !== undefined) {
      if (body.peso === null || String(body.peso).trim() === "") {
        updates.peso = null;
      } else {
        const n = Number(body.peso);
        if (Number.isNaN(n)) {
          return res.status(400).json({
            success: false,
            error: "Peso inválido",
          });
        }
        updates.peso = n;
      }
    }
    if (body.codigo_produto !== undefined) {
      const v = String(body.codigo_produto).trim();
      if (!v) {
        return res.status(400).json({
          success: false,
          error: "Código do produto não pode ficar vazio",
        });
      }
      updates.codigo_produto = v;
    }
    if (body.ativo !== undefined) {
      updates.ativo = Boolean(body.ativo);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nenhum campo para atualizar",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("produtos")
      .update(updates)
      .eq("id", id)
      .select(
        "id, nome, preco, fabricante, descricao, codigo_produto, marca, peso, sku, ativo, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error:
            "Já existe um produto com o mesmo nome, SKU ou código de produto",
          code: "DUPLICATE",
        });
      }
      console.error("[PRODUCTS PATCH]", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao atualizar produto",
        code: error.code,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
        code: "NOT_FOUND",
      });
    }

    return res.json({ success: true, data });
  }),
);

/**
 * PUT /v1/products/catalog/:id/toggle-status — alterna ativo/inativo (admin).
 */
router.put(
  "/catalog/:id/toggle-status",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabaseAdmin = await requireSupabaseStrictAdmin(req, res);
    if (!supabaseAdmin) return;

    const { id } = req.params;
    if (!id || !String(id).trim()) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }

    const { data: current, error: fetchErr } = await supabaseAdmin
      .from("produtos")
      .select("id, ativo")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("[PRODUCTS TOGGLE]", fetchErr);
      return res.status(500).json({
        success: false,
        error: fetchErr.message || "Erro ao ler produto",
      });
    }
    if (!current) {
      return res.status(404).json({
        success: false,
        error: "Produto não encontrado",
        code: "NOT_FOUND",
      });
    }

    const wasAtivo = current.ativo !== false;
    const newAtivo = !wasAtivo;

    const { data, error } = await supabaseAdmin
      .from("produtos")
      .update({ ativo: newAtivo })
      .eq("id", id)
      .select(
        "id, nome, preco, fabricante, descricao, codigo_produto, marca, peso, sku, ativo, created_at, updated_at",
      )
      .single();

    if (error) {
      console.error("[PRODUCTS TOGGLE UPDATE]", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao atualizar status",
      });
    }

    return res.json({
      success: true,
      message: newAtivo ? "Produto ativado" : "Produto desativado",
      data: {
        ...data,
        ativo: newAtivo,
      },
    });
  }),
);

/**
 * Lista produtos ativos do catálogo (Supabase) para os formulários do portal.
 * GET /v1/products
 */
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: "Catálogo de produtos não configurado no servidor",
      });
    }

    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, preco, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("[PRODUCTS API] Supabase (ativos):", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar produtos",
      });
    }

    const produtosFormatados = (data || []).map(formatProdutoFormSelect);
    return res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
      hasMore: false,
    });
  }),
);

/**
 * Lista todos os produtos do catálogo (Supabase), inclusive inativos.
 * GET /v1/products/all
 */
router.get(
  "/all",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: "Catálogo de produtos não configurado no servidor",
      });
    }

    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, preco, ativo")
      .order("nome", { ascending: true });

    if (error) {
      console.error("[PRODUCTS API] Supabase (todos):", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar produtos",
      });
    }

    const produtosFormatados = (data || []).map(formatProdutoFormSelect);
    return res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
      hasMore: false,
    });
  }),
);

export default router;
