import axios from "axios";
import tokenStore from "./tokenStore.js";

async function gerarAcessToken() {
  console.log("[ZOHO AUTH] Verificando token de acesso...");

  // Se já existe token válido, reutiliza
  if (tokenStore.getAccessToken() && !tokenStore.isTokenExpired()) {
    console.log(
      "[ZOHO AUTH] ✓ Token válido encontrado, reutilizando token existente",
    );
    return tokenStore.getAccessToken();
  }

  console.log(
    "[ZOHO AUTH] Token expirado ou não encontrado, gerando novo token...",
  );

  // Se não tiver refresh token, erro
  if (!tokenStore.getRefreshToken()) {
    console.error("[ZOHO AUTH] ✗ ERRO: Refresh token não encontrado");
    throw new Error("Refresh token não encontrado");
  }

  const url = "https://accounts.zoho.com/oauth/v2/token";

  const refreshToken = tokenStore.getRefreshToken();
  console.log(
    "[ZOHO AUTH] Refresh token:",
    refreshToken ? "✓ Encontrado" : "✗ Não encontrado",
  );

  const params = {
    refresh_token: refreshToken,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  };

  console.log("[ZOHO AUTH] Fazendo requisição para obter novo access token...");
  console.log("[ZOHO AUTH] URL:", url);
  console.log(
    "[ZOHO AUTH] Client ID:",
    process.env.ZOHO_CLIENT_ID ? "✓ Configurado" : "✗ Não configurado",
  );

  try {
    const response = await axios.post(url, null, { params });

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      console.error(
        "[ZOHO AUTH] ✗ ERRO: Access token não retornado na resposta",
      );
      throw new Error("Access token não retornado na resposta");
    }

    tokenStore.setTokens({
      accessToken: access_token,
      expiresIn: expires_in,
    });

    console.log("[ZOHO AUTH] ✓ Sucesso! Novo access token obtido");
    console.log("[ZOHO AUTH] Token expira em:", expires_in, "segundos");
    console.log(
      "[ZOHO AUTH] Token expira em:",
      new Date(Date.now() + expires_in * 1000).toLocaleString(),
    );

    return access_token;
  } catch (error) {
    console.error("[ZOHO AUTH] ✗ ERRO ao obter access token:");
    console.error("[ZOHO AUTH] Status:", error.response?.status);
    console.error(
      "[ZOHO AUTH] Mensagem:",
      error.response?.data || error.message,
    );
    console.error("[ZOHO AUTH] Detalhes completos:", error.response?.data);
    throw error;
  }
}

export default gerarAcessToken;
