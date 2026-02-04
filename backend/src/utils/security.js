import bcrypt from "bcrypt";

/**
 * Compara senha de forma segura (proteção contra timing attacks)
 * @param {string} senhaFornecida - Senha fornecida pelo usuário
 * @param {string} senhaArmazenada - Senha armazenada (pode ser hash ou texto plano)
 * @returns {Promise<boolean>} true se as senhas correspondem
 */
export async function comparePassword(senhaFornecida, senhaArmazenada) {
  // Se a senha armazenada parece ser um hash bcrypt (começa com $2a$, $2b$, ou $2y$)
  if (senhaArmazenada.match(/^\$2[ayb]\$.{56}$/)) {
    return await bcrypt.compare(senhaFornecida, senhaArmazenada);
  }

  // Se não for hash, compara de forma segura usando timing-safe comparison
  // Usa bcrypt mesmo para texto plano para manter tempo constante
  const hash = await bcrypt.hash(senhaArmazenada, 10);
  return await bcrypt.compare(senhaFornecida, hash);
}

/**
 * Sanitiza string para prevenir injection
 * @param {string} input - String a ser sanitizada
 * @returns {string} String sanitizada
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove tags HTML
    .substring(0, 255); // Limita tamanho
}

/**
 * Valida formato de email
 * @param {string} email - Email a ser validado
 * @returns {boolean} true se válido
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Registra tentativa de login suspeita
 * @param {string} email - Email usado na tentativa
 * @param {string} ip - IP do cliente
 * @param {boolean} sucesso - Se o login foi bem-sucedido
 */
export function logSecurityEvent(email, ip, sucesso) {
  const timestamp = new Date().toISOString();
  const status = sucesso ? "SUCESSO" : "FALHA";

  console.log(
    `[SECURITY] ${timestamp} - Login ${status} - Email: ${email} - IP: ${ip}`,
  );

  // Em produção, você pode querer salvar isso em um banco de dados ou serviço de logging
  if (!sucesso) {
    console.warn(`[SECURITY] Tentativa de login falhada detectada`);
  }
}
