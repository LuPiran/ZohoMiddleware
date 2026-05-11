import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";
import { ENV } from "../config/env.js";
import { authenticateToken } from "../services/jwtService.js";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";

const router = express.Router();

const VALID_TIPOS = ["Admin", "Consultor", "Gerente", "Diretoria"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_REGEX = /[^A-Za-z0-9]/;

function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  return (
    UPPERCASE_REGEX.test(password) &&
    LOWERCASE_REGEX.test(password) &&
    NUMBER_REGEX.test(password) &&
    SPECIAL_REGEX.test(password)
  );
}

function normalizeEmail(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

/**
 * E-mails possíveis a partir do JWT (nem todo access token traz `email` no topo).
 */
function collectEmailsFromJwtPayload(user) {
  if (!user) return [];
  const set = new Set();
  const add = (v) => {
    const n = normalizeEmail(v);
    if (n) set.add(n);
  };
  add(user.email);
  add(user.Email);
  const meta = user.user_metadata || {};
  add(meta.email);
  add(meta.Email);
  add(meta.preferred_username);
  return [...set];
}

function isAdminTipoForCreateUsers(tipo) {
  const t = String(tipo ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  // Mesmo perfil do painel: "Admin" ou variação "Admin Painel" no banco.
  return t === "admin" || t === "admin painel";
}

/**
 * Linhas vindas do PostgREST podem usar `tipo` ou `Tipo` (PostgreSQL com aspas).
 */
function readProfileTipo(row) {
  if (!row || typeof row !== "object") return null;
  const v =
    row.tipo ??
    row.Tipo ??
    row.TIPO ??
    row.perfil ??
    row.Perfil;
  return v == null ? null : v;
}

const TABLE_CANDIDATES = ["Usuario", "usuario", "users", "Usuarios", "usuarios"];
const SUPABASE_ID_COLS = ["supabase_id", "supabase_user_id", "Supabase_Id"];
const EMAIL_COLS = ["email", "Email"];

async function getAdminProfileByRequest(req) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const userId = req.user?.sub || req.user?.id;
  let emails = collectEmailsFromJwtPayload(req.user);

  // Fonte confiável quando o JWT omite e-mail: Auth Admin pelo sub (UUID do Supabase).
  if (userId) {
    const { data: authLookup, error: authLookupError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (!authLookupError && authLookup?.user?.email) {
      const n = normalizeEmail(authLookup.user.email);
      if (n) emails = [...new Set([...emails, n])];
    }
  }

  for (const tableName of TABLE_CANDIDATES) {
    if (userId) {
      for (const idCol of SUPABASE_ID_COLS) {
        const byId = await supabaseAdmin
          .from(tableName)
          .select("*")
          .eq(idCol, userId)
          .maybeSingle();
        if (!byId.error && byId.data) {
          return byId.data;
        }
      }
    }

    for (const em of emails) {
      for (const emailCol of EMAIL_COLS) {
        const byEq = await supabaseAdmin
          .from(tableName)
          .select("*")
          .eq(emailCol, em)
          .maybeSingle();
        if (!byEq.error && byEq.data) {
          return byEq.data;
        }

        const byIlike = await supabaseAdmin
          .from(tableName)
          .select("*")
          .ilike(emailCol, em)
          .maybeSingle();
        if (!byIlike.error && byIlike.data) {
          return byIlike.data;
        }
      }
    }
  }

  return null;
}

/**
 * Diagnóstico: o que o backend enxerga do JWT + Auth Admin + linha na tabela (para depurar 403 ao criar usuário).
 * GET /v1/users/me-profile
 */
router.get("/me-profile", authenticateToken, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const userId = req.user?.sub || req.user?.id;
    let authLookupEmail = null;
    let authLookupError = null;
    if (supabaseAdmin && userId) {
      const r = await supabaseAdmin.auth.admin.getUserById(userId);
      authLookupEmail = r.data?.user?.email ?? null;
      authLookupError = r.error?.message ?? null;
    }
    const profile = await getAdminProfileByRequest(req);
    const tipo = readProfileTipo(profile);
    return res.json({
      success: true,
      jwtSub: userId ?? null,
      jwtEmailClaim: req.user?.email ?? null,
      emailsFromJwt: collectEmailsFromJwtPayload(req.user),
      authAdminEmail: authLookupEmail,
      authAdminError: authLookupError,
      profileFound: !!profile,
      profileTipo: tipo ?? null,
      canCreate: !!profile && isAdminTipoForCreateUsers(tipo),
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message || "Erro ao inspecionar perfil",
    });
  }
});

