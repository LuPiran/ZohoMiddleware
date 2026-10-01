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

function normalizarChave(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const CAMPOS_LOGICOS = [
  { id: "nome", alvos: ["nome", "name"], env: ["ZOHO_NOME_FIELD", "ZOHO_NAME_FIELD"] },
  { id: "email", alvos: ["email"], env: ["ZOHO_EMAIL_FIELD"] },
  { id: "ativo", alvos: ["ativo", "status"], env: ["ZOHO_STATUS_FIELD"] },
  { id: "senha", alvos: ["senha", "password"], env: ["ZOHO_SENHA_FIELD"] },
  { id: "recebeLeads", alvos: ["recebeleads", "recebelead"] },
  { id: "perfil", alvos: ["perfil", "cargo"] },
  { id: "permissoes", alvos: ["permissoesformularios", "permissaoformularios", "permissoesformulario"] },
  { id: "parceria", alvos: ["parceria", "temparceria"] },
  { id: "parceiros", alvos: ["parceiros", "parcerias", "parceiro"] },
  { id: "gerencia", alvos: ["gerencia"] },
  { id: "regiao", alvos: ["regiao"] },
  { id: "rua", alvos: ["rua", "endereco", "logradouro"] },
  { id: "bairro", alvos: ["bairro"] },
  { id: "cidade", alvos: ["cidade"] },
  { id: "estado", alvos: ["estado"] },
  { id: "cep", alvos: ["cep"] },
];

function nomesDoCampo(campo) {
  return [campo.api_name, campo.field_label, campo.display_label]
    .map(normalizarChave)
    .filter(Boolean);
}

function combinaCampo(campo, logico) {
  const nomes = nomesDoCampo(campo);
  if (logico.id === "permissoes") {
    return nomes.some((nome) => nome.includes("permiss") && nome.includes("formul"));
  }
  if (logico.id === "email") {
    return nomes.some((nome) => nome === "email" || nome === "email1");
  }
  return logico.alvos.some((alvo) => nomes.some((nome) => nome === alvo));
}

function pareceNome(nome, alvo) {
  if (nome.length < 5 || alvo.length < 5 || Math.abs(nome.length - alvo.length) > 2) return false;
  const maior = nome.length >= alvo.length ? nome : alvo;
  const menor = nome.length >= alvo.length ? alvo : nome;
  let i = 0;
  let j = 0;
  let faltas = 0;
  while (i < menor.length && j < maior.length) {
    if (menor[i] === maior[j]) {
      i += 1;
      j += 1;
    } else {
      faltas += 1;
      j += 1;
      if (faltas > 2) return false;
    }
  }
  faltas += maior.length - j;
  return i === menor.length && faltas > 0 && faltas <= 2;
}

function escolherCampo(candidatos, logico) {
  for (const envName of logico.env || []) {
    const configurado = String(process.env[envName] || "").trim();
    if (!configurado) continue;
    const peloEnv = candidatos.find((campo) => campo.api_name === configurado);
    if (peloEnv) return peloEnv;
  }
  if (logico.id === "permissoes") {
    return candidatos.find((campo) => combinaCampo(campo, logico)) || null;
  }
  for (const alvo of logico.alvos) {
    const encontrado = candidatos.find((campo) =>
      nomesDoCampo(campo).some((nome) => nome === alvo || pareceNome(nome, alvo)),
    );
    if (encontrado) return encontrado;
  }
  return null;
}

function valorDaLista(campo, valor) {
  const opcoes = Array.isArray(campo?.pick_list_values) ? campo.pick_list_values : [];
  if (!valor || opcoes.length === 0) return valor;
  const alvo = normalizarChave(valor);
  const item = opcoes.find((opcao) => {
    const atual = normalizarChave(opcao.actual_value);
    const exibicao = normalizarChave(opcao.display_value);
    return atual === alvo || exibicao === alvo;
  });
  return item?.actual_value || valor;
}

function formatarValor(campo, valor, atual) {
  const tipo = campo?.data_type;
  if (Array.isArray(valor)) {
    const lista = valor.map((item) => valorDaLista(campo, item));
    if (tipo === "multiselectpicklist" || Array.isArray(atual)) return lista;
    if (typeof atual === "string") return lista.join(";");
    return lista;
  }
  if (tipo === "boolean" || typeof atual === "boolean" || typeof valor === "boolean") {
    return Boolean(valor);
  }
  if (tipo === "picklist") return valorDaLista(campo, valor);
  return valor ?? "";
}

/**
 * Descobre o api_name real de cada campo a partir do módulo Zoho
 * (settings/fields) ou, na falta disso, das chaves do registro já salvo.
 */
export function montarRegistroZoho(cadastro, { senhaHash, id, registroAtual = {}, campos = [] } = {}) {
  const candidatos = campos.length
    ? campos.filter((campo) => campo?.api_name)
    : Object.keys(registroAtual || {})
        .filter((chave) => chave !== "id")
        .map((chave) => ({ api_name: chave, field_label: chave }));

  const registro = {};
  const ignorados = [];
  if (id) registro.id = id;

  const definir = (logico, valor) => {
    const campo = escolherCampo(candidatos, logico);
    if (!campo) {
      if (valor !== undefined && valor !== "" && !(Array.isArray(valor) && valor.length === 0)) {
        ignorados.push(logico.id);
      }
      return;
    }
    registro[campo.api_name] = formatarValor(campo, valor, registroAtual[campo.api_name]);
  };

  definir(CAMPOS_LOGICOS.find((item) => item.id === "nome"), cadastro.nome);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "email"), cadastro.email);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "ativo"), cadastro.ativo);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "recebeLeads"), cadastro.recebeLeads);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "perfil"), cadastro.perfil);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "permissoes"), cadastro.permissoesFormularios);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "parceria"), cadastro.parceria);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "parceiros"), cadastro.parceiros);
  definir(CAMPOS_LOGICOS.find((item) => item.id === "gerencia"), cadastro.gerencia || "");
  definir(CAMPOS_LOGICOS.find((item) => item.id === "regiao"), cadastro.regiao || "");
  definir(CAMPOS_LOGICOS.find((item) => item.id === "rua"), cadastro.rua || "");
  definir(CAMPOS_LOGICOS.find((item) => item.id === "bairro"), cadastro.bairro || "");
  definir(CAMPOS_LOGICOS.find((item) => item.id === "cidade"), cadastro.cidade || "");
  definir(CAMPOS_LOGICOS.find((item) => item.id === "estado"), cadastro.estado || "");
  definir(CAMPOS_LOGICOS.find((item) => item.id === "cep"), cadastro.cep || "");
  if (senhaHash) {
    definir(CAMPOS_LOGICOS.find((item) => item.id === "senha"), senhaHash);
  }

  return { registro, ignorados };
}

export function mensagemErroZoho(error, fallback) {
  const item = error?.response?.data?.data?.[0] || error?.details;
  const api = item?.details?.api_name;
  const message = item?.message || error?.response?.data?.message || error?.message || fallback;
  if (api) return `${message} (campo Zoho: ${api})`;
  return message;
}
