/**
 * Processa erros de validação do backend (limite de caracteres, etc.)
 * e retorna um objeto estruturado para exibição na UI
 * @param {Error} error - Erro da requisição (axios error)
 * @param {Function} showToast - Função do toast (showToast)
 * @param {Object} options - Opções adicionais { fieldMapping, scrollToField }
 * @returns {Object} { message, details, firstField }
 */
export const handleValidationError = (error, showToast, options = {}) => {
  const { fieldMapping = {}, scrollToField = null } = options;

  const responseData = error?.response?.data || {};
  const validationDetails =
    Array.isArray(responseData.details) && responseData.details.length > 0
      ? responseData.details
      : Array.isArray(error?.details) && error.details.length > 0
        ? error.details
        : [];

  // Se não há detalhes de validação, retorna erro genérico
  if (validationDetails.length === 0) {
    const errorMessage =
      responseData.error ||
      error.error ||
      error.message ||
      "Erro ao enviar formulário. Tente novamente.";

    if (showToast) {
      showToast(`❌ ${errorMessage}`, "error");
    }

    console.error("Erro na requisição:", { error, errorMessage });

    return {
      message: errorMessage,
      details: [],
      firstField: null,
      isValidationError: false,
    };
  }

  // Processa detalhes de validação
  const processedDetails = validationDetails.map((item) => {
    const limite =
      typeof item.maxLength === "number" ? item.maxLength : "?";
    const recebido =
      typeof item.receivedLength === "number" ? item.receivedLength : "?";

    // Tenta encontrar o label amigável do campo
    const fieldLabel = fieldMapping[item.field] || item.field;

    return {
      field: item.field,
      fieldLabel,
      maxLength: limite,
      receivedLength: recebido,
      index: item.index,
    };
  });

  // Prepara mensagem do toast
  const firstField = processedDetails[0];
  const toastMessage = `❌ ${firstField.fieldLabel} excedeu o limite (${firstField.receivedLength}/${firstField.maxLength} caracteres)`;

  // Mostra toast
  if (showToast) {
    showToast(toastMessage, "error");
  }

  // Log detalhado no console para debug
  console.error("Erro de validação de campos:", {
    campos: processedDetails.map(
      (d) =>
        `${d.fieldLabel} (${d.receivedLength}/${d.maxLength})`
    ),
    detalhes: processedDetails,
    erro: responseData.error,
  });

  // Scroll para o primeiro campo com erro (se ID fornecido)
  if (scrollToField && firstField.field) {
    const elementId = scrollToField(firstField.field);
    if (elementId) {
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Opcional: adiciona highlight visual
          element.style.boxShadow = "0 0 0 3px rgba(244, 67, 54, 0.3)";
          setTimeout(
            () => {
              element.style.boxShadow = "";
            },
            3000
          );
        }
      }, 100);
    }
  }

  return {
    message: toastMessage,
    details: processedDetails,
    firstField,
    isValidationError: true,
  };
};

/**
 * Mapeia nomes de campos técnicos para labels amigáveis
 * Diferentes formulários podem sobrescrever isso
 */
export const DEFAULT_FIELD_MAPPING = {
  // Campos de paciente/cliente
  Protocolo_Portal: "Protocolo",
  Name: "Nome",
  Sobrenome: "Sobrenome",
  Primeiro_Nome: "Nome",
  Segundo_Nome: "Sobrenome",
  CPF: "CPF",
  CPF_Cliente: "CPF",
  CPF_do_representante_legal: "CPF do Representante",
  Email: "E-mail",
  E_mail_do_Cliente: "E-mail",
  E_mail_do_representante_legal: "E-mail do Representante",
  RG: "RG",
  RG_do_representante_legal: "RG do Representante",
  Celular: "Celular",
  Celular_Cliente: "Celular",
  Celular_Representante_Legal: "Celular do Representante",
  Telefone: "Telefone",
  Telefone_do_M_dico: "Telefone do Médico",

  // Endereço
  Rua: "Rua",
  Bairro: "Bairro",
  Cidade: "Cidade",
  Estado: "Estado (UF)",
  CEP: "CEP",
  Pa_s: "País",
  Complemento: "Complemento",

  // Médico/CRM
  Nome_do_m_dico: "Nome do Médico",
  M_dico_Prescritor_Portal: "Médico Prescritor",
  E_mail_do_M_dico: "E-mail do Médico",
  E_mail_2: "E-mail do Médico",
  UF_do_CRM: "UF do CRM",
  UF_do_M_dico: "UF do Médico",
  CRM_do_m_dico: "CRM do Médico",
  CRM_do_M_dico: "CRM do Médico",
  Celular_do_m_dico: "Celular do Médico",
  Especialidade_do_m_dico: "Especialidade do Médico",

  // Outros
  Consultor_Tegra: "Consultor Tegra",
  Nome_consultor_Tegra: "Consultor Tegra",
  Tipo_Cliente: "Tipo de Cliente",
  Tipo_de_pedido: "Tipo de Pedido",
  Forma_de_Pagamento: "Forma de Pagamento",
  Termos_e_condi_es: "Termos e Condições",
  Observa_es: "Observação",
  Observa_es_Ocorr_ncia: "Observação da Ocorrência",
  Nome_Produto: "Nome do Produto",
  Quantidade_Produto: "Quantidade do Produto",
  Invoice_Pedido: "Invoice/Pedido",
  AWB: "AWB",
  N_mero_de_lote: "Número de Lote",
  "Produtos_Portal_Onix[].Produto": "Produto",
  "Produtos_Portal_Onix[].Quantidade": "Quantidade do Produto",
};
