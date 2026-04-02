/**
 * Normaliza telefone brasileiro para DDD + número (10 ou 11 dígitos),
 * aceitando entradas com +55/55 para facilitar colagem.
 */
export function normalizeBrazilPhoneInput(value) {
  const rawValue = String(value || "").trim();
  let digits = rawValue.replace(/\D/g, "");

  // Quando o próprio campo já está com "+55 (...)" na tela, removemos o DDI
  // antes de aplicar a máscara para não duplicar "55" a cada tecla.
  const hasExplicitBrazilCountryCode = /^\+\s*55/.test(rawValue);

  if (hasExplicitBrazilCountryCode && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

/**
 * Formata para visual com DDI brasileiro fixo: +55 (11) 99999-9999
 */
export function formatBrazilPhone(value) {
  const digits = normalizeBrazilPhoneInput(value);

  if (!digits) return "";
  if (digits.length <= 2) return `+55 (${digits}`;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);

  if (number.length <= 4) {
    return `+55 (${ddd}) ${number}`;
  }

  if (digits.length <= 10) {
    const first = number.slice(0, 4);
    const second = number.slice(4);
    return `+55 (${ddd}) ${first}${second ? `-${second}` : ""}`;
  }

  const first = number.slice(0, 5);
  const second = number.slice(5, 9);
  return `+55 (${ddd}) ${first}${second ? `-${second}` : ""}`;
}

/**
 * Formata telefone local sem DDI: (11) 99999-9999
 */
export function formatBrazilPhoneLocal(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);

  if (number.length <= 4) {
    return `(${ddd}) ${number}`;
  }

  if (digits.length <= 10) {
    const first = number.slice(0, 4);
    const second = number.slice(4);
    return `(${ddd}) ${first}${second ? `-${second}` : ""}`;
  }

  const first = number.slice(0, 5);
  const second = number.slice(5, 9);
  return `(${ddd}) ${first}${second ? `-${second}` : ""}`;
}
