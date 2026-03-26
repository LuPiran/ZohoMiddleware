/**
 * Valida um CPF usando o algoritmo de dígito verificador
 * @param {string} cpf - CPF formatado ou não
 * @returns {boolean} - true se CPF é válido, false caso contrário
 */
export const isValidCPF = (cpf) => {
  // Remove caracteres especiais
  const cpfLimpo = cpf.replace(/\D/g, "");

  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

  // Calcula o primeiro dígito verificador
  let soma = 0;
  let multiplicador = 10;

  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * multiplicador;
    multiplicador--;
  }

  let resto = soma % 11;
  const primeiroDigito = resto < 2 ? 0 : 11 - resto;

  // Calcula o segundo dígito verificador
  soma = 0;
  multiplicador = 11;

  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * multiplicador;
    multiplicador--;
  }

  resto = soma % 11;
  const segundoDigito = resto < 2 ? 0 : 11 - resto;

  // Verifica se os dígitos verificadores são corretos
  return (
    primeiroDigito === parseInt(cpfLimpo.charAt(9)) &&
    segundoDigito === parseInt(cpfLimpo.charAt(10))
  );
};

/**
 * Formata um CPF para o padrão XXX.XXX.XXX-XX
 * @param {string} cpf - CPF sem formatação
 * @returns {string} - CPF formatado
 */
export const formatarCpf = (valor) => {
  const cpf = valor.replace(/\D/g, "");
  if (cpf.length <= 3) {
    return cpf;
  } else if (cpf.length <= 6) {
    return cpf.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  } else if (cpf.length <= 9) {
    return cpf.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  } else {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  }
};
