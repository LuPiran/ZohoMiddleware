import { ENV } from "../config/env.js";
import { generateToken } from "./jwtService.js";
import { chamarZohoApi } from "./zohoApi.js";
import { logSecurityEvent } from "../utils/security.js";
import { syncConsultorZohoPerfil } from "./consultores.js";

/**
 * Extrai as permissões de formulários do objeto Zoho.
 * Tenta todas as variações possíveis de nome de campo (Zoho substitui acentos por "_").
 * Retorna array de strings brutas (ex: ["Compra", "Recompra", "Tracking de Pedidos"]).
 */
function extrairPermissoesFormulariosZoho(usuario) {
  if (!usuario || typeof usuario !== "object") return [];

  // Candidatos com e sem acento no nome da API do Zoho:
  //   "Permissões formulários" → Permiss_es_formul_rios
  //   "Permissões formularios" → Permiss_es_formularios
  //   "Permissoes formularios" → Permissoes_formularios
  const CANDIDATOS = [
    "Permiss_es_formul_rios",   // Permissões formulários (ambos com acento)
    "Permiss_es_formularios",    // Permissões formularios
    "Permissoes_formularios",    // Permissoes formularios
    "Permissoes_formulario",
    "Permiss_oes_formularios",
    "Permiss_oes_formul_rios",
  ];

  // 1. Busca exata pelos candidatos
  for (const candidato of CANDIDATOS) {
    const valor = usuario[candidato];
    if (valor !== undefined && valor !== null && valor !== "") {
      return normalizarValorMultiselect(valor);
    }
  }

  // 2. Fallback: varre todas as chaves do objeto procurando por "permiss" + "formulari"
  const normChave = (k) =>
    String(k)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");

  for (const [chave, valor] of Object.entries(usuario)) {
    const n = normChave(chave);
    if (
      n.startsWith("permiss") &&
      (n.includes("formulari") || n.includes("formulri"))
    ) {
      if (valor !== undefined && valor !== null && valor !== "") {
        return normalizarValorMultiselect(valor);
      }
    }
  }

  return [];
}

function normalizarValorMultiselect(valor) {
  if (Array.isArray(valor)) {
    return valor
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item.trim();
        if (typeof item === "object") {
          return String(item.value || item.label || item.name || item.nome || "").trim();
        }
        return String(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof valor === "string") {
    return valor.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof valor === "object" && valor !== null) {
    const v = String(valor.value || valor.label || valor.name || "").trim();
    return v ? [v] : [];
  }
  return [];
}

/**
 * Interpreta o campo de status Ativo do usuário Zoho.
 * @param {Object} usuario
 * @returns {boolean}
 */
export function isUsuarioAtivo(usuario) {
  const campoStatus = process.env.ZOHO_STATUS_FIELD || "Ativo";
  const statusUsuario =
    usuario[campoStatus] !== undefined
      ? usuario[campoStatus]
      : usuario.Status !== undefined
        ? usuario.Status
        : usuario.status !== undefined
          ? usuario.status
          : true;

  if (typeof statusUsuario === "boolean") {
    return statusUsuario;
  }

  if (typeof statusUsuario === "string") {
    const statusLower = statusUsuario.toLowerCase();
    return (
      statusLower === "true" ||
      statusLower === "ativo" ||
      statusLower === "active" ||
      statusLower === "1"
    );
  }

  return Boolean(statusUsuario);
}

function extrairNomeUsuario(usuario) {
  const campoNome = process.env.ZOHO_NOME_FIELD || "Nome";
  return (
    usuario[campoNome] ||
    usuario.Nome ||
    usuario.Name ||
    usuario.nome ||
    usuario.name ||
    usuario.Nome_Completo ||
    usuario.nome_completo ||
    usuario.Full_Name ||
    usuario.full_name ||
    ""
  );
}

function isZohoHash(valor) {
  if (typeof valor !== "string") return false;
  return /^[a-f0-9]{50,}$/i.test(valor.trim());
}

function construirUrlImagemZoho(hash, recordId, moduleName) {
  if (!hash || !recordId || !moduleName) return null;

  try {
    const baseUrl =
      ENV.ZOHO_API_BASE?.replace(/\/$/, "") || "https://www.zohoapis.com";
    const apiBase = baseUrl.replace("zohoapi.com", "zohoapis.com");
    return `${apiBase}/crm/v2/${moduleName}/${recordId}/photo`;
  } catch (error) {
    console.error("[LOGIN SESSION] Erro ao construir URL da imagem:", error);
    return null;
  }
}

function extrairUrlImagem(campo, usuario) {
  if (!campo) return null;

  if (typeof campo === "string") {
    const valorLimpo = campo.trim();

    if (
      valorLimpo.startsWith("http://") ||
      valorLimpo.startsWith("https://")
    ) {
      return valorLimpo;
    }

    if (isZohoHash(valorLimpo)) {
      const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
      return construirUrlImagemZoho(valorLimpo, usuario.id, moduleName);
    }

    return valorLimpo || null;
  }

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

    const hash = campo.id || campo.hash || campo.file_id || campo.fileId;
    if (hash && typeof hash === "string" && isZohoHash(hash)) {
      const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
      return construirUrlImagemZoho(hash, usuario.id, moduleName);
    }
  }

  return null;
}

