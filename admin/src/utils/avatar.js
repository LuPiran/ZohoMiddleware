/**
 * Utilitários para avatar do usuário
 */

/**
 * Extrai as iniciais do nome do usuário
 * @param {string} nome - Nome completo do usuário
 * @returns {string} Iniciais (ex: "Lucas Piran" -> "LP")
 */
export function getInitials(nome) {
  if (!nome || typeof nome !== "string") {
    return "U"; // Fallback para "Usuário"
  }

  // Remove espaços extras e divide em palavras
  const palavras = nome.trim().split(/\s+/).filter(Boolean);

  if (palavras.length === 0) {
    return "U";
  }

  if (palavras.length === 1) {
    // Se tiver apenas uma palavra, pega as duas primeiras letras
    return palavras[0].substring(0, 2).toUpperCase();
  }

  // Pega a primeira letra do primeiro nome e a primeira letra do último nome
  const primeiraLetra = palavras[0].charAt(0).toUpperCase();
  const ultimaLetra = palavras[palavras.length - 1].charAt(0).toUpperCase();

  return `${primeiraLetra}${ultimaLetra}`;
}

/**
 * Função auxiliar para extrair URL da imagem (pode vir como string ou objeto)
 * @param {any} campo - Campo que pode conter a URL da imagem
 * @returns {string|null} URL da imagem ou null
 */
function extrairUrlImagem(campo) {
  if (!campo) return null;

  // Se for string, retorna direto (remove espaços)
  if (typeof campo === "string") {
    return campo.trim() || null;
  }

  // Se for objeto, tenta extrair a URL
  if (typeof campo === "object") {
    return (
      campo.url ||
      campo.URL ||
      campo.download_url ||
      campo.downloadUrl ||
      campo.link ||
      campo.Link ||
      campo.src ||
      campo.Src ||
      null
    );
  }

  return null;
}

/**
 * Obtém a URL da foto do usuário do Zoho
 * @param {Object} usuario - Objeto com dados do usuário
 * @returns {string|null} URL da foto ou null se não houver
 */
export function getUserPhoto(usuario) {
  if (!usuario) return null;

  // Primeiro tenta o campo 'foto' que vem do backend (já processado)
  if (usuario.foto) {
    const fotoExtraida = extrairUrlImagem(usuario.foto);
    if (fotoExtraida) return fotoExtraida;
    // Se não conseguiu extrair, retorna o valor original
    if (typeof usuario.foto === "string") return usuario.foto;
  }

  // Lista de campos comuns do Zoho para buscar imagem
  const camposImagem = [
    "Record_Image",
    "record_image",
    "Photo",
    "photo",
    "Avatar",
    "avatar",
    "Profile_Picture",
    "profile_picture",
    "Imagem",
    "imagem",
    "Foto",
    "foto",
    "Photo_URL",
    "photo_url",
    "Avatar_URL",
    "avatar_url",
    "Image",
    "image",
    "Picture",
    "picture",
    "Profile_Photo",
    "profile_photo",
  ];

  // Tenta cada campo na ordem
  for (const campo of camposImagem) {
    if (usuario[campo]) {
      const fotoExtraida = extrairUrlImagem(usuario[campo]);
      if (fotoExtraida) {
        return fotoExtraida;
      }
    }
  }

  // Se não encontrou nos campos conhecidos, busca em todos os campos do objeto
  // que contenham palavras-chave relacionadas a imagem
  for (const [key, value] of Object.entries(usuario)) {
    const keyLower = key.toLowerCase();
    if (
      (keyLower.includes("photo") ||
        keyLower.includes("image") ||
        keyLower.includes("avatar") ||
        keyLower.includes("foto") ||
        keyLower.includes("imagem") ||
        keyLower.includes("picture")) &&
      value
    ) {
      const fotoExtraida = extrairUrlImagem(value);
      if (fotoExtraida) {
        return fotoExtraida;
      }
    }
  }

  return null;
}
