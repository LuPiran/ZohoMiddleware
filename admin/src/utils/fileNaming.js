/**
 * Utilitário para geração automática de nomes de arquivo de documentação
 * nos formulários de Compra e Recompra.
 *
 * Padrão:
 *   1_Receita_Medica-Nome_Sobrenome.ext
 *   2_RG_CPF_CIN_CRM-Certidao_de_Nascimento-Nome_Sobrenome.ext
 *   3_Comprovante_de_Endereco-Nome_Sobrenome.ext
 *   4_Comprovante_de_Pagamento_PIX_Itau-Nome_Sobrenome.ext
 *   012345.67891012_2026-Autorizacao_Importacao_Anvisa-Nome_Sobrenome.ext
 *
 * "Primeiro e último nome": pega a primeira palavra de `nome` e a última de `sobrenome`.
 */

/** Remove acentos, substitui espaços/chars especiais por underscore. */
export function normalizarParaArquivo(str) {
  // NFD decompõe letras acentuadas em letra base + marca diacrítica.
  // A regex \p{M} remove todas as marcas diacríticas (combining characters).
  return String(str || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")            // remove diacríticos (unicode property)
    .trim()
    .replace(/[^a-zA-Z0-9.\-]/g, "_") // chars inválidos → underscore
    .replace(/_+/g, "_")              // colapsa underscores consecutivos
    .replace(/^_+|_+$/g, "");         // apara bordas
}

/**
 * Retorna "PrimeiroPalavra_ÚltimaPalavra" a partir de nome + sobrenome.
 * Ex: nome="Neli Maria", sobrenome="Barbosa Santos" → "Neli_Santos"
 */
export function nomeAbreviadoPaciente(nome, sobrenome) {
  const partsNome = String(nome || "").trim().split(/\s+/);
  const partsSobre = String(sobrenome || "").trim().split(/\s+/);
  const primeiro = partsNome[0] || "";
  const ultimo = partsSobre[partsSobre.length - 1] || "";
  return normalizarParaArquivo(`${primeiro}_${ultimo}`);
}

/**
 * Gera o nome final do arquivo com base no tipo de documento e dados do paciente.
 *
 * @param {object} params
 * @param {string} params.tipoDocumento  — chave do tipo (ver TIPOS_DOCUMENTO)
 * @param {string} params.extensao       — extensão original do arquivo (sem ponto)
 * @param {string} params.nomePaciente
 * @param {string} params.sobrenomePaciente
 * @param {string} [params.detalhe]      — usado em "pagamento" (ex: "PIX Itau") e
 *                                         "anvisa" (ex: "012345.67891012_2026")
 * @returns {string} nome do arquivo (com extensão)
 */
export function gerarNomeArquivo({
  tipoDocumento,
  extensao,
  nomePaciente,
  sobrenomePaciente,
  detalhe,
}) {
  const nomeP = nomeAbreviadoPaciente(nomePaciente, sobrenomePaciente);
  const ext = extensao || "bin";

  switch (tipoDocumento) {
    case "receita":
      return `1_Receita_Medica-${nomeP}.${ext}`;

    case "rg_cpf":
      return `2_RG_CPF_CIN_CRM-Certidao_de_Nascimento-${nomeP}.${ext}`;

    case "endereco":
      return `3_Comprovante_de_Endereco-${nomeP}.${ext}`;

    case "pagamento": {
      const detalheNorm = normalizarParaArquivo(detalhe || "Pagamento");
      return `4_Comprovante_de_Pagamento_${detalheNorm}-${nomeP}.${ext}`;
    }

    case "anvisa": {
      const numNorm = normalizarParaArquivo(detalhe || "0");
      return `${numNorm}-Autorizacao_Importacao_Anvisa-${nomeP}.${ext}`;
    }

    default:
      return null; // null = manter nome original
  }
}

/** Lista de tipos de documento para o Select. */
export const TIPOS_DOCUMENTO = [
  { value: "",         label: "Selecione o tipo de documento" },
  { value: "receita",  label: "1 — Receita Médica" },
  { value: "rg_cpf",   label: "2 — RG / CPF / CIN / CRM + Certidão de Nascimento" },
  { value: "endereco", label: "3 — Comprovante de Endereço" },
  { value: "pagamento",label: "4 — Comprovante de Pagamento" },
  { value: "anvisa",   label: "Autorização de Importação Anvisa" },
];