function resolverFotoUsuario(usuario) {
  const campoUrlImagemPerfil = "Url_de_imagem_perfil";
  const urlImagemPerfilExistente = usuario[campoUrlImagemPerfil];
  let fotoUsuario = null;

  if (
    urlImagemPerfilExistente &&
    typeof urlImagemPerfilExistente === "string"
  ) {
    const urlLimpa = urlImagemPerfilExistente.trim();
    if (urlLimpa.startsWith("http://") || urlLimpa.startsWith("https://")) {
      fotoUsuario = urlLimpa;
    }
  }

  if (!fotoUsuario) {
    const campoFoto = process.env.ZOHO_FOTO_FIELD || "Record_Image";

    fotoUsuario =
      extrairUrlImagem(campoFoto && usuario[campoFoto], usuario) ||
      extrairUrlImagem(usuario.Record_Image, usuario) ||
      extrairUrlImagem(usuario.record_image, usuario) ||
      extrairUrlImagem(usuario.Photo, usuario) ||
      extrairUrlImagem(usuario.photo, usuario) ||
      extrairUrlImagem(usuario.Avatar, usuario) ||
      extrairUrlImagem(usuario.avatar, usuario) ||
      extrairUrlImagem(usuario.Profile_Picture, usuario) ||
      extrairUrlImagem(usuario.profile_picture, usuario) ||
      extrairUrlImagem(usuario.Imagem, usuario) ||
      extrairUrlImagem(usuario.imagem, usuario) ||
      extrairUrlImagem(usuario.Foto, usuario) ||
      extrairUrlImagem(usuario.foto, usuario) ||
      extrairUrlImagem(usuario.Photo_URL, usuario) ||
      extrairUrlImagem(usuario.photo_url, usuario) ||
      extrairUrlImagem(usuario.Avatar_URL, usuario) ||
      extrairUrlImagem(usuario.avatar_url, usuario) ||
      extrairUrlImagem(usuario.Image, usuario) ||
      extrairUrlImagem(usuario.image, usuario) ||
      null;

    if (!fotoUsuario) {
      const camposComHash = Object.entries(usuario).find(([, value]) => {
        return typeof value === "string" && isZohoHash(value);
      });

      if (camposComHash) {
        const [, hash] = camposComHash;
        const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
        fotoUsuario = construirUrlImagemZoho(hash, usuario.id, moduleName);
      }
    }
  }

  return {
    fotoUsuario,
    urlImagemPerfilExistente,
    campoUrlImagemPerfil,
  };
}