/**
 * Rota para buscar usuários do módulo Zoho
 * GET /api/users
 * Query params: page (opcional), per_page (opcional), search (opcional)
 */
router.get("/", async (req, res) => {
  try {
    const moduleName = ENV.ZOHO_MODULE_NAME || "CustomModule45";
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 10;
    const search = req.query.search?.trim() || "";

    // Calcula offset para paginação
    const offset = (page - 1) * perPage;

    // Constrói o endpoint com paginação
    let endpoint = `/${moduleName}?page=${page}&per_page=${perPage}`;

    // Se houver busca, adiciona critério
    if (search) {
      const campoEmail = ENV.ZOHO_EMAIL_FIELD || "Email";
      const campoNome = ENV.ZOHO_NAME_FIELD || "Nome";

      // Busca por email ou nome (case-insensitive)
      const criteria = `(${campoEmail}:contains:${search}) OR (${campoNome}:contains:${search})`;
      endpoint += `&criteria=${encodeURIComponent(criteria)}`;
    }

    console.log("[USERS API] Buscando usuários:", {
      moduleName,
      page,
      perPage,
      offset,
      search,
      endpoint,
    });

    const response = await chamarZohoApi("GET", endpoint);

    // Formata a resposta
    const usuarios = response.data || [];
    const info = response.info || {};

    // Função auxiliar para detectar hash do Zoho
    const isZohoHash = (str) => {
      if (!str || typeof str !== "string") return false;
      // Hash do Zoho geralmente tem 60+ caracteres alfanuméricos
      return /^[a-f0-9]{60,}$/i.test(str.trim());
    };

    // Função auxiliar para construir URL da imagem do Zoho
    const construirUrlImagemZoho = (hash, userId, moduleName) => {
      if (!hash || !userId || !moduleName) return null;
      const baseUrl =
        ENV.ZOHO_API_BASE?.replace(/\/$/, "") || "https://www.zohoapis.com";
      const apiBase = baseUrl.replace("zohoapi.com", "zohoapis.com");
      return `${apiBase}/crm/v2/${moduleName}/${userId}/photo`;
    };

    // Função auxiliar para extrair URL da imagem (recebe userId como parâmetro)
    const extrairUrlImagem = (campo, userId) => {
      if (!campo) return null;

      // Se for string
      if (typeof campo === "string") {
        const valorLimpo = campo.trim();

        // Se já for uma URL completa (http/https), retorna direto
        if (
          valorLimpo.startsWith("http://") ||
          valorLimpo.startsWith("https://")
        ) {
          return valorLimpo;
        }

        // Se for um hash do Zoho, constrói a URL
        if (isZohoHash(valorLimpo)) {
          const moduleName = ENV.ZOHO_MODULE_NAME || "CustomModule45";
          return construirUrlImagemZoho(valorLimpo, userId, moduleName);
        }

        return valorLimpo || null;
      }

      // Se for objeto, tenta extrair a URL
      if (typeof campo === "object") {
        const urlDireta =
          campo.url ||
          campo.URL ||
          campo.download_url ||
          campo.downloadUrl ||
          campo.link ||
          campo.Link ||
          campo.src ||
          campo.Src;
        if (urlDireta) {
          return typeof urlDireta === "string" ? urlDireta.trim() : null;
        }

        // Se tiver um campo id ou hash, tenta construir a URL
        const hash = campo.id || campo.hash || campo.file_id || campo.fileId;
        if (hash && typeof hash === "string" && isZohoHash(hash)) {
          const moduleName = ENV.ZOHO_MODULE_NAME || "CustomModule45";
          return construirUrlImagemZoho(hash, userId, moduleName);
        }

        return null;
      }

      return null;
    };

    // Formata cada usuário para o frontend
    const usuariosFormatados = usuarios.map((usuario) => {
      const campoEmail = ENV.ZOHO_EMAIL_FIELD || "Email";
      const campoNome = ENV.ZOHO_NAME_FIELD || "Nome";
      const campoStatus = ENV.ZOHO_STATUS_FIELD || "Ativo";
      const campoUrlImagemPerfil = "Url_de_imagem_perfil";
      const campoFoto = ENV.ZOHO_FOTO_FIELD || "Record_Image";

      // Obtém o valor do campo de status (pode ser boolean ou string)
      const statusValue =
        usuario[campoStatus] !== undefined
          ? usuario[campoStatus]
          : usuario.Status !== undefined
            ? usuario.Status
            : usuario.status !== undefined
              ? usuario.status
              : true; // Padrão: ativo

      // Converte boolean para string "ativo" ou "inativo"
      let statusString = "ativo";
      if (typeof statusValue === "boolean") {
        statusString = statusValue ? "ativo" : "inativo";
      } else if (typeof statusValue === "string") {
        const statusLower = statusValue.toLowerCase();
        statusString =
          statusLower === "true" ||
          statusLower === "ativo" ||
          statusLower === "active" ||
          statusLower === "1"
            ? "ativo"
            : "inativo";
      }

      // Processa a foto do usuário
      let fotoUsuario = null;

      // Primeiro tenta o campo Url_de_imagem_perfil (já processado)
      if (usuario[campoUrlImagemPerfil]) {
        fotoUsuario = extrairUrlImagem(
          usuario[campoUrlImagemPerfil],
          usuario.id,
        );
      }

      // Se não encontrou, tenta outros campos comuns
      if (!fotoUsuario) {
        const camposImagem = [
          campoFoto,
          "Record_Image",
          "record_image",
          "Photo",
          "photo",
          "Avatar",
          "avatar",
          "Profile_Picture",
          "profile_picture",
          "Imagem",
          "imagem",
          "Foto",
          "foto",
        ];

        for (const campo of camposImagem) {
          if (usuario[campo]) {
            fotoUsuario = extrairUrlImagem(usuario[campo], usuario.id);
            if (fotoUsuario) break;
          }
        }
      }

      // Se encontrou uma URL do Zoho que requer autenticação, cria proxy URL
      if (
        fotoUsuario &&
        fotoUsuario.includes("/crm/v2/") &&
        fotoUsuario.includes("/photo")
      ) {
        const protocol = req.protocol || "http";
        const host = req.get("host") || `localhost:${ENV.PORT || 3000}`;
        fotoUsuario = `${protocol}://${host}/v1/auth/user-photo/${usuario.id}`;
      }

      return {
        id: usuario.id,
        nome:
          usuario[campoNome] ||
          usuario.Nome ||
          usuario.Name ||
          usuario.nome ||
          "",
        email: usuario[campoEmail] || usuario.Email || usuario.email || "",
        status: statusString, // Sempre retorna string "ativo" ou "inativo"
        statusBoolean:
          typeof statusValue === "boolean"
            ? statusValue
            : statusString === "ativo", // Mantém o valor boolean original
        foto: fotoUsuario, // Foto processada do usuário
        criado: usuario.Created_Time || usuario.created_time || null,
        modificado: usuario.Modified_Time || usuario.modified_time || null,
        // Mantém todos os dados originais para uso futuro, incluindo foto
        raw: {
          ...usuario,
          foto: fotoUsuario, // Adiciona foto processada ao raw também
        },
      };
    });

    res.json({
      success: true,
      data: usuariosFormatados,
      pagination: {
        page: page,
        perPage: perPage,
        total: info.count || usuarios.length,
        totalPages: Math.ceil((info.count || usuarios.length) / perPage),
      },
    });
  } catch (error) {
    console.error("[USERS API] Erro ao buscar usuários:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao buscar usuários",
    });
  }
});

