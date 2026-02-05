import express from "express";
import axios from "axios";
import zohoAuth from "../services/zohoAuth.js";
import { ENV } from "../config/env.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";
import {
  validateLogin,
  handleValidationErrors,
} from "../middleware/validation.js";
import { generateToken } from "../services/jwtService.js";
import {
  comparePassword,
  logSecurityEvent,
  sanitizeInput,
} from "../utils/security.js";
import gerarAcessToken from "../zoho/auth.js";
import { chamarZohoApi } from "../services/zohoApi.js";

const router = express.Router();

/**
 * Rota de login
 * POST /api/auth/login
 * Body: { email: string, senha: string }
 *
 * Proteções aplicadas:
 * - Rate limiting (5 tentativas por 15 minutos)
 * - Validação de entrada
 * - Sanitização de dados
 * - Comparação segura de senhas
 * - JWT para sessão
 * - Logs de segurança
 */
router.post(
  "/login",
  loginRateLimiter, // Rate limiting primeiro
  validateLogin, // Validação de entrada
  handleValidationErrors,
  async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log("[AUTH ROUTE] Nova requisição de login recebida");

    try {
      // Sanitiza e normaliza o email (trim + lowercase)
      const email = sanitizeInput(req.body.email).toLowerCase().trim();
      const senha = req.body.senha; // Senha não deve ser sanitizada (pode ter caracteres especiais)

      console.log("[AUTH ROUTE] Tentando fazer login para:", email);
      console.log("[AUTH ROUTE] Email normalizado:", email);

      // Valida as credenciais no Zoho
      const usuario = await zohoAuth.validarCredenciais(email, senha);

      if (!usuario) {
        logSecurityEvent(email, clientIp, false);
        console.log("[AUTH ROUTE] ✗ Login falhou: credenciais inválidas");
        // Sempre retorna a mesma mensagem para não revelar se o email existe
        return res.status(401).json({
          success: false,
          error: "Email ou senha incorretos",
        });
      }

      // Verifica se o usuário está ativo
      const campoStatus = process.env.ZOHO_STATUS_FIELD || "Ativo";
      const statusUsuario =
        usuario[campoStatus] !== undefined
          ? usuario[campoStatus]
          : usuario.Status !== undefined
            ? usuario.Status
            : usuario.status !== undefined
              ? usuario.status
              : true; // Padrão: ativo se não encontrar o campo

      // Converte para boolean se necessário
      let isAtivo = false;
      if (typeof statusUsuario === "boolean") {
        isAtivo = statusUsuario;
      } else if (typeof statusUsuario === "string") {
        const statusLower = statusUsuario.toLowerCase();
        isAtivo =
          statusLower === "true" ||
          statusLower === "ativo" ||
          statusLower === "active" ||
          statusLower === "1";
      }

      // Se o usuário estiver inativo, bloqueia o login
      if (!isAtivo) {
        logSecurityEvent(email, clientIp, false);
        console.log("[AUTH ROUTE] ✗ Login bloqueado: usuário inativo");
        return res.status(403).json({
          success: false,
          error: "Usuário inativo. Entre em contato com o administrador.",
        });
      }

      logSecurityEvent(email, clientIp, true);
      console.log("[AUTH ROUTE] ✓ Login realizado com sucesso");
      console.log("[AUTH ROUTE] Usuário ID:", usuario.id);
      console.log("[AUTH ROUTE] Status do usuário: ativo");

      // Gera token JWT
      const token = generateToken(usuario);

      // Obtém o nome do usuário (tenta diferentes variações de campos)
      const campoNome = process.env.ZOHO_NOME_FIELD || "Nome";
      const nomeUsuario =
        usuario[campoNome] ||
        usuario.Nome ||
        usuario.Name ||
        usuario.nome ||
        usuario.name ||
        usuario.Nome_Completo ||
        usuario.nome_completo ||
        usuario.Full_Name ||
        usuario.full_name ||
        "";

      // Nome do campo customizado para URL de imagem de perfil
      const campoUrlImagemPerfil = "Url_de_imagem_perfil";

      // PRIMEIRO: Verifica se já existe URL salva no campo Url_de_imagem_perfil
      const urlImagemPerfilExistente = usuario[campoUrlImagemPerfil];
      let fotoUsuario = null;

      if (
        urlImagemPerfilExistente &&
        typeof urlImagemPerfilExistente === "string"
      ) {
        const urlLimpa = urlImagemPerfilExistente.trim();
        // Se for uma URL válida (http/https), usa diretamente
        if (urlLimpa.startsWith("http://") || urlLimpa.startsWith("https://")) {
          fotoUsuario = urlLimpa;
          console.log(
            "[AUTH ROUTE] ✓ URL de imagem de perfil encontrada no campo:",
            campoUrlImagemPerfil,
          );
        }
      }

      // Se não encontrou URL válida no campo Url_de_imagem_perfil, busca a imagem normalmente
      if (!fotoUsuario) {
        console.log(
          "[AUTH ROUTE] Campo",
          campoUrlImagemPerfil,
          "vazio ou inválido, buscando imagem...",
        );

        // Obtém a foto/avatar do usuário (tenta diferentes variações de campos)
        const campoFoto = process.env.ZOHO_FOTO_FIELD || "Record_Image";

        // Função auxiliar para verificar se é um hash do Zoho (hexadecimal longo)
        const isZohoHash = (valor) => {
          if (typeof valor !== "string") return false;
          // Hash do Zoho geralmente tem mais de 50 caracteres e é hexadecimal
          return /^[a-f0-9]{50,}$/i.test(valor.trim());
        };

        // Função auxiliar para construir URL da imagem do Zoho usando o hash
        const construirUrlImagemZoho = (hash, recordId, moduleName) => {
          if (!hash || !recordId || !moduleName) return null;

          try {
            // No Zoho CRM, imagens podem ser acessadas através do endpoint /photo
            // O hash pode ser usado diretamente na URL ou como parâmetro
            const baseUrl =
              ENV.ZOHO_API_BASE?.replace(/\/$/, "") ||
              "https://www.zohoapis.com";
            const apiBase = baseUrl.replace("zohoapi.com", "zohoapis.com");

            // URL padrão do Zoho para fotos de registro
            // Formato: https://www.zohoapis.com/crm/v2/{module}/{record_id}/photo
            const photoUrl = `${apiBase}/crm/v2/${moduleName}/${recordId}/photo`;

            console.log("[AUTH ROUTE] Construindo URL da imagem:", photoUrl);
            return photoUrl;
          } catch (error) {
            console.error(
              "[AUTH ROUTE] Erro ao construir URL da imagem:",
              error,
            );
            return null;
          }
        };

        // Função auxiliar para extrair URL da imagem (pode vir como string ou objeto)
        const extrairUrlImagem = (campo) => {
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
              const moduleName =
                process.env.ZOHO_MODULE_NAME || "CustomModule45";
              const urlConstruida = construirUrlImagemZoho(
                valorLimpo,
                usuario.id,
                moduleName,
              );
              if (urlConstruida) {
                console.log(
                  "[AUTH ROUTE] Hash de imagem detectado:",
                  valorLimpo.substring(0, 20) + "...",
                );
                console.log("[AUTH ROUTE] URL construída:", urlConstruida);
                return urlConstruida;
              }
            }

            return valorLimpo || null;
          }

          // Se for objeto, tenta extrair a URL
          if (typeof campo === "object") {
            // Primeiro tenta campos de URL diretos
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
            const hash =
              campo.id || campo.hash || campo.file_id || campo.fileId;
            if (hash && typeof hash === "string" && isZohoHash(hash)) {
              const moduleName =
                process.env.ZOHO_MODULE_NAME || "CustomModule45";
              return construirUrlImagemZoho(hash, usuario.id, moduleName);
            }

            return null;
          }

          return null;
        };

        // Primeiro tenta o campo configurado, depois tenta variações comuns
        fotoUsuario =
          extrairUrlImagem(campoFoto && usuario[campoFoto]) ||
          extrairUrlImagem(usuario.Record_Image) ||
          extrairUrlImagem(usuario.record_image) ||
          extrairUrlImagem(usuario.Photo) ||
          extrairUrlImagem(usuario.photo) ||
          extrairUrlImagem(usuario.Avatar) ||
          extrairUrlImagem(usuario.avatar) ||
          extrairUrlImagem(usuario.Profile_Picture) ||
          extrairUrlImagem(usuario.profile_picture) ||
          extrairUrlImagem(usuario.Imagem) ||
          extrairUrlImagem(usuario.imagem) ||
          extrairUrlImagem(usuario.Foto) ||
          extrairUrlImagem(usuario.foto) ||
          extrairUrlImagem(usuario.Photo_URL) ||
          extrairUrlImagem(usuario.photo_url) ||
          extrairUrlImagem(usuario.Avatar_URL) ||
          extrairUrlImagem(usuario.avatar_url) ||
          extrairUrlImagem(usuario.Image) ||
          extrairUrlImagem(usuario.image) ||
          null;

        // Se encontrou um hash mas não conseguiu construir URL, tenta buscar a URL real da API do Zoho
        if (!fotoUsuario) {
          // Busca qualquer campo que possa ser um hash de imagem
          const camposComHash = Object.entries(usuario).find(([key, value]) => {
            if (typeof value === "string" && isZohoHash(value)) {
              return true;
            }
            return false;
          });

          if (camposComHash) {
            const [campoNome, hash] = camposComHash;
            console.log("[AUTH ROUTE] Hash encontrado no campo:", campoNome);
            const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
            fotoUsuario = construirUrlImagemZoho(hash, usuario.id, moduleName);
          }
        }
      }

      // Log para debug
      if (fotoUsuario) {
        console.log(
          "[AUTH ROUTE] ✓ Foto do usuário encontrada:",
          fotoUsuario.substring(0, 100),
        );
      } else {
        const camposImagem = Object.keys(usuario).filter((key) => {
          const keyLower = key.toLowerCase();
          return (
            keyLower.includes("photo") ||
            keyLower.includes("image") ||
            keyLower.includes("avatar") ||
            keyLower.includes("foto") ||
            keyLower.includes("imagem") ||
            keyLower.includes("picture")
          );
        });

        if (camposImagem.length > 0) {
          console.log(
            "[AUTH ROUTE] ⚠️ Campos relacionados a imagem encontrados:",
            camposImagem,
          );
          console.log(
            "[AUTH ROUTE] Valores dos campos de imagem:",
            camposImagem.map((key) => ({
              campo: key,
              tipo: typeof usuario[key],
              valor:
                typeof usuario[key] === "object"
                  ? JSON.stringify(usuario[key]).substring(0, 200)
                  : String(usuario[key]).substring(0, 100),
            })),
          );
        } else {
          console.log(
            "[AUTH ROUTE] ⚠️ Nenhum campo relacionado a imagem encontrado nos dados do usuário",
          );
          console.log(
            "[AUTH ROUTE] Todos os campos disponíveis:",
            Object.keys(usuario),
          );
        }
      }

      // Remove campos sensíveis antes de retornar
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

      // Prepara dados para atualização do último login (sempre atualiza)
      const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
      const campoUltimoLogin = "UUltimo_Login";

      // Formata data no formato brasileiro (DD/MM/YYYY)
      const agora = new Date();
      const dia = String(agora.getDate()).padStart(2, "0");
      const mes = String(agora.getMonth() + 1).padStart(2, "0"); // getMonth() retorna 0-11
      const ano = agora.getFullYear();
      const dataHoraAtual = `${dia}/${mes}/${ano}`; // Formato brasileiro: DD/MM/YYYY

      let ultimoLoginJaAtualizado = false; // Flag para evitar atualização duplicada

      // Se encontrou uma foto e ela não está salva no campo Url_de_imagem_perfil, salva no Zoho
      if (fotoUsuario && !urlImagemPerfilExistente) {
        try {
          // Se a foto é uma URL do Zoho que requer autenticação, cria um endpoint proxy
          let fotoFinal = fotoUsuario;
          if (
            fotoUsuario &&
            fotoUsuario.includes("/crm/v2/") &&
            fotoUsuario.includes("/photo")
          ) {
            // Cria URL do endpoint proxy do backend que servirá a imagem autenticada
            const protocol = req.protocol || "http";
            const host = req.get("host") || `localhost:${ENV.PORT || 3000}`;
            fotoFinal = `${protocol}://${host}/api/auth/user-photo/${usuario.id}`;
            console.log(
              "[AUTH ROUTE] URL da foto será servida via proxy:",
              fotoFinal,
            );
          }

          // Atualiza o registro no Zoho salvando a URL no campo Url_de_imagem_perfil
          // Também atualiza o campo UUltimo_Login com a data/hora atual
          const updateData = {
            data: [
              {
                id: usuario.id,
                [campoUrlImagemPerfil]: fotoFinal,
                [campoUltimoLogin]: dataHoraAtual,
              },
            ],
          };

          console.log(
            "[AUTH ROUTE] Salvando URL da imagem no campo",
            campoUrlImagemPerfil,
            "e atualizando",
            campoUltimoLogin,
            "com data:",
            dataHoraAtual,
          );
          console.log(
            "[AUTH ROUTE] Dados de atualização:",
            JSON.stringify(updateData),
          );

          const updateResponse = await chamarZohoApi(
            "PUT",
            `/${moduleName}`,
            updateData,
          );

          console.log(
            "[AUTH ROUTE] ✓ URL da imagem e último login salvos com sucesso",
          );
          console.log(
            "[AUTH ROUTE] Resposta do Zoho:",
            JSON.stringify(updateResponse).substring(0, 200),
          );

          fotoUsuario = fotoFinal;
          ultimoLoginJaAtualizado = true; // Marca que já foi atualizado
        } catch (error) {
          console.error(
            "[AUTH ROUTE] ⚠️ Erro ao salvar URL da imagem no Zoho:",
            error.message,
          );
          console.error(
            "[AUTH ROUTE] Detalhes do erro:",
            error.response?.data || error.message,
          );
          // Continua mesmo se não conseguir salvar, usa a URL encontrada
          // Se a foto é uma URL do Zoho que requer autenticação, cria um endpoint proxy
          if (
            fotoUsuario &&
            fotoUsuario.includes("/crm/v2/") &&
            fotoUsuario.includes("/photo")
          ) {
            const protocol = req.protocol || "http";
            const host = req.get("host") || `localhost:${ENV.PORT || 3000}`;
            fotoUsuario = `${protocol}://${host}/api/auth/user-photo/${usuario.id}`;
          }
        }
      } else if (fotoUsuario && urlImagemPerfilExistente) {
        // Se já existe URL salva, usa ela diretamente
        fotoUsuario = urlImagemPerfilExistente.trim();
      } else if (fotoUsuario) {
        // Se encontrou foto mas não conseguiu salvar, ainda usa a URL encontrada
        // Se a foto é uma URL do Zoho que requer autenticação, cria um endpoint proxy
        if (
          fotoUsuario.includes("/crm/v2/") &&
          fotoUsuario.includes("/photo")
        ) {
          const protocol = req.protocol || "http";
          const host = req.get("host") || `localhost:${ENV.PORT || 3000}`;
          fotoUsuario = `${protocol}://${host}/api/auth/user-photo/${usuario.id}`;
        }
      }

      // SEMPRE atualiza o campo UUltimo_Login após login bem-sucedido
      // (exceto se já foi atualizado junto com a imagem acima)
      if (!ultimoLoginJaAtualizado) {
        try {
          const updateUltimoLoginData = {
            data: [
              {
                id: usuario.id,
                [campoUltimoLogin]: dataHoraAtual,
              },
            ],
          };

          console.log(
            "[AUTH ROUTE] Atualizando campo",
            campoUltimoLogin,
            "com data:",
            dataHoraAtual,
          );
          await chamarZohoApi("PUT", `/${moduleName}`, updateUltimoLoginData);
          console.log(
            "[AUTH ROUTE] ✓ Campo",
            campoUltimoLogin,
            "atualizado com sucesso",
          );
        } catch (error) {
          console.error(
            "[AUTH ROUTE] ⚠️ Erro ao atualizar campo",
            campoUltimoLogin + ":",
            error.message,
          );
          // Continua mesmo se não conseguir atualizar
        }
      }

      // Retorna os dados do usuário (sem a senha) e o token
      res.json({
        success: true,
        message: "Login realizado com sucesso",
        token, // Token JWT para autenticação em requisições futuras
        usuario: {
          id: usuario.id,
          email: usuario.Email || usuario.email,
          nome: nomeUsuario || usuario.Email || usuario.email, // Fallback para email se não tiver nome
          foto: fotoUsuario, // Foto/avatar do usuário (pode ser URL direta ou endpoint proxy)
          // Inclui todos os outros campos do usuário (pode conter campos de imagem adicionais)
          ...usuarioLimpo,
        },
      });
    } catch (error) {
      console.error("[AUTH ROUTE] ✗ ERRO na rota de login:");
      console.error("[AUTH ROUTE] Mensagem:", error.message);
      console.error("[AUTH ROUTE] Stack:", error.stack);
      console.error(
        "[AUTH ROUTE] Response data:",
        error.response?.data || "N/A",
      );
      console.error("[AUTH ROUTE] Status:", error.response?.status || "N/A");

      // Retorna erro com mais detalhes para debug (em desenvolvimento)
      const zohoError = error.response?.data;
      let errorMessage =
        error.message || "Erro ao processar login. Tente novamente mais tarde.";

      // Trata erros específicos do Zoho
      if (zohoError?.code === "INVALID_MODULE") {
        errorMessage =
          "Módulo não encontrado no Zoho CRM. Verifique se o nome do módulo está correto na configuração ZOHO_MODULE_NAME.";
      } else if (zohoError?.message) {
        errorMessage = zohoError.message;
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
        details:
          ENV.NODE_ENV !== "production"
            ? {
                zohoCode: zohoError?.code,
                zohoMessage: zohoError?.message,
                fullError: error.message,
              }
            : undefined,
      });
    }
  },
);

