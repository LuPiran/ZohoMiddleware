import { chamarZohoApi } from "./zohoApi.js";

/** Evita provisionamento duplicado quando duas requisições chegam juntas. */
const provisionamentoEmAndamento = new Map();

/**
 * Busca um usuário no módulo customizado do Zoho pelo email
 * @param {string} email - Email do usuário
 * @returns {Promise<Object|null>} - Dados do usuário ou null se não encontrado
 */
async function buscarUsuarioPorEmail(email) {
  const emailNormalizado = email.trim().toLowerCase();
  console.log("[ZOHO AUTH] Buscando usuário por email:", emailNormalizado);

  try {
    const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
    const campoEmail = process.env.ZOHO_EMAIL_FIELD || "Email";

    const criteria = `(${campoEmail}:equals:${emailNormalizado})`;
    const endpoint = `/${moduleName}?criteria=${encodeURIComponent(criteria)}`;

    console.log("[ZOHO AUTH] Nome do módulo usado:", moduleName);
    console.log("[ZOHO AUTH] Campo de email usado:", campoEmail);
    console.log("[ZOHO AUTH] Critério de busca:", criteria);

    const extrairEmailRegistro = (usuario) =>
      (usuario[campoEmail] || usuario.Email || usuario.email || "")
        .toString()
        .trim()
        .toLowerCase();

    const encontrarCorrespondenciaExata = (usuarios) => {
      for (const usuario of usuarios) {
        const emailRegistro = extrairEmailRegistro(usuario);
        if (emailRegistro === emailNormalizado) {
          return usuario;
        }
      }
      return null;
    };

    const response = await chamarZohoApi("GET", endpoint);

    if (
      response &&
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0
    ) {
      let usuarioEncontrado = encontrarCorrespondenciaExata(response.data);

      if (usuarioEncontrado) {
        console.log("[ZOHO AUTH] ✓ Usuário encontrado com email correspondente");
        return removerCamposSenha(usuarioEncontrado);
      }

      const shouldTryPagination =
        Boolean(response.info?.more_records) || response.data.length >= 200;

      if (shouldTryPagination) {
        const maxPages = Number.parseInt(
          process.env.ZOHO_EMAIL_SCAN_MAX_PAGES || "25",
          10,
        );

        for (let page = 1; page <= maxPages; page += 1) {
          const pageEndpoint = `/${moduleName}?page=${page}&per_page=200`;
          const pageResponse = await chamarZohoApi("GET", pageEndpoint);
          const pageData = Array.isArray(pageResponse?.data)
            ? pageResponse.data
            : [];

          if (pageData.length === 0) {
            break;
          }

          usuarioEncontrado = encontrarCorrespondenciaExata(pageData);

          if (usuarioEncontrado) {
            console.log(
              "[ZOHO AUTH] ✓ Usuário encontrado via fallback de paginação",
            );
            return removerCamposSenha(usuarioEncontrado);
          }

          if (!pageResponse?.info?.more_records) {
            break;
          }
        }
      }

      console.log(
        "[ZOHO AUTH] ✗ Usuário não encontrado (nenhum registro corresponde ao email)",
      );
      return null;
    }

    console.log(
      "[ZOHO AUTH] ✗ Usuário não encontrado (nenhum registro retornado)",
    );
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

function removerCamposSenha(usuario) {
  if (!usuario || typeof usuario !== "object") return usuario;

  const usuarioSemSenha = { ...usuario };
  const campoSenha = process.env.ZOHO_SENHA_FIELD || "Senha";
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
}

/**
 * Valida as credenciais do usuário (email e senha) no Zoho.
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<Object|null>}
 */
async function validarCredenciais(email, senha) {
  console.log("[ZOHO AUTH] Validando credenciais para:", email);

  if (!email || !senha) {
    console.log("[ZOHO AUTH] ✗ Email ou senha não fornecidos");
    return null;
  }

  try {
    const usuario = await buscarUsuarioBrutoPorEmail(email);

    if (!usuario) {
      console.log("[ZOHO AUTH] ✗ Usuário não encontrado");
      return null;
    }

    const campoSenha = process.env.ZOHO_SENHA_FIELD || "Senha";
    const senhaArmazenada =
      usuario[campoSenha] ||
      usuario.Senha ||
      usuario.Password ||
      usuario.senha ||
      usuario.password ||
      usuario.Senha_Password ||
      usuario.senha_password;

    if (!senhaArmazenada) {
      console.error(
        "[ZOHO AUTH] ✗ Campo de senha não encontrado no registro do usuário",
      );
      console.error("[ZOHO AUTH] Campo esperado:", campoSenha);
      return null;
    }

    const { comparePassword } = await import("../utils/security.js");
    const senhaValida = await comparePassword(senha, senhaArmazenada);

    if (senhaValida) {
      console.log("[ZOHO AUTH] ✓ Credenciais válidas");
      return removerCamposSenha(usuario);
    }

    console.log("[ZOHO AUTH] ✗ Senha incorreta");
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 100 + 50),
    );
    return null;
  } catch (error) {
    console.error("[ZOHO AUTH] ✗ ERRO ao validar credenciais:");
    console.error(
      "[ZOHO AUTH] Detalhes:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Busca usuário sem remover o campo de senha (uso interno).
 */
async function buscarUsuarioBrutoPorEmail(email) {
  const emailNormalizado = email.trim().toLowerCase();
  const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
  const campoEmail = process.env.ZOHO_EMAIL_FIELD || "Email";
  const criteria = `(${campoEmail}:equals:${emailNormalizado})`;
  const endpoint = `/${moduleName}?criteria=${encodeURIComponent(criteria)}`;
  const response = await chamarZohoApi("GET", endpoint);

  if (!Array.isArray(response?.data) || response.data.length === 0) {
    return null;
  }

  for (const usuario of response.data) {
    const emailRegistro = (
      usuario[campoEmail] ||
      usuario.Email ||
      usuario.email ||
      ""
    )
      .toString()
      .trim()
      .toLowerCase();
    if (emailRegistro === emailNormalizado) {
      return usuario;
    }
  }

  return null;
}

/**
 * Cria um usuário padrão no módulo do portal Zoho.
 * @param {{ email: string, nome?: string }} dados
 * @returns {Promise<Object>}
 */
async function criarUsuarioPortal({ email, nome }) {
  const emailNormalizado = String(email || "")
    .trim()
    .toLowerCase();
  const nomeUsuario = String(nome || "").trim() || emailNormalizado;

  if (!emailNormalizado) {
    throw new Error("Email é obrigatório para criar usuário no Zoho");
  }

  const moduleName = process.env.ZOHO_MODULE_NAME || "CustomModule45";
  const campoEmail = process.env.ZOHO_EMAIL_FIELD || "Email";
  const campoNome =
    process.env.ZOHO_NOME_FIELD || process.env.ZOHO_NAME_FIELD || "Name";
  const campoStatus = process.env.ZOHO_STATUS_FIELD || "Ativo";

  const registro = {
    [campoEmail]: emailNormalizado,
    [campoNome]: nomeUsuario,
    [campoStatus]: true,
  };

  console.log("[ZOHO AUTH] Criando usuário portal no módulo:", moduleName);
  console.log("[ZOHO AUTH] Dados iniciais:", {
    email: emailNormalizado,
    nome: nomeUsuario,
  });

  const createResponse = await chamarZohoApi("POST", `/${moduleName}`, {
    data: [registro],
  });

  const resultado = createResponse?.data?.[0];
  if (!resultado || resultado.status === "error") {
    const message =
      resultado?.message ||
      createResponse?.message ||
      "Falha ao criar usuário no Zoho";
    const error = new Error(message);
    error.code = resultado?.code || "ZOHO_USER_CREATE_FAILED";
    error.details = resultado?.details || createResponse;
    throw error;
  }

  const novoId = resultado.details?.id;
  if (!novoId) {
    throw new Error("Zoho não retornou o ID do usuário criado");
  }

  console.log("[ZOHO AUTH] ✓ Usuário criado com ID:", novoId);

  const getResponse = await chamarZohoApi("GET", `/${moduleName}/${novoId}`);
  const usuarioCriado = Array.isArray(getResponse?.data)
    ? getResponse.data[0]
    : getResponse?.data;

  if (!usuarioCriado) {
    return removerCamposSenha({
      id: novoId,
      [campoEmail]: emailNormalizado,
      Email: emailNormalizado,
      [campoNome]: nomeUsuario,
      Name: nomeUsuario,
      [campoStatus]: true,
    });
  }

  return removerCamposSenha(usuarioCriado);
}

/**
 * Busca usuário por email; se não existir, provisiona no Zoho.
 * Serializa por e-mail para evitar criar 2 registros em requisições paralelas.
 * @param {{ email: string, nome?: string }} dados
 * @returns {Promise<{ usuario: Object, criado: boolean }>}
 */
async function obterOuCriarUsuarioPorEmail({ email, nome }) {
  const emailNormalizado = String(email || "")
    .trim()
    .toLowerCase();

  if (!emailNormalizado) {
    throw new Error("Email é obrigatório");
  }

  const emAndamento = provisionamentoEmAndamento.get(emailNormalizado);
  if (emAndamento) {
    console.log(
      "[ZOHO AUTH] Aguardando provisionamento já em andamento para:",
      emailNormalizado,
    );
    return emAndamento;
  }

  const tarefa = (async () => {
    const existente = await buscarUsuarioPorEmail(emailNormalizado);
    if (existente) {
      return { usuario: existente, criado: false };
    }

    // Re-checagem imediata antes do POST (janela de corrida)
    const recheck = await buscarUsuarioPorEmail(emailNormalizado);
    if (recheck) {
      return { usuario: recheck, criado: false };
    }

    try {
      const criado = await criarUsuarioPortal({
        email: emailNormalizado,
        nome,
      });
      return { usuario: criado, criado: true };
    } catch (error) {
      // Se outro processo criou no meio, usa o existente
      const aposErro = await buscarUsuarioPorEmail(emailNormalizado);
      if (aposErro) {
        console.log(
          "[ZOHO AUTH] Usuário já existia após falha de create; reutilizando",
        );
        return { usuario: aposErro, criado: false };
      }
      throw error;
    }
  })();

  provisionamentoEmAndamento.set(emailNormalizado, tarefa);

  try {
    return await tarefa;
  } finally {
    provisionamentoEmAndamento.delete(emailNormalizado);
  }
}

export default {
  buscarUsuarioPorEmail,
  validarCredenciais,
  criarUsuarioPortal,
  obterOuCriarUsuarioPorEmail,
  removerCamposSenha,
};

export { removerCamposSenha };