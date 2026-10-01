/**
 * Campos do módulo Zoho "Usuário Portal" e do payload criptografado
 * em `consultores`. A senha não entra neste objeto — fica só no Zoho.
 */

export const PERFIS = ["Consultor", "Gerencia", "Admin Painel", "Gestão"];

export const FORMULARIOS = [
  "Compra",
  "Recompra",
  "Proposta",
  "Tracking de Pedidos",
  "Ocorrencia",
  "Central Comercial",
  "Leads Medicos",
];

export const PARCEIROS = [
  "Cannabis em Foco",
  "Equilibra",
  "TonTon",
  "Gravial",
  "Natural Science",
  "CFJR Medical",
  "TegraPharma Distribuidora",
  "Onixcann",
  "Vip Pharma",
];

export const GERENCIAS = ["Marcelli Silva", "Luis Otavio", "Ricardo", "Digital"];

export const REGIOES = ["SUDESTE", "SUL", "NORDESTE", "CENTRO-OESTE", "NORTE"];

const CAMPOS_PERMISSAO = [
  "Permiss_es_formul_rios",
  "Permiss_es_formularios",
  "Permissoes_formularios",
  "Permissoes_formulario",
  "Permiss_oes_formularios",
  "Permiss_oes_formul_rios",
];

const CAMPOS_PARCEIROS = [
  "Parceiros",
  "parceiros",
  "Parcerias",
  "parcerias",
  "Parceiro",
  "parceiro",
];

const CAMPOS_PARCERIA = ["Parceria", "parceria", "Tem_Parceria", "Possui_Parceria"];

const CAMPOS_PERFIL = ["Perfil", "perfil", "Cargo", "cargo"];

const CAMPOS_RUA = ["Rua", "rua", "Endere_o", "Endereco", "Endereço", "endereco"];

function texto(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") {
    return String(value.name || value.nome || value.value || value.label || "").trim();
  }
  return String(value).trim();
}

