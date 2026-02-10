/**
 * Gera um número de protocolo único no formato P + 7 dígitos
 * Exemplo: P1234567
 * @returns {string} Número de protocolo gerado
 */
export function gerarNumeroProtocolo() {
  // Gera 7 dígitos aleatórios (1000000 a 9999999)
  const numeroAleatorio = Math.floor(1000000 + Math.random() * 9000000);
  
  // Retorna o protocolo no formato P + 7 dígitos
  return `P${numeroAleatorio}`;
}

/**
 * Valida se um número de protocolo está no formato correto
 * @param {string} protocolo - Número de protocolo a validar
 * @returns {boolean} True se o protocolo é válido
 */
export function validarProtocolo(protocolo) {
  // Verifica se começa com P e tem 7 dígitos depois
  const regex = /^P\d{7}$/;
  return regex.test(protocolo);
}