/**
 * Rota para alternar o status do usuário (ativo/inativo)
 * PUT /api/users/:id/toggle-status
 * Body: { status: boolean }
 */
router.put("/:id/toggle-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const moduleName = ENV.ZOHO_MODULE_NAME || "CustomModule45";
    const campoStatus = ENV.ZOHO_STATUS_FIELD || "Ativo";

    console.log("[USERS API] Alternando status do usuário:", {
      userId: id,
      newStatus: status,
      campoStatus,
    });

    // Atualiza o registro no Zoho
    const updateData = {
      data: [
        {
          id: id,
          [campoStatus]: status, // true = ativo, false = inativo
        },
      ],
    };

    const endpoint = `/${moduleName}`;
    const response = await chamarZohoApi("PUT", endpoint, updateData);

    console.log("[USERS API] ✓ Status atualizado com sucesso");

    res.json({
      success: true,
      message: status
        ? "Usuário ativado com sucesso"
        : "Usuário desativado com sucesso",
      data: {
        id,
        status,
      },
    });
  } catch (error) {
    console.error("[USERS API] Erro ao alternar status do usuário:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao alterar status do usuário",
    });
  }
});

/**
 * Rota para criar usuário no Supabase Auth + tabela Usuario
 * POST /v1/users
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { nome, email, senha, tipo } = req.body || {};

    if (!nome?.trim() || !email?.trim() || !senha || !tipo?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Todos os campos obrigatórios devem ser preenchidos",
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Email inválido",
      });
    }

    if (!VALID_TIPOS.includes(tipo.trim())) {
      return res.status(400).json({
        success: false,
        error: "Tipo de usuário inválido",
      });
    }

    if (!isStrongPassword(senha)) {
      return res.status(400).json({
        success: false,
        error:
          "Senha fraca. Use no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial",
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: "Configuração do Supabase Admin não encontrada no backend",
      });
    }

    const requesterProfile = await getAdminProfileByRequest(req);
    const requesterTipo = readProfileTipo(requesterProfile);
    if (!requesterProfile) {
      return res.status(403).json({
        success: false,
        error:
          "Perfil não encontrado na tabela de usuários para este login. Confira se o e-mail e o supabase_id batem com o Supabase Auth.",
        code: "PROFILE_NOT_FOUND",
      });
    }
    if (!isAdminTipoForCreateUsers(requesterTipo)) {
      return res.status(403).json({
        success: false,
        error: "Apenas Admin pode criar usuários",
        code: "TIPO_NAO_ADMIN",
        tipoLido: requesterTipo ?? null,
      });
    }

    const emailNormalized = email.trim().toLowerCase();
    const nomeNormalized = nome.trim();
    const tipoNormalized = tipo.trim();

    // Evita duplicidade no perfil de usuário.
    const existingProfile = await supabaseAdmin
      .from("Usuario")
      .select("id")
      .eq("email", emailNormalized)
      .maybeSingle();
    if (existingProfile.data) {
      return res.status(409).json({
        success: false,
        error: "Este e-mail já está cadastrado",
      });
    }

    const createdAuthUser = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalized,
      password: senha,
      email_confirm: true,
      user_metadata: {
        name: nomeNormalized,
      },
    });

    if (createdAuthUser.error || !createdAuthUser.data?.user?.id) {
      const authErrorMessage =
        createdAuthUser.error?.message || "Erro ao criar usuário no Supabase Auth";
      const duplicateEmail =
        authErrorMessage.toLowerCase().includes("already") ||
        authErrorMessage.toLowerCase().includes("exists") ||
        authErrorMessage.toLowerCase().includes("registered");

      return res.status(duplicateEmail ? 409 : 500).json({
        success: false,
        error: duplicateEmail
          ? "Este e-mail já está cadastrado"
          : authErrorMessage,
      });
    }

    const authUserId = createdAuthUser.data.user.id;

    const insertedUser = await supabaseAdmin
      .from("Usuario")
      .insert({
        supabase_id: authUserId,
        nome: nomeNormalized,
        email: emailNormalized,
        tipo: tipoNormalized,
        ativo: true,
      })
      .select("id, supabase_id, nome, email, tipo, ativo, created_at, updated_at")
      .single();

    if (insertedUser.error || !insertedUser.data) {
      // Rollback auth user se falhar na tabela de perfil
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return res.status(500).json({
        success: false,
        error: insertedUser.error?.message || "Erro ao salvar perfil do usuário",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: insertedUser.data,
    });
  } catch (error) {
    console.error("[USERS API] Erro ao criar usuário:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao criar usuário",
    });
  }
});

/**
 * Atualiza perfil na tabela Usuario + Auth (e-mail / senha / nome) quando aplicável
 * PATCH /v1/users/:id
 */
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = req.params;
    const { nome, email, tipo, senha } = req.body || {};

    if (!nome?.trim() || !email?.trim() || !tipo?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Nome, e-mail e tipo são obrigatórios",
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Email inválido",
      });
    }

    if (!VALID_TIPOS.includes(tipo.trim())) {
      return res.status(400).json({
        success: false,
        error: "Tipo de usuário inválido",
      });
    }

    if (senha && !isStrongPassword(senha)) {
      return res.status(400).json({
        success: false,
        error:
          "Senha fraca. Use no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial",
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: "Configuração do Supabase Admin não encontrada no backend",
      });
    }

    const requesterProfile = await getAdminProfileByRequest(req);
    const requesterTipo = readProfileTipo(requesterProfile);
    if (!requesterProfile) {
      return res.status(403).json({
        success: false,
        error:
          "Perfil não encontrado na tabela de usuários para este login. Confira se o e-mail e o supabase_id batem com o Supabase Auth.",
        code: "PROFILE_NOT_FOUND",
      });
    }
    if (!isAdminTipoForCreateUsers(requesterTipo)) {
      return res.status(403).json({
        success: false,
        error: "Apenas Admin pode editar usuários",
        code: "TIPO_NAO_ADMIN",
        tipoLido: requesterTipo ?? null,
      });
    }

    const tableCandidates = ["Usuario", "usuario", "users"];
    let targetRow = null;
    let tableUsed = "Usuario";

    for (const tableName of tableCandidates) {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select("id, supabase_id, nome, email, tipo, ativo")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        targetRow = data;
        tableUsed = tableName;
        break;
      }
    }

    if (!targetRow) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    if (String(readProfileTipo(targetRow) || "")
      .trim()
      .toLowerCase() === "admin") {
      return res.status(403).json({
        success: false,
        error: "Não é permitido editar usuário Admin por esta rota",
      });
    }

    if (!targetRow.supabase_id) {
      return res.status(400).json({
        success: false,
        error: "Usuário sem supabase_id vinculado; não é possível sincronizar com o Auth",
      });
    }

    const emailNormalized = email.trim().toLowerCase();
    const nomeNormalized = nome.trim();
    const tipoNormalized = tipo.trim();

    const currentEmail = normalizeEmail(
      targetRow.email || targetRow.Email || "",
    );
    if (emailNormalized !== currentEmail) {
      const dup = await supabaseAdmin
        .from(tableUsed)
        .select("id")
        .eq("email", emailNormalized)
        .neq("id", id)
        .maybeSingle();
      if (dup.data) {
        return res.status(409).json({
          success: false,
          error: "Este e-mail já está em uso por outro usuário",
        });
      }
    }

    const authPayload = {
      user_metadata: { name: nomeNormalized },
    };
    if (emailNormalized !== currentEmail) {
      authPayload.email = emailNormalized;
    }
    if (senha) {
      authPayload.password = senha;
    }

    const authUpd = await supabaseAdmin.auth.admin.updateUserById(
      targetRow.supabase_id,
      authPayload,
    );

    if (authUpd.error) {
      return res.status(500).json({
        success: false,
        error: authUpd.error.message || "Erro ao atualizar usuário no Supabase Auth",
      });
    }

    const dbUpd = await supabaseAdmin
      .from(tableUsed)
      .update({
        nome: nomeNormalized,
        email: emailNormalized,
        tipo: tipoNormalized,
      })
      .eq("id", id)
      .select("id, supabase_id, nome, email, tipo, ativo, created_at, updated_at")
      .single();

    if (dbUpd.error || !dbUpd.data) {
      return res.status(500).json({
        success: false,
        error: dbUpd.error?.message || "Erro ao atualizar perfil no banco",
      });
    }

    return res.json({
      success: true,
      message: "Usuário atualizado com sucesso",
      data: dbUpd.data,
    });
  } catch (error) {
    console.error("[USERS API] Erro ao atualizar usuário:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao atualizar usuário",
    });
  }
});

export default router;
