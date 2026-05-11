import { sanitizeBrazilPhoneForApi } from "./phone.js";

/**
 * Converte valor de data do formulário para dd/mm/aaaa (texto).
 */
export function toDdMmYyyy(value) {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

function onlyDigits(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = String(value).replace(/\D/g, "");
  return d || null;
}

function rgLoose(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim() || null;
}

/**
 * Colunas espelhadas do formulário Compra / Recompra (corpo da API).
 */
export function columnsFromCompraBody(body) {
  const nome = String(body.nomePaciente || "").trim();
  const sobrenome = String(body.sobrenomePaciente || "").trim();
  const nomeCompleto = [nome, sobrenome].filter(Boolean).join(" ").trim() || null;

  const crm = String(body.crmMedico || "").trim();
  const uf = String(body.ufCrm || "").trim();
  const crmUf =
    crm && uf ? `${crm}/${uf}` : crm || uf || null;

  const linkPag =
    body.solicitarLinkPagamento === true ||
    body.solicitarLinkPagamento === "Sim" ||
    body.solicitarLinkPagamento === "sim";

  return {
    nome: nome || null,
    sobrenome: sobrenome || null,
    nome_completo: nomeCompleto,
    cpf: onlyDigits(body.cpfPaciente),
    rg: rgLoose(body.rgPaciente),
    celular: body.celularPaciente
      ? sanitizeBrazilPhoneForApi(body.celularPaciente)
      : null,
    telefone: onlyDigits(body.telefonePaciente),
    email: body.emailPaciente ? String(body.emailPaciente).trim() : null,
    data_nascimento: toDdMmYyyy(body.dataNascimento),
    representante_legal: Boolean(body.temRepresentanteLegal),
    nome_representante: body.nomeRepresentante
      ? String(body.nomeRepresentante).trim()
      : null,
    rg_representante: rgLoose(body.rgRepresentante),
    cpf_representante: onlyDigits(body.cpfRepresentante),
    email_representante: body.emailRepresentante
      ? String(body.emailRepresentante).trim()
      : null,
    celular_representante: body.celularRepresentante
      ? sanitizeBrazilPhoneForApi(body.celularRepresentante)
      : null,
    data_nascimento_representante: toDdMmYyyy(body.dataNascimentoRepresentante),
    campanha_diretoria: Boolean(body.campanhaDiretoria),
    dados_medico_prescritor: Boolean(body.temNovoMedicoPrescritor),
    nome_medico: body.nomeMedico ? String(body.nomeMedico).trim() : null,
    crm_medico: body.crmMedico ? String(body.crmMedico).trim() : null,
    uf_crm: body.ufCrm ? String(body.ufCrm).trim() : null,
    crm_uf: crmUf,
    email_medico: body.emailMedico ? String(body.emailMedico).trim() : null,
    especialidade_medico: body.especialidadeMedico
      ? String(body.especialidadeMedico).trim()
      : null,
    rua: body.rua ? String(body.rua).trim() : null,
    numero_endereco:
      body.numero !== undefined && body.numero !== null && body.numero !== ""
        ? String(body.numero).trim()
        : null,
    complemento: body.complemento ? String(body.complemento).trim() : null,
    bairro: body.bairro ? String(body.bairro).trim() : null,
    cep: onlyDigits(body.cep),
    cidade: body.cidade ? String(body.cidade).trim() : null,
    estado: body.estado ? String(body.estado).trim() : null,
    pais: body.pais ? String(body.pais).trim() : null,
    negociacao_consultor: Boolean(body.negociacaoFeitaPeloConsultor),
    link_pagamento: linkPag,
    tipo_link: body.tipoLink ? String(body.tipoLink).trim() : null,
    forma_pagamento: body.formaPagamento
      ? String(body.formaPagamento).trim()
      : null,
    termos_condicoes: body.termosCondicoesPagamento
      ? String(body.termosCondicoesPagamento).trim()
      : null,
    observacao: body.observacao ? String(body.observacao).trim() : null,
  };
}

/**
 * Colunas espelhadas do formulário Proposta (PF e PJ).
 */
export function columnsFromPropostaBody(body) {
  const isPJ = String(body.tipoCliente || "").trim() === "Pessoa Juridica";

  let nome;
  let sobrenome;
  let nomeCompleto;

  if (isPJ) {
    nome = String(body.nomeEmpresa || "").trim();
    sobrenome = "";
    nomeCompleto = nome || null;
  } else {
    nome = String(body.nomePaciente || "").trim();
    sobrenome = String(body.sobrenomePaciente || "").trim();
    nomeCompleto = [nome, sobrenome].filter(Boolean).join(" ").trim() || null;
  }

  const crm = String(body.crmMedico || "").trim();
  const uf = String(body.ufCrm || "").trim();
  const crmUf =
    crm && uf ? `${crm}/${uf}` : crm || uf || null;

  const linkPag =
    body.solicitarLinkPagamento === true ||
    body.solicitarLinkPagamento === "Sim" ||
    body.solicitarLinkPagamento === "sim";

  return {
    nome: nome || null,
    sobrenome: sobrenome || null,
    nome_completo: nomeCompleto,
    cpf: isPJ ? null : onlyDigits(body.cpfPaciente),
    rg: isPJ ? null : rgLoose(body.rgPaciente),
    celular: !isPJ && body.celularPaciente
      ? sanitizeBrazilPhoneForApi(body.celularPaciente)
      : null,
    telefone: isPJ
      ? onlyDigits(body.telefoneEmpresa)
      : onlyDigits(body.telefonePaciente),
    email: isPJ
      ? body.emailEmpresa
        ? String(body.emailEmpresa).trim()
        : null
      : body.emailPaciente
        ? String(body.emailPaciente).trim()
        : null,
    data_nascimento: isPJ ? null : toDdMmYyyy(body.dataNascimento),
    representante_legal: isPJ
      ? Boolean(body.temRepresentanteEmpresa)
      : Boolean(body.temRepresentanteLegal),
    nome_representante: isPJ
      ? body.nomeRepresentanteEmpresa
        ? String(body.nomeRepresentanteEmpresa).trim()
        : null
      : body.nomeRepresentante
        ? String(body.nomeRepresentante).trim()
        : null,
    rg_representante: isPJ ? null : rgLoose(body.rgRepresentante),
    cpf_representante: isPJ ? null : onlyDigits(body.cpfRepresentante),
    email_representante: isPJ
      ? body.emailRepresentanteEmpresa
        ? String(body.emailRepresentanteEmpresa).trim()
        : null
      : body.emailRepresentante
        ? String(body.emailRepresentante).trim()
        : null,
    celular_representante: isPJ
      ? body.celularRepresentanteEmpresa
        ? sanitizeBrazilPhoneForApi(body.celularRepresentanteEmpresa)
        : null
      : body.celularRepresentante
        ? sanitizeBrazilPhoneForApi(body.celularRepresentante)
        : null,
    data_nascimento_representante: isPJ
      ? null
      : toDdMmYyyy(body.dataNascimentoRepresentante),
    campanha_diretoria: Boolean(body.campanhaDiretoria),
    dados_medico_prescritor: Boolean(body.temNovoMedicoPrescritor),
    nome_medico: body.nomeMedico ? String(body.nomeMedico).trim() : null,
    crm_medico: body.crmMedico ? String(body.crmMedico).trim() : null,
    uf_crm: body.ufCrm ? String(body.ufCrm).trim() : null,
    crm_uf: crmUf,
    email_medico: body.emailMedico ? String(body.emailMedico).trim() : null,
    especialidade_medico: body.especialidadeMedico
      ? String(body.especialidadeMedico).trim()
      : null,
    rua: body.rua ? String(body.rua).trim() : null,
    numero_endereco:
      body.numero !== undefined && body.numero !== null && body.numero !== ""
        ? String(body.numero).trim()
        : null,
    complemento: body.complemento ? String(body.complemento).trim() : null,
    bairro: body.bairro ? String(body.bairro).trim() : null,
    cep: onlyDigits(body.cep),
    cidade: body.cidade ? String(body.cidade).trim() : null,
    estado: body.estado ? String(body.estado).trim() : null,
    pais: body.pais ? String(body.pais).trim() : null,
    negociacao_consultor: Boolean(body.negociacaoFeitaPeloConsultor),
    link_pagamento: linkPag,
    tipo_link: body.tipoLink ? String(body.tipoLink).trim() : null,
    forma_pagamento: body.formaPagamento
      ? String(body.formaPagamento).trim()
      : null,
    termos_condicoes: body.termosCondicoesPagamento
      ? String(body.termosCondicoesPagamento).trim()
      : null,
    observacao: body.observacao ? String(body.observacao).trim() : null,
    tipo_cliente: isPJ ? "Pessoa Juridica" : "Pessoa Fisica",
    nome_empresa: isPJ
      ? String(body.nomeEmpresa || "").trim() || null
      : null,
    cnpj: isPJ ? onlyDigits(body.cnpjEmpresa) : null,
    email_empresa:
      isPJ && body.emailEmpresa
        ? String(body.emailEmpresa).trim()
        : null,
    telefone_empresa: isPJ
      ? onlyDigits(body.telefoneEmpresa)
      : null,
  };
}

/**
 * Colunas espelhadas do formulário Ocorrência.
 */
export function columnsFromOcorrenciaBody(body) {
  const nome = String(body.nomePaciente || "").trim();
  const sobrenome = String(body.sobrenomePaciente || "").trim();
  const nomeCompleto =
    [nome, sobrenome].filter(Boolean).join(" ").trim() || null;

  const crm = String(body.crmMedico || "").trim();
  const uf = String(body.ufCrm || "").trim();
  const crmUf =
    crm && uf ? `${crm}/${uf}` : crm || uf || null;

  return {
    nome: nome || null,
    sobrenome: sobrenome || null,
    nome_completo: nomeCompleto,
    cpf: onlyDigits(body.cpfPaciente),
    celular: body.celularPaciente
      ? sanitizeBrazilPhoneForApi(body.celularPaciente)
      : null,
    email: body.emailPaciente ? String(body.emailPaciente).trim() : null,
    motivo_ocorrencia: body.motivoOcorrencia
      ? String(body.motivoOcorrencia).trim()
      : null,
    observacao: body.observacaoMotivo
      ? String(body.observacaoMotivo).trim()
      : null,
    nome_medico: body.nomeMedico ? String(body.nomeMedico).trim() : null,
    crm_medico: body.crmMedico ? String(body.crmMedico).trim() : null,
    uf_crm: body.ufCrm ? String(body.ufCrm).trim() : null,
    crm_uf: crmUf,
    celular_medico: body.celularMedico
      ? sanitizeBrazilPhoneForApi(body.celularMedico)
      : null,
    email_medico: body.emailMedico ? String(body.emailMedico).trim() : null,
    numero_pedido: body.numeroPedido
      ? String(body.numeroPedido).replace(/\D/g, "")
      : null,
    awb: body.awb ? String(body.awb).trim() : null,
    data_pedido: toDdMmYyyy(body.dataPedido),
    numero_lote: body.numeroLote ? String(body.numeroLote).trim() : null,
    data_validade: toDdMmYyyy(body.dataValidade),
  };
}
