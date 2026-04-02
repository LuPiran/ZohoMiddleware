/**
 * Normaliza telefone brasileiro para DDD + número (10 ou 11 dígitos),
 * aceitando entradas com +55/55.
 */
export function sanitizeBrazilPhoneForApi(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}
