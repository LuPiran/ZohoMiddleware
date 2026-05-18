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

export function normalizeStateToUF(value) {
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