function montarCamposAcesso() {
  const campoUltimoLogin = String(ENV.ZOHO_ULTIMO_LOGIN_FIELD || "").trim();
  const campoUltimoAcesso = ENV.ZOHO_ULTIMO_ACESSO_FIELD || "Ultimo_acesso";

  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const ano = agora.getFullYear();
  const dataUltimoLogin = `${ano}-${mes}-${dia}`;
  const timezoneOffsetMinutes = -agora.getTimezoneOffset();
  const timezoneSign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const timezoneHours = String(
    Math.floor(Math.abs(timezoneOffsetMinutes) / 60),
  ).padStart(2, "0");
  const timezoneMinutes = String(Math.abs(timezoneOffsetMinutes) % 60).padStart(
    2,
    "0",
  );
  const dataHoraUltimoAcesso = `${ano}-${mes}-${dia}T${String(
    agora.getHours(),
  ).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}:${String(
    agora.getSeconds(),
  ).padStart(2, "0")}${timezoneSign}${timezoneHours}:${timezoneMinutes}`;

  const camposAcesso = {
    [campoUltimoAcesso]: dataHoraUltimoAcesso,
  };

  if (campoUltimoLogin) {
    camposAcesso[campoUltimoLogin] = dataUltimoLogin;
  }

  return {
    camposAcesso,
    campoUltimoLogin,
    campoUltimoAcesso,
    dataHoraUltimoAcesso,
  };
}

function validarAtualizacaoZoho(updateResponse) {
  const resultado = updateResponse?.data?.[0];
  if (resultado?.status === "error") {
    throw new Error(
      `${resultado.message || "Erro ao atualizar registro no Zoho"} (${resultado.details?.api_name || "campo desconhecido"})`,
    );
  }
}

function toProxyPhotoUrl(req, usuarioId, fotoUsuario, accessToken) {
  if (
    fotoUsuario &&
    fotoUsuario.includes("/crm/v2/") &&
    fotoUsuario.includes("/photo")
  ) {
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${ENV.PORT || 3000}`;
    const tokenQuery = accessToken
      ? `?access=${encodeURIComponent(accessToken)}`
      : "";
    return `${protocol}://${host}/v1/auth/user-photo/${usuarioId}${tokenQuery}`;
  }
  return fotoUsuario;
}

/**
 * Finaliza login do portal: checa Ativo, gera JWT, atualiza acesso/foto e responde.
 * @returns {Promise<boolean>} true se respondeu; false se bloqueou por inativo
 */