function normalizar(value) {
  return texto(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function chaveExiste(obj, chave) {
  return Object.prototype.hasOwnProperty.call(obj, chave) && obj[chave] !== undefined && obj[chave] !== null;
}

function lerPrimeiro(obj, chaves) {
  for (const chave of chaves) {
    if (chaveExiste(obj, chave) && texto(obj[chave])) return obj[chave];
  }
  return undefined;
}

function lerMultiselect(valor) {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (Array.isArray(valor)) {
    return valor.map((item) => texto(item)).filter(Boolean);
  }
  if (typeof valor === "object") {
    const unico = texto(valor);
    return unico ? [unico] : [];
  }
  return String(valor)
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function lerBooleano(valor) {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  const normalizado = normalizar(valor);
  if (!normalizado) return undefined;
  if (["true", "1", "sim", "yes", "y", "on", "ativo", "active"].includes(normalizado)) {
    return true;
  }
  if (["false", "0", "nao", "no", "n", "off", "inativo", "inactive"].includes(normalizado)) {
    return false;
  }
  return undefined;
}

export function canonizarPerfil(value) {
  const bruto = texto(value);
  const p = normalizar(bruto);
  if (!p) return "";
  if (p === "admin painel") return "Admin Painel";
  if (p === "gestao") return "Gestão";
  if (p === "gerencia" || p === "gerente") return "Gerencia";
  if (p === "consultor") return "Consultor";
  return bruto;
}

export function canonizarRegiao(value) {
  const bruto = texto(value).toUpperCase();
  if (bruto === "CENTO-OESTE" || bruto === "CENTRO OESTE") return "CENTRO-OESTE";
  return bruto;
}

function lerPermissoes(usuario) {
  const direto = lerPrimeiro(usuario, CAMPOS_PERMISSAO);
  if (direto !== undefined) return lerMultiselect(direto) || [];

  for (const [chave, valor] of Object.entries(usuario || {})) {
    const n = normalizar(chave).replace(/[^a-z0-9]/g, "");
    if (n.startsWith("permiss") && (n.includes("formulari") || n.includes("formulri"))) {
      return lerMultiselect(valor) || [];
    }
  }
  return undefined;
}

/**
 * Lê o registro Zoho para o formato do formulário.
 * Campos ausentes no Zoho ficam `undefined` para o sync de login
 * não apagar o que já está no banco.
 */
export function extrairCadastroZoho(usuario = {}) {
  const campoEmail = process.env.ZOHO_EMAIL_FIELD || "Email";
  const campoNome = process.env.ZOHO_NOME_FIELD || process.env.ZOHO_NAME_FIELD || "Name";
  const campoStatus = process.env.ZOHO_STATUS_FIELD || "Ativo";

  const perfilBruto = lerPrimeiro(usuario, CAMPOS_PERFIL);
  const parceriaBruto = lerPrimeiro(usuario, CAMPOS_PARCERIA);
  const parceirosBruto = lerPrimeiro(usuario, CAMPOS_PARCEIROS);
  const ativoBruto = usuario[campoStatus];

  return {
    id: texto(usuario.id),
    nome: texto(usuario[campoNome] || usuario.Nome || usuario.Name || usuario.nome),
    email: texto(usuario[campoEmail] || usuario.Email || usuario.email).toLowerCase(),
    recebeLeads: lerBooleano(usuario.Recebe_Leads),
    perfil: perfilBruto === undefined ? undefined : canonizarPerfil(perfilBruto),
    permissoesFormularios: lerPermissoes(usuario),
    parceria: parceriaBruto === undefined ? undefined : Boolean(lerBooleano(parceriaBruto)),
    parceiros: parceirosBruto === undefined ? undefined : lerMultiselect(parceirosBruto) || [],
    gerencia: lerPrimeiro(usuario, ["Gerencia", "gerencia"]) === undefined
      ? undefined
      : texto(lerPrimeiro(usuario, ["Gerencia", "gerencia"])),
    regiao: lerPrimeiro(usuario, ["Regi_o", "Regiao", "Região", "regiao"]) === undefined
      ? undefined
      : canonizarRegiao(lerPrimeiro(usuario, ["Regi_o", "Regiao", "Região", "regiao"])),
    rua: lerPrimeiro(usuario, CAMPOS_RUA) === undefined
      ? undefined
      : texto(lerPrimeiro(usuario, CAMPOS_RUA)),
    bairro: lerPrimeiro(usuario, ["Bairro", "bairro"]) === undefined
      ? undefined
      : texto(lerPrimeiro(usuario, ["Bairro", "bairro"])),
    cidade: lerPrimeiro(usuario, ["Cidade", "cidade"]) === undefined
      ? undefined
      : texto(lerPrimeiro(usuario, ["Cidade", "cidade"])),
    estado: lerPrimeiro(usuario, ["Estado", "estado"]) === undefined
      ? undefined
      : texto(lerPrimeiro(usuario, ["Estado", "estado"])),
    cep: lerPrimeiro(usuario, ["CEP", "Cep", "cep"]) === undefined
      ? undefined
      : texto(lerPrimeiro(usuario, ["CEP", "Cep", "cep"])),
    ativo: ativoBruto === undefined ? undefined : lerBooleano(ativoBruto) !== false,
  };
}

function validarPoliticaSenha(senha) {
  const faltando = [];
  if (senha.length < 8) faltando.push("no mínimo 8 caracteres");
  if (!/[A-Z]/.test(senha)) faltando.push("uma letra maiúscula");
  if (!/\d/.test(senha)) faltando.push("um número");
  if (!/[^A-Za-z0-9]/.test(senha)) faltando.push("um caractere especial");
  if (!faltando.length) return "";
  return `A senha precisa ter ${faltando.join(", ").replace(/, ([^,]+)$/, " e $1")}`;
}

function exigirLista(valor, permitidos, rotulo) {
  const lista = Array.isArray(valor) ? valor.map((item) => texto(item)).filter(Boolean) : [];
  const invalidos = lista.filter((item) => !permitidos.includes(item));
  if (invalidos.length) {
    const err = new Error(`${rotulo} inválido: ${invalidos.join(", ")}`);
    err.status = 400;
    throw err;
  }
  return [...new Set(lista)];
}

export function validarCadastroPortal(body = {}, { exigindoSenha = false } = {}) {
  const nome = texto(body.nome);
  const email = texto(body.email).toLowerCase();
  const perfil = canonizarPerfil(body.perfil);
  const gerencia = texto(body.gerencia);
  const regiao = canonizarRegiao(body.regiao);
  const senha = typeof body.senha === "string" ? body.senha : "";

  if (!nome) {
    const err = new Error("Nome é obrigatório");
    err.status = 400;
    throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("E-mail inválido");
    err.status = 400;
    throw err;
  }
  if (!PERFIS.includes(perfil)) {
    const err = new Error("Perfil inválido");
    err.status = 400;
    throw err;
  }
  if (gerencia && !GERENCIAS.includes(gerencia)) {
    const err = new Error("Gerência inválida");
    err.status = 400;
    throw err;
  }
  if (regiao && !REGIOES.includes(regiao)) {
    const err = new Error("Região inválida");
    err.status = 400;
    throw err;
  }
  if (exigindoSenha || senha) {
    const falhaSenha = validarPoliticaSenha(senha);
    if (falhaSenha) {
      const err = new Error(falhaSenha);
      err.status = 400;
      throw err;
    }
  }

  return {
    nome,
    email,
    senha,
    recebeLeads: Boolean(body.recebeLeads),
    perfil,
    permissoesFormularios: exigirLista(body.permissoesFormularios, FORMULARIOS, "Permissão de formulário"),
    parceria: Boolean(body.parceria),
    parceiros: Boolean(body.parceria)
      ? exigirLista(body.parceiros, PARCEIROS, "Parceiro")
      : [],
    gerencia,
    regiao,
    rua: texto(body.rua),
    bairro: texto(body.bairro),
    cidade: texto(body.cidade),
    estado: texto(body.estado),
    cep: texto(body.cep),
    ativo: body.ativo === undefined ? true : Boolean(body.ativo),
  };
}

/**
 * Monta o corpo do registro Zoho. Senha só entra se `senhaHash` for passado.
 * Rua grava em `Rua` e também em `Endere_o`, que é o campo que o portal já lê.
 */
export function montarRegistroZoho(cadastro, { senhaHash, id } = {}) {
  const campoEmail = process.env.ZOHO_EMAIL_FIELD || "Email";
  const campoNome = process.env.ZOHO_NOME_FIELD || process.env.ZOHO_NAME_FIELD || "Name";
  const campoStatus = process.env.ZOHO_STATUS_FIELD || "Ativo";
  const campoSenha = process.env.ZOHO_SENHA_FIELD || "Senha";

  const registro = {
    [campoNome]: cadastro.nome,
    [campoEmail]: cadastro.email,
    [campoStatus]: cadastro.ativo,
    Recebe_Leads: cadastro.recebeLeads,
    Perfil: cadastro.perfil,
    Permiss_es_formul_rios: cadastro.permissoesFormularios,
    Parceria: cadastro.parceria,
    Parceiros: cadastro.parceiros,
    Bairro: cadastro.bairro || "",
    Cidade: cadastro.cidade || "",
    Estado: cadastro.estado || "",
    CEP: cadastro.cep || "",
    Rua: cadastro.rua || "",
    Endere_o: cadastro.rua || "",
  };

  if (cadastro.gerencia) registro.Gerencia = cadastro.gerencia;
  if (cadastro.regiao) registro.Regi_o = cadastro.regiao;

  if (id) registro.id = id;
  if (senhaHash) registro[campoSenha] = senhaHash;
  return registro;
}

export function mensagemErroZoho(error, fallback) {
  const item = error?.response?.data?.data?.[0] || error?.details;
  const api = item?.details?.api_name;
  const message = item?.message || error?.response?.data?.message || error?.message || fallback;
  if (api) return `${message} (campo Zoho: ${api})`;
  return message;
}
