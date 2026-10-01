import bcrypt from "bcrypt";
import { chamarZohoApi } from "./zohoApi.js";
import zohoAuth from "./zohoAuth.js";
import { ENV } from "../config/env.js";
import { upsertConsultorFromCadastro } from "./consultores.js";
import {
  extrairCadastroZoho,
  mensagemErroZoho,
  montarRegistroZoho,
  validarCadastroPortal,
} from "./portalUsuarioCampos.js";

function modulo() {
  return ENV.ZOHO_MODULE_NAME || "CustomModule45";
}

const CAMPOS_ESSENCIAIS = new Set(["id", "Email", "Name", "Nome", "Senha", "Ativo"]);

function campoRejeitado(resultado) {
  return resultado?.details?.api_name || resultado?.details?.json_path || "";
}

/**
 * Grava no Zoho e, se um campo customizado não existir no módulo,
 * repete a chamada sem ele. Nome, e-mail, status e senha não são removidos.
 */
async function gravarZoho(method, registro, fallback, removidos = new Set()) {
  let response;
  try {
    response = await chamarZohoApi(method, `/${modulo()}`, { data: [registro] });
  } catch (error) {
    const api = error?.response?.data?.data?.[0]?.details?.api_name;
    if (api && registro[api] !== undefined && !CAMPOS_ESSENCIAIS.has(api) && !removidos.has(api)) {
      const next = { ...registro };
      delete next[api];
      removidos.add(api);
      console.warn(`[USERS] Campo Zoho "${api}" rejeitado. Tentando sem ele.`);
      return gravarZoho(method, next, fallback, removidos);
    }
    const err = new Error(mensagemErroZoho(error, fallback));
    err.status = 502;
    throw err;
  }

  const resultado = response?.data?.[0];
  if (!resultado || resultado.status === "error") {
    const api = campoRejeitado(resultado);
    if (api && registro[api] !== undefined && !CAMPOS_ESSENCIAIS.has(api) && !removidos.has(api)) {
      const next = { ...registro };
      delete next[api];
      removidos.add(api);
      console.warn(`[USERS] Campo Zoho "${api}" rejeitado. Tentando sem ele.`);
      return gravarZoho(method, next, fallback, removidos);
    }
    const err = new Error(mensagemErroZoho({ details: resultado }, fallback));
    err.status = 502;
    err.details = resultado;
    throw err;
  }

  return {
    id: resultado.details?.id || resultado.id || registro.id || null,
    camposIgnorados: [...removidos],
  };
}

async function lerUsuarioZoho(id) {
  const response = await chamarZohoApi("GET", `/${modulo()}/${id}`);
  const usuario = Array.isArray(response?.data) ? response.data[0] : response?.data;
  return usuario ? zohoAuth.removerCamposSenha(usuario) : null;
}

export async function criarUsuarioPortal(body) {
  const cadastro = validarCadastroPortal(body, { exigindoSenha: true });
  const existente = await zohoAuth.buscarUsuarioPorEmail(cadastro.email);
  if (existente?.id) {
    const err = new Error("Já existe um usuário com este e-mail");
    err.status = 409;
    throw err;
  }

  const senhaHash = await bcrypt.hash(cadastro.senha, 10);
  const registro = montarRegistroZoho(cadastro, { senhaHash });
  delete registro.id;

  const gravado = await gravarZoho("POST", registro, "Falha ao criar usuário no Zoho");
  const zohoId = gravado.id;

  const usuario = (await lerUsuarioZoho(zohoId)) || { id: zohoId, ...registro };
  const salvo = {
    ...cadastro,
    id: String(zohoId),
    senha: undefined,
  };

  try {
    await upsertConsultorFromCadastro(salvo);
  } catch (error) {
    const err = new Error(
      `Usuário criado no Zoho, mas não foi gravado no banco: ${error.message}`,
    );
    err.status = 502;
    throw err;
  }

  return {
    id: String(zohoId),
    cadastro: extrairCadastroZoho(zohoAuth.removerCamposSenha(usuario)),
    camposIgnorados: gravado.camposIgnorados,
  };
}

export async function atualizarUsuarioPortal(id, body) {
  const cadastro = validarCadastroPortal(body, { exigindoSenha: false });
  const atual = await lerUsuarioZoho(id);
  if (!atual) {
    const err = new Error("Usuário não encontrado");
    err.status = 404;
    throw err;
  }

  if (cadastro.email !== extrairCadastroZoho(atual).email) {
    const outro = await zohoAuth.buscarUsuarioPorEmail(cadastro.email);
    if (outro?.id && String(outro.id) !== String(id)) {
      const err = new Error("Já existe um usuário com este e-mail");
      err.status = 409;
      throw err;
    }
  }

  const senhaHash = cadastro.senha ? await bcrypt.hash(cadastro.senha, 10) : undefined;
  const registro = montarRegistroZoho({ ...cadastro, id }, { senhaHash, id });

  const gravado = await gravarZoho("PUT", registro, "Falha ao atualizar usuário no Zoho");

  const salvo = { ...cadastro, id: String(id), senha: undefined };
  await upsertConsultorFromCadastro(salvo);
  const usuario = (await lerUsuarioZoho(id)) || { id, ...registro };
  return {
    id: String(id),
    cadastro: extrairCadastroZoho(zohoAuth.removerCamposSenha(usuario)),
    camposIgnorados: gravado.camposIgnorados,
  };
}

export async function definirUsuarioAtivo(id, ativo) {
  const campoStatus = process.env.ZOHO_STATUS_FIELD || "Ativo";
  await gravarZoho(
    "PUT",
    { id, [campoStatus]: Boolean(ativo) },
    "Falha ao alterar status no Zoho",
  );

  const usuario = await lerUsuarioZoho(id);
  const cadastro = extrairCadastroZoho(usuario || { id });
  if (cadastro.email) {
    await upsertConsultorFromCadastro({
      ...cadastro,
      id: String(id),
      ativo: Boolean(ativo),
      perfil: cadastro.perfil || "Consultor",
      recebeLeads: cadastro.recebeLeads !== false,
      permissoesFormularios: cadastro.permissoesFormularios || [],
      parceria: Boolean(cadastro.parceria),
      parceiros: cadastro.parceiros || [],
      nome: cadastro.nome || cadastro.email,
    });
  }

  return { id: String(id), ativo: Boolean(ativo) };
}
