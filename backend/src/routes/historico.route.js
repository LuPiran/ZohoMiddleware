import express from "express";
import { authenticateToken } from "../services/jwtService.js";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";
import { getAdminProfileByRequest } from "../routes/users.route.js";
import {
  applyHistoricoAccessAndFilters,
  applyFiltersToQuery,
  applySearchOr,
  listConsultoresEquipeParaFiltro,
  normalizeTipo,
} from "../utils/historicoListHelpers.js";

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page, 10) || 20));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  return { page, perPage, from, to };
}

const SELECT_COMPRA_RECOMPRA =
  "id, protocolo_portal, nome_completo, valor_total, quantidade_produtos, cadastro_usuario_nome, gerente_nome, created_at";

const SELECT_PROPOSTA =
  "id, protocolo_portal, nome_completo, nome_empresa, tipo_cliente, valor_total, quantidade_produtos, cadastro_usuario_nome, gerente_nome, created_at";

const SELECT_OCORRENCIA =
  "id, protocolo_portal, nome_completo, numero_pedido, status, cadastro_usuario_nome, gerente_nome, created_at";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidParam(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

const SEARCH_COMPRA = [
  "protocolo_portal",
  "nome_completo",
  "cadastro_usuario_nome",
  "gerente_nome",
];

const SEARCH_PROPOSTA = [
  "protocolo_portal",
  "nome_completo",
  "nome_empresa",
  "cadastro_usuario_nome",
  "gerente_nome",
];

const SEARCH_OCORRENCIA = [
  "protocolo_portal",
  "nome_completo",
  "numero_pedido",
  "status",
  "cadastro_usuario_nome",
  "gerente_nome",
];

async function runList(req, res, table, select, searchColumns) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: "Supabase não configurado no servidor",
    });
  }

  const profile = await getAdminProfileByRequest(req);
  if (!profile?.id) {
    return res.status(403).json({
      success: false,
      error: "Perfil não encontrado para este usuário",
      code: "PROFILE_NOT_FOUND",
    });
  }

  const { page, perPage, from, to } = paginate(req);

  const acc = await applyHistoricoAccessAndFilters(supabase, req, { profile });
  if (acc.error) {
    return res.status(acc.error.status).json(acc.error.body);
  }

  let query = supabase.from(table).select(select, { count: "exact" });
  query = applyFiltersToQuery(query, acc.filters);
  query = applySearchOr(query, searchColumns, acc.search);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error(`[HISTORICO ${table}]`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao listar histórico",
    });
  }

  const total = count ?? 0;
  const mapped = (data || []).map((row) => ({
    ...row,
    consultor: row.cadastro_usuario_nome ?? null,
    gerente: row.gerente_nome ?? null,
    ...(table === "propostas"
      ? {
          nome_exibicao:
            row.nome_empresa || row.nome_completo || "—",
        }
      : {}),
  }));

  return res.json({
    success: true,
    data: mapped,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
    meta: acc.meta,
  });
}

async function runDetail(req, res, table) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: "Supabase não configurado no servidor",
    });
  }

  const rawId = req.params?.id;
  if (!isUuidParam(rawId)) {
    return res.status(400).json({
      success: false,
      error: "Identificador inválido",
    });
  }
  const id = rawId.trim();

  const profile = await getAdminProfileByRequest(req);
  if (!profile?.id) {
    return res.status(403).json({
      success: false,
      error: "Perfil não encontrado para este usuário",
      code: "PROFILE_NOT_FOUND",
    });
  }

  const acc = await applyHistoricoAccessAndFilters(supabase, req, { profile });
  if (acc.error) {
    return res.status(acc.error.status).json(acc.error.body);
  }

  let query = supabase.from(table).select("*");
  query = applyFiltersToQuery(query, acc.filters);
  query = query.eq("id", id);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[HISTORICO DETAIL ${table}]`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao carregar registro",
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      error: "Registro não encontrado",
      code: "NOT_FOUND",
    });
  }

  const row = {
    ...data,
    consultor: data.cadastro_usuario_nome ?? null,
    gerente: data.gerente_nome ?? null,
    ...(table === "propostas"
      ? {
          nome_exibicao:
            data.nome_empresa || data.nome_completo || "—",
        }
      : {}),
  };

  return res.json({
    success: true,
    data: row,
    meta: acc.meta,
  });
}

async function runArquivoSignedUrl(req, res, table) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: "Supabase não configurado no servidor",
    });
  }

  const rawId = req.params?.id;
  if (!isUuidParam(rawId)) {
    return res.status(400).json({
      success: false,
      error: "Identificador inválido",
    });
  }
  const id = rawId.trim();

  const rawIdx = req.params?.fileIndex ?? req.params?.index;
  const fileIndex = parseInt(String(rawIdx ?? ""), 10);
  if (Number.isNaN(fileIndex) || fileIndex < 0) {
    return res.status(400).json({
      success: false,
      error: "Índice de arquivo inválido",
    });
  }

  const profile = await getAdminProfileByRequest(req);
  if (!profile?.id) {
    return res.status(403).json({
      success: false,
      error: "Perfil não encontrado para este usuário",
      code: "PROFILE_NOT_FOUND",
    });
  }

  const acc = await applyHistoricoAccessAndFilters(supabase, req, { profile });
  if (acc.error) {
    return res.status(acc.error.status).json(acc.error.body);
  }

  let query = supabase.from(table).select("anexos_storage");
  query = applyFiltersToQuery(query, acc.filters);
  query = query.eq("id", id);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(`[HISTORICO ARQUIVO ${table}]`, error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao carregar anexos",
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      error: "Registro não encontrado",
      code: "NOT_FOUND",
    });
  }

  const list = Array.isArray(data.anexos_storage) ? data.anexos_storage : [];
  const item = list[fileIndex];
  if (!item?.path || !item?.bucket) {
    return res.status(404).json({
      success: false,
      error: "Arquivo não encontrado",
      code: "FILE_NOT_FOUND",
    });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(item.bucket)
    .createSignedUrl(item.path, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error("[HISTORICO ARQUIVO signedUrl]", signErr);
    return res.status(500).json({
      success: false,
      error: signErr?.message || "Erro ao gerar link do arquivo",
    });
  }

  return res.json({
    success: true,
    url: signed.signedUrl,
    fileName: item.fileName || `arquivo_${fileIndex}`,
  });
}

/**
 * GET /v1/historico/filtros-consultores — apenas gerente: lista ele + consultores da equipe.
 */
router.get(
  "/filtros-consultores",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: "Supabase não configurado no servidor",
      });
    }

    const profile = await getAdminProfileByRequest(req);
    if (!profile?.id) {
      return res.status(403).json({
        success: false,
        error: "Perfil não encontrado",
      });
    }

    const tipo = normalizeTipo(profile);
    if (tipo !== "gerente") {
      return res.json({
        success: true,
        data: [],
        meta: { onlyGerente: false },
      });
    }

    const data = await listConsultoresEquipeParaFiltro(supabase, profile.id);
    return res.json({
      success: true,
      data,
      meta: {
        onlyGerente: true,
        defaultConsultorId: profile.id,
      },
    });
  }),
);

router.get(
  "/compras/:id/arquivos/:fileIndex/signed",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runArquivoSignedUrl(req, res, "compras");
  }),
);

router.get(
  "/compras/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runDetail(req, res, "compras");
  }),
);

router.get(
  "/compras",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runList(req, res, "compras", SELECT_COMPRA_RECOMPRA, SEARCH_COMPRA);
  }),
);

router.get(
  "/recompras/:id/arquivos/:fileIndex/signed",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runArquivoSignedUrl(req, res, "recompras");
  }),
);

router.get(
  "/recompras/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runDetail(req, res, "recompras");
  }),
);

router.get(
  "/recompras",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runList(req, res, "recompras", SELECT_COMPRA_RECOMPRA, SEARCH_COMPRA);
  }),
);

router.get(
  "/propostas/:id/arquivos/:fileIndex/signed",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runArquivoSignedUrl(req, res, "propostas");
  }),
);

router.get(
  "/propostas/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runDetail(req, res, "propostas");
  }),
);

router.get(
  "/propostas",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runList(req, res, "propostas", SELECT_PROPOSTA, SEARCH_PROPOSTA);
  }),
);

router.get(
  "/ocorrencias/:id/arquivos/:fileIndex/signed",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runArquivoSignedUrl(req, res, "ocorrencias");
  }),
);

router.get(
  "/ocorrencias/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runDetail(req, res, "ocorrencias");
  }),
);

router.get(
  "/ocorrencias",
  authenticateToken,
  asyncHandler(async (req, res) => {
    return runList(req, res, "ocorrencias", SELECT_OCORRENCIA, SEARCH_OCORRENCIA);
  }),
);

export default router;
