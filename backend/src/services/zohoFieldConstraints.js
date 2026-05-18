const POLICY_ERROR = "error";
const POLICY_TRUNCATE = "truncate";

const BRAZIL_STATE_NAME_TO_UF = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPA: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARA: "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPIRITO SANTO": "ES",
  GOIAS: "GO",
  MARANHAO: "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PARA: "PA",
  PARAIBA: "PB",
  PARANA: "PR",
  PERNAMBUCO: "PE",
  PIAUI: "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RONDONIA: "RO",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  "SAO PAULO": "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};

const BRAZIL_UF_SET = new Set(Object.values(BRAZIL_STATE_NAME_TO_UF));

const MODULE_CONSTRAINTS = {
  Ocorrencias: {
    Protocolo_Portal: { maxLength: 20, policy: POLICY_ERROR },
    Primeiro_Nome: { maxLength: 120, policy: POLICY_ERROR },
    Segundo_Nome: { maxLength: 120, policy: POLICY_ERROR },
    CPF_Cliente: { maxLength: 11, policy: POLICY_ERROR },
    Celular_Cliente: { maxLength: 20, policy: POLICY_ERROR },
    E_mail_do_Cliente: { maxLength: 255, policy: POLICY_ERROR },
    Nome_consultor_Tegra: { maxLength: 120, policy: POLICY_ERROR },
    Name: { maxLength: 100, policy: POLICY_ERROR },
    Observa_es_Ocorr_ncia: { maxLength: 5000, policy: POLICY_TRUNCATE },
    M_dico_Prescritor_Portal: { maxLength: 120, policy: POLICY_ERROR },
    E_mail_do_M_dico: { maxLength: 255, policy: POLICY_ERROR },
    UF_do_M_dico: { maxLength: 2, policy: POLICY_ERROR },
    Telefone_do_M_dico: { maxLength: 20, policy: POLICY_ERROR },
    CRM_do_M_dico: { maxLength: 20, policy: POLICY_ERROR },
    Nome_Produto: { maxLength: 500, policy: POLICY_TRUNCATE },
    Quantidade_Produto: { maxLength: 200, policy: POLICY_TRUNCATE },
    Invoice_Pedido: { maxLength: 50, policy: POLICY_ERROR },
    AWB: { maxLength: 100, policy: POLICY_ERROR },
    N_mero_de_lote: { maxLength: 100, policy: POLICY_ERROR },
  },
  Portal_onix: {
    Protocolo_Portal: { maxLength: 20, policy: POLICY_ERROR },
    Name: { maxLength: 120, policy: POLICY_ERROR },
    Sobrenome: { maxLength: 120, policy: POLICY_ERROR },
    CPF: { maxLength: 11, policy: POLICY_ERROR },
    CNPJ: { maxLength: 14, policy: POLICY_ERROR },
    Email: { maxLength: 255, policy: POLICY_ERROR },
    RG: { maxLength: 20, policy: POLICY_ERROR },
    Celular: { maxLength: 20, policy: POLICY_ERROR },
    Telefone: { maxLength: 20, policy: POLICY_ERROR },
    Rua: { maxLength: 255, policy: POLICY_ERROR },
    Bairro: { maxLength: 100, policy: POLICY_ERROR },
    Cidade: { maxLength: 100, policy: POLICY_ERROR },
    Estado: { maxLength: 2, policy: POLICY_ERROR },
    CEP: { maxLength: 8, policy: POLICY_ERROR },
    Pa_s: { maxLength: 60, policy: POLICY_ERROR },
    Complemento: { maxLength: 120, policy: POLICY_ERROR },
    Tipo_Cliente: { maxLength: 40, policy: POLICY_ERROR },
    Tipo_de_pedido: { maxLength: 40, policy: POLICY_ERROR },
    Consultor_Tegra: { maxLength: 120, policy: POLICY_ERROR },
    Nome_do_representante_legal: { maxLength: 120, policy: POLICY_ERROR },
    RG_do_representante_legal: { maxLength: 20, policy: POLICY_ERROR },
    E_mail_do_representante_legal: { maxLength: 255, policy: POLICY_ERROR },
    CPF_do_representante_legal: { maxLength: 11, policy: POLICY_ERROR },
    Celular_Representante_Legal: { maxLength: 20, policy: POLICY_ERROR },
    Celular_do_m_dico: { maxLength: 20, policy: POLICY_ERROR },
    CRM_do_m_dico: { maxLength: 20, policy: POLICY_ERROR },
    E_mail_2: { maxLength: 255, policy: POLICY_ERROR },
    Especialidade_do_m_dico: { maxLength: 120, policy: POLICY_ERROR },
    Nome_do_m_dico: { maxLength: 120, policy: POLICY_ERROR },
    UF_do_CRM: { maxLength: 2, policy: POLICY_ERROR },
    Solicitar_Link_de_Pagamento: { maxLength: 40, policy: POLICY_ERROR },
    Tipo_de_link: { maxLength: 40, policy: POLICY_ERROR },
    Forma_de_Pagamento: { maxLength: 60, policy: POLICY_ERROR },
    Termos_e_condi_es: { maxLength: 5000, policy: POLICY_TRUNCATE },
    Observa_es: { maxLength: 5000, policy: POLICY_TRUNCATE },
    Nome_do_representante: { maxLength: 120, policy: POLICY_ERROR },
    E_mail_do_representante: { maxLength: 255, policy: POLICY_ERROR },
    Celular_do_representante: { maxLength: 20, policy: POLICY_ERROR },
    "Produtos_Portal_Onix[].Produto": {
      maxLength: 120,
      policy: POLICY_ERROR,
    },
    "Produtos_Portal_Onix[].Quantidade": {
      maxLength: 20,
      policy: POLICY_ERROR,
    },
  },
};

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record || {}));
}