/**
 * Rota para verificar se um email existe
 * POST /api/auth/check-email
 * Body: { email: string }
 */
router.post("/check-email", async (req, res) => {
  console.log("[AUTH ROUTE] Verificando se email existe");

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email é obrigatório",
      });
    }

    const usuario = await zohoAuth.buscarUsuarioPorEmail(email);

    res.json({
      success: true,
      exists: !!usuario,
    });
  } catch (error) {
    console.error("[AUTH ROUTE] ✗ ERRO ao verificar email:");
    console.error(
      "[AUTH ROUTE] Detalhes:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      success: false,
      error: "Erro ao verificar email",
    });
  }
});

/**
 * Rota para servir a foto do usuário (proxy autenticado)
 * GET /api/auth/user-photo/:userId
 *
 * Esta rota serve como proxy para acessar imagens do Zoho que requerem autenticação OAuth
 */
router.get("/user-photo/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";

    // URL da foto no Zoho
    const baseUrl =
      ENV.ZOHO_API_BASE?.replace(/\/$/, "") || "https://www.zohoapis.com";
    const apiBase = baseUrl.replace("zohoapi.com", "zohoapis.com");
    const photoUrl = `${apiBase}/crm/v2/${moduleName}/${userId}/photo`;

    console.log("[AUTH ROUTE] Buscando foto do usuário:", photoUrl);

    // Obtém o token de acesso do Zoho
    const accessToken = await gerarAcessToken();

    // Faz requisição para obter a imagem do Zoho
    const imageResponse = await axios.get(photoUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      responseType: "arraybuffer", // Para imagens binárias
    });

    console.log("[AUTH ROUTE] ✓ Foto obtida com sucesso do Zoho");

    // Retorna a imagem com os headers corretos
    res.set({
      "Content-Type": imageResponse.headers["content-type"] || "image/jpeg",
      "Content-Length": imageResponse.headers["content-length"],
      "Cache-Control": "public, max-age=3600", // Cache por 1 hora
    });

    res.send(Buffer.from(imageResponse.data));
  } catch (error) {
    console.error("[AUTH ROUTE] ✗ ERRO ao servir foto do usuário:");
    console.error("[AUTH ROUTE] Status:", error.response?.status);
    console.error(
      "[AUTH ROUTE] Detalhes:",
      error.response?.data || error.message,
    );
    res.status(404).json({ error: "Foto não encontrada" });
  }
});

export default router;
