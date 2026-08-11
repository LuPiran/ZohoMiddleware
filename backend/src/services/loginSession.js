import { ENV } from "../config/env.js";
import { generateToken } from "./jwtService.js";
import { chamarZohoApi } from "./zohoApi.js";
import { logSecurityEvent } from "../utils/security.js";

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

  res.json({
    success: true,
    message: "Login realizado com sucesso",
    token,
    usuario: {
      id: usuario.id,
      email: usuario.Email || usuario.email,
      nome: nomeUsuario || usuario.Email || usuario.email,
      foto: fotoUsuario,
      ...usuarioLimpo,
    },
  });

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