function normalizeStateText(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBrazilStateToUF(value) {
  const normalizedText = normalizeStateText(value);
  if (!normalizedText) {
    return "";
  }

  const compact = normalizedText.replace(/\s+/g, "");
  if (BRAZIL_UF_SET.has(compact)) {
    return compact;
  }

  if (BRAZIL_STATE_NAME_TO_UF[normalizedText]) {
    return BRAZIL_STATE_NAME_TO_UF[normalizedText];
  }

  if (BRAZIL_STATE_NAME_TO_UF[compact]) {
    return BRAZIL_STATE_NAME_TO_UF[compact];
  }

  return compact.slice(0, 2);
}

function preprocessRecordByModule(moduleName, record) {
  if (!record || typeof record !== "object") {
    return;
  }

  if (moduleName === "Portal_onix") {
    if (record.Estado !== undefined) {
      record.Estado = normalizeBrazilStateToUF(record.Estado);
    }
    if (record.UF_do_CRM !== undefined) {
      record.UF_do_CRM = normalizeBrazilStateToUF(record.UF_do_CRM);
    }
  }

  if (moduleName === "Ocorrencias") {
    if (record.UF_do_M_dico !== undefined) {
      record.UF_do_M_dico = normalizeBrazilStateToUF(record.UF_do_M_dico);
    }
  }
}

function buildError(field, maxLength, receivedLength, index) {
  return {
    field,
    maxLength,
    receivedLength,
    ...(typeof index === "number" ? { index } : {}),
  };
}

function enforceStringConstraint({
  value,
  field,
  maxLength,
  policy,
  errors,
  warnings,
  index,
}) {
  if (value === null || value === undefined) {
    return value;
  }

  const normalized = typeof value === "string" ? value : String(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (policy === POLICY_TRUNCATE) {
    warnings.push({
      field,
      maxLength,
      receivedLength: normalized.length,
      action: "truncated",
      ...(typeof index === "number" ? { index } : {}),
    });
    return normalized.slice(0, maxLength);
  }

  errors.push(buildError(field, maxLength, normalized.length, index));
  return normalized;
}

function applyFieldConstraint(record, fieldPath, constraint, errors, warnings) {
  const { maxLength, policy } = constraint;

  if (fieldPath.includes("[].")) {
    const [parent, child] = fieldPath.split("[].");
    const collection = record[parent];
    if (!Array.isArray(collection)) {
      return;
    }

    collection.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        return;
      }

      item[child] = enforceStringConstraint({
        value: item[child],
        field: `${parent}.${child}`,
        maxLength,
        policy,
        errors,
        warnings,
        index,
      });
    });
    return;
  }

  record[fieldPath] = enforceStringConstraint({
    value: record[fieldPath],
    field: fieldPath,
    maxLength,
    policy,
    errors,
    warnings,
  });
}

export function applyZohoFieldConstraints(moduleName, record) {
  const constraints = MODULE_CONSTRAINTS[moduleName];
  if (!constraints) {
    return {
      data: cloneRecord(record),
      errors: [],
      warnings: [],
      hasBlockingErrors: false,
    };
  }

  const output = cloneRecord(record);
  preprocessRecordByModule(moduleName, output);
  const errors = [];
  const warnings = [];

  Object.entries(constraints).forEach(([fieldPath, constraint]) => {
    applyFieldConstraint(output, fieldPath, constraint, errors, warnings);
  });

  return {
    data: output,
    errors,
    warnings,
    hasBlockingErrors: errors.length > 0,
  };
}