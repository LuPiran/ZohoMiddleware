/**
 * Valida se um email é válido
 * @param {string} email - Email a validar
 * @returns {boolean} - true se email é válido, false caso contrário
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Sanitiza e valida email
 * @param {string} email - Email a sanitizar
 * @returns {object} - { isValid: boolean, value: string, error: string|null }
 */
export const validateAndSanitizeEmail = (email) => {
  const trimmed = String(email || "").trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      value: "",
      error: "Email é obrigatório",
    };
  }
  
  // Verifica formato básico
  if (!isValidEmail(trimmed)) {
    return {
      isValid: false,
      value: trimmed,
      error: "Email inválido. Deve estar no formato: exemplo@dominio.com",
    };
  }
  
  // Verifica se tem pelo menos um ponto após o @
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return {
      isValid: false,
      value: trimmed,
      error: "Email deve conter exatamente um @",
    };
  }
  
  const domain = parts[1];
  if (!domain.includes(".")) {
    return {
      isValid: false,
      value: trimmed,
      error: "Domínio do email inválido. Ex: hotmail.com, gmail.com",
    };
  }
  
  return {
    isValid: true,
    value: trimmed,
    error: null,
  };
};
