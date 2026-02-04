import { chamarZohoApi } from "./zohoApi.js";

/**
 * Busca um usuário no CustomModule45 do Zoho pelo email
 * @param {string} email - Email do usuário
 * @returns {Promise<Object|null>} - Dados do usuário ou null se não encontrado
 */
async function buscarUsuarioPorEmail(email) {
  console.log("[ZOHO AUTH] Buscando usuário por email:", email);

  try {
    // Busca no módulo customizado usando critério de email
    // Configure o nome do módulo via variável de ambiente ZOHO_MODULE_NAME
    // Exemplos: CustomModule45, CustomModule1, Contacts, Leads, etc.
    const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
    const campoEmail = process.env.ZOHO_EMAIL_FIELD || "Email";
    const criteria = `((${campoEmail}:equals:${email}))`;
    // O endpoint não precisa incluir /crm/v2 pois já está na base URL
    const endpoint = `/${moduleName}?criteria=${encodeURIComponent(criteria)}`;

    console.log("[ZOHO AUTH] Nome do módulo usado:", moduleName);

    console.log("[ZOHO AUTH] Campo de email usado:", campoEmail);
    console.log("[ZOHO AUTH] Critério de busca:", criteria);
    console.log("[ZOHO AUTH] Endpoint:", endpoint);

    const response = await chamarZohoApi("GET", endpoint);

    console.log(
      "[ZOHO AUTH] Resposta completa do Zoho:",
      JSON.stringify(response).substring(0, 500),
    );

    // A resposta do Zoho vem no formato: { data: [{ ... }] }
    if (
      response &&
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0
    ) {
      const usuario = response.data[0];
      console.log("[ZOHO AUTH] ✓ Usuário encontrado");
      console.log("[ZOHO AUTH] ID do usuário:", usuario.id);
      console.log("[ZOHO AUTH] Dados do usuário:", Object.keys(usuario));
      return usuario;
    }

    console.log("[ZOHO AUTH] ✗ Usuário não encontrado");
    console.log("[ZOHO AUTH] Estrutura da resposta:", {
      hasResponse: !!response,
      hasData: !!(response && response.data),
      isArray: !!(response && response.data && Array.isArray(response.data)),
      length: response?.data?.length || 0,
    });
    return null;
  } catch (error) {
    console.error("[ZOHO AUTH] ✗ ERRO ao buscar usuário:");
    console.error(
      "[ZOHO AUTH] Detalhes:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Valida as credenciais do usuário (email e senha)
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<Object|null>} - Dados do usuário se credenciais válidas, null caso contrário
 */
async function validarCredenciais(email, senha) {
  console.log("[ZOHO AUTH] Validando credenciais para:", email);

  if (!email || !senha) {
    console.log("[ZOHO AUTH] ✗ Email ou senha não fornecidos");
    return null;
  }

  try {
    const usuario = await buscarUsuarioPorEmail(email);

    if (!usuario) {
      console.log("[ZOHO AUTH] ✗ Usuário não encontrado");
      return null;
    }

    // Log dos campos disponíveis para debug (sem valores sensíveis)
    console.log(
      "[ZOHO AUTH] Campos disponíveis no registro:",
      Object.keys(usuario),
    );

    // Compara a senha fornecida com a senha armazenada no Zoho
    // Tenta diferentes variações do nome do campo de senha
    // Você pode configurar o nome exato do campo via variável de ambiente ZOHO_SENHA_FIELD
    const campoSenha = process.env.ZOHO_SENHA_FIELD || "Senha";
    const senhaArmazenada =
      usuario[campoSenha] ||
      usuario.Senha ||
      usuario.Password ||
      usuario.senha ||
      usuario.password ||
      usuario.Senha_Password || // Formato comum no Zoho para campos customizados
      usuario.senha_password;

    if (!senhaArmazenada) {
      console.error(
        "[ZOHO AUTH] ✗ Campo de senha não encontrado no registro do usuário",
      );
      console.error("[ZOHO AUTH] Campo esperado:", campoSenha);
      console.error(
        "[ZOHO AUTH] Configure ZOHO_SENHA_FIELD no .env com o nome exato do campo",
      );
      return null;
    }

    // Comparação segura de senhas (suporta hash bcrypt ou texto plano)
    // Importa dinamicamente para evitar erro se bcrypt não estiver disponível
    const { comparePassword } = await import("../utils/security.js");
    const senhaValida = await comparePassword(senha, senhaArmazenada);

    if (senhaValida) {
      console.log("[ZOHO AUTH] ✓ Credenciais válidas");

      // Remove a senha dos dados retornados por segurança
      // Remove todas as variações possíveis do campo de senha
      const usuarioSemSenha = { ...usuario };
      const camposSenha = [
        "Senha",
        "Password",
        "senha",
        "password",
        "Senha_Password",
        "senha_password",
        campoSenha,
      ];

      camposSenha.forEach((campo) => {
        if (campo) {
          delete usuarioSemSenha[campo];
        }
      });

      return usuarioSemSenha;
    } else {
      console.log("[ZOHO AUTH] ✗ Senha incorreta");
      // Aguarda um tempo aleatório para prevenir timing attacks
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 100 + 50),
      );
      return null;
    }
  } catch (error) {
    console.error("[ZOHO AUTH] ✗ ERRO ao validar credenciais:");
    console.error(
      "[ZOHO AUTH] Detalhes:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

export default {
  buscarUsuarioPorEmail,
  validarCredenciais,
};
