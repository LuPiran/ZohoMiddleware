import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";
import { ENV } from "../config/env.js";

const router = express.Router();

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
        fotoUsuario = `${protocol}://${host}/api/auth/user-photo/${usuario.id}`;
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

export default router;
