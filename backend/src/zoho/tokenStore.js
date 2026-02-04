const tokenStore = {
  accessToken: null,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN || null,
  expiresAt: null, // timestamp em ms

  setTokens({ accessToken, refreshToken, expiresIn }) {
    this.accessToken = accessToken;

    if (refreshToken) {
      this.refreshToken = refreshToken;
      console.log("[TOKEN STORE] Refresh token atualizado");
    }

    // expiresIn vem em segundos
    this.expiresAt = Date.now() + expiresIn * 1000;
    console.log("[TOKEN STORE] Tokens salvos com sucesso");
    console.log(
      "[TOKEN STORE] Token expira em:",
      new Date(this.expiresAt).toLocaleString(),
    );
  },

  getAccessToken() {
    return this.accessToken;
  },

  getRefreshToken() {
    // Se não tiver refresh token em memória, tenta pegar da variável de ambiente
    if (!this.refreshToken && process.env.ZOHO_REFRESH_TOKEN) {
      console.log(
        "[TOKEN STORE] Inicializando refresh token a partir da variável de ambiente",
      );
      this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    }
    return this.refreshToken;
  },

  isTokenExpired() {
    if (!this.expiresAt) {
      console.log(
        "[TOKEN STORE] Token não tem data de expiração, considerado expirado",
      );
      return true;
    }
    const isExpired = Date.now() >= this.expiresAt;
    if (isExpired) {
      console.log(
        "[TOKEN STORE] Token expirado em:",
        new Date(this.expiresAt).toLocaleString(),
      );
    }
    return isExpired;
  },

  clear() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  },
};

export default tokenStore;