export async function completarLoginPortal(req, res, usuario, identityLabel) {
  const clientIp = req.ip || req.connection.remoteAddress;
  const emailLog =
    identityLabel ||
    usuario.Email ||
    usuario.email ||
    usuario.id ||
    "desconhecido";

  if (!isUsuarioAtivo(usuario)) {
    logSecurityEvent(emailLog, clientIp, false);
    console.log("[AUTH ROUTE] ✗ Login bloqueado: usuário inativo");
    res.status(403).json({
      success: false,
      error: "Usuário inativo. Entre em contato com o administrador.",
    });
    return false;
  }

  logSecurityEvent(emailLog, clientIp, true);
  console.log("[AUTH ROUTE] ✓ Login realizado com sucesso");
  console.log("[AUTH ROUTE] Usuário ID:", usuario.id);

  const token = generateToken(usuario);
  const nomeUsuario = extrairNomeUsuario(usuario);
  let { fotoUsuario, urlImagemPerfilExistente, campoUrlImagemPerfil } =
    resolverFotoUsuario(usuario);

  const usuarioLimpo = Object.fromEntries(
    Object.entries(usuario).filter(
      ([key]) =>
        ![
          "Senha",
          "Password",
          "senha",
          "password",
          "Senha_Password",
          "senha_password",
        ].includes(key),
    ),
  );

  const moduleName = ENV.ZOHO_MODULE_NAME || "CustomModule45";
  const {
    camposAcesso,
    campoUltimoLogin,
    campoUltimoAcesso,
    dataHoraUltimoAcesso,
  } = montarCamposAcesso();

  let ultimoLoginJaAtualizado = false;

  if (fotoUsuario && !urlImagemPerfilExistente) {
    try {
      let fotoFinal = toProxyPhotoUrl(req, usuario.id, fotoUsuario, token);

      const updateData = {
        data: [
          {
            id: usuario.id,
            [campoUrlImagemPerfil]: fotoFinal,
            ...camposAcesso,
          },
        ],
      };

      const updateResponse = await chamarZohoApi(
        "PUT",
        `/${moduleName}`,
        updateData,
      );
      validarAtualizacaoZoho(updateResponse);

      fotoUsuario = fotoFinal;
      ultimoLoginJaAtualizado = true;
    } catch (error) {
      console.error(
        "[AUTH ROUTE] ⚠️ Erro ao salvar URL da imagem no Zoho:",
        error.message,
      );
      fotoUsuario = toProxyPhotoUrl(req, usuario.id, fotoUsuario, token);
    }
  } else if (fotoUsuario && urlImagemPerfilExistente) {
    // Se a URL salva for proxy sem token (legado), reescreve com token atual
    const urlSalva = urlImagemPerfilExistente.trim();
    if (urlSalva.includes("/v1/auth/user-photo/")) {
      fotoUsuario = toProxyPhotoUrl(
        req,
        usuario.id,
        `/crm/v2/x/${usuario.id}/photo`,
        token,
      );
    } else {
      fotoUsuario = urlSalva;
    }
  } else if (fotoUsuario) {
    fotoUsuario = toProxyPhotoUrl(req, usuario.id, fotoUsuario, token);
  }

  if (!ultimoLoginJaAtualizado) {
    try {
      const updateUltimoLoginData = {
        data: [
          {
            id: usuario.id,
            ...camposAcesso,
          },
        ],
      };

      console.log(
        "[AUTH ROUTE] Atualizando",
        campoUltimoAcesso,
        campoUltimoLogin ? `e ${campoUltimoLogin}` : "",
        "com",
        dataHoraUltimoAcesso,
      );
      const updateResponse = await chamarZohoApi(
        "PUT",
        `/${moduleName}`,
        updateUltimoLoginData,
      );
      validarAtualizacaoZoho(updateResponse);
    } catch (error) {
      console.error(
        "[AUTH ROUTE] ⚠️ Erro ao atualizar último acesso:",
        error.message,
      );
    }
  }

  const permissoesFormularios = extrairPermissoesFormulariosZoho(usuario);
  console.log(
    "[AUTH ROUTE] Permissões formulários:",
    permissoesFormularios.length ? permissoesFormularios.join(", ") : "(nenhuma)",
  );

  res.json({
    success: true,
    message: "Login realizado com sucesso",
    token,
    usuario: {
      id: usuario.id,
      email: usuario.Email || usuario.email,
      nome: nomeUsuario || usuario.Email || usuario.email,
      foto: fotoUsuario,
      permissoesFormularios,   // array limpo já extraído — frontend usa isso primeiro
      ...usuarioLimpo,
    },
  });

  // Fire-and-forget: mantém portal_consultores em sincronia com o perfil do Zoho.
  // Nunca bloqueia a resposta — falhas são apenas logadas.
  void syncConsultorZohoPerfil(
    usuario.Email || usuario.email,
    usuario,
  ).catch((err) =>
    console.warn("[SYNC PERFIL] Erro inesperado no login sync:", err.message),
  );

  return true;
}

export function formatAuthError(error) {
  const zohoError = error.response?.data;
  let errorMessage =
    error.message || "Erro ao processar login. Tente novamente mais tarde.";

  if (zohoError?.code === "INVALID_MODULE") {
    errorMessage =
      "Módulo não encontrado no Zoho CRM. Verifique se o nome do módulo está correto na configuração ZOHO_MODULE_NAME.";
  } else if (zohoError?.message) {
    errorMessage = zohoError.message;
  }

  return {
    success: false,
    error: errorMessage,
    details:
      ENV.NODE_ENV !== "production"
        ? {
            zohoCode: zohoError?.code,
            zohoMessage: zohoError?.message,
            fullError: error.message,
            code: error.code,
          }
        : undefined,
  };
}
