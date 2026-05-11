import { STORAGE_KEYS } from "../utils/constants";
import { supabase } from "./supabaseClient";

// Evita bater no endpoint de OTP em excesso (rate limit) durante cliques repetidos
// ou reenviagens em curto intervalo.
// A janela de rate limit do Supabase para OTP pode ser maior que 1 minuto
// (configurável no painel). Para evitar nova explosão de 429, usamos 5 minutos.
const OTP_COOLDOWN_MS = 300_000; // 5 minutos

/**
 * Serviço de autenticação
 */
export const authService = {
  _isOtpRateLimited(err) {
    const status = err?.status || err?.statusCode;
    if (status === 429) return true;

    const msg = err?.message || "";
    const msgLower = String(msg).toLowerCase();
    return (
      msgLower.includes("too many requests") ||
      msgLower.includes("429") ||
      msgLower.includes("rate limit") ||
      msgLower.includes("rate-limited")
    );
  },

  /** 500 no /otp costuma ser falha ao enviar e-mail (SMTP no painel do Supabase). */
  _otpSendFailureMessage(err) {
    const status = err?.status || err?.statusCode;
    const raw = String(err?.message || "").toLowerCase();
    if (
      status === 500 ||
      raw.includes("internal server error") ||
      raw.includes("error sending") ||
      raw.includes("smtp")
    ) {
      return "Nao foi possivel enviar o e-mail de verificacao. No Supabase: Project Settings > Authentication > SMTP (host, porta, usuario e senha corretos). Se usar Hostinger, confira os dados SMTP no painel deles.";
    }
    return err?.message || "Erro ao enviar codigo por e-mail.";
  },

  _getOtpCooldownRemainingMs(email) {
    const now = Date.now();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const lastEmail = (localStorage.getItem(STORAGE_KEYS.MFA_LAST_OTP_EMAIL) ||
      "")
      .trim()
      .toLowerCase();
    const lastAtRaw = localStorage.getItem(STORAGE_KEYS.MFA_LAST_OTP_SENT_AT);

    const lastAt = lastAtRaw ? Number(lastAtRaw) : NaN;
    if (!normalizedEmail || !lastEmail || !Number.isFinite(lastAt)) return 0;
    if (lastEmail !== normalizedEmail) return 0;

    const elapsed = now - lastAt;
    if (elapsed >= OTP_COOLDOWN_MS) return 0;

    return OTP_COOLDOWN_MS - elapsed;
  },

  _markOtpSent(email) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    localStorage.setItem(STORAGE_KEYS.MFA_LAST_OTP_SENT_AT, String(Date.now()));
    localStorage.setItem(STORAGE_KEYS.MFA_LAST_OTP_EMAIL, normalizedEmail);
  },

  resolveAuthStorage() {
    const sessionHasAuth =
      sessionStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true" &&
      !!sessionStorage.getItem(STORAGE_KEYS.TOKEN) &&
      !!sessionStorage.getItem(STORAGE_KEYS.USER);

    if (sessionHasAuth) {
      return sessionStorage;
    }

    return localStorage;
  },

  async login(email, senha, rememberMe = false) {
    let emailForOtp = null;
    try {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());
      if (rememberMe) {
        sessionStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        throw {
          error: error.message,
          message: error.message,
          status: 401,
        };
      }

      if (!data?.user || !data?.session) {
        throw {
          error: "Falha ao iniciar sessao no Supabase.",
          message: "Falha ao iniciar sessao no Supabase.",
          status: 500,
        };
      }

      const user = data.user;
      let profile = null;
      let profileError = null;

      const tableCandidates = ["Usuario", "usuario", "users"];
      for (const tableName of tableCandidates) {
        const profileResult = await supabase
          .from(tableName)
          .select("id, nome, email, tipo, ativo, equipe_id, foto")
          .eq("email", user.email)
          .maybeSingle();

        if (!profileResult.error && profileResult.data) {
          profile = profileResult.data;
          break;
        }
        profileError = profileResult.error;
      }

      if (!profile && profileError) {
        throw {
          error: `Erro ao carregar usuario: ${profileError.message}`,
          message: profileError.message,
          status: 500,
        };
      }

      if (!profile) {
        throw {
          error: "Usuario nao encontrado na tabela Usuario.",
          message: "Usuario nao encontrado na tabela Usuario.",
          status: 403,
        };
      }

      if (!profile.ativo) {
        await supabase.auth.signOut();
        throw {
          error: "Usuario inativo. Entre em contato com o administrador.",
          message: "Usuario inativo. Entre em contato com o administrador.",
          status: 403,
        };
      }

      emailForOtp = String(user.email || "")
        .trim()
        .toLowerCase();
      const remainingMs = this._getOtpCooldownRemainingMs(emailForOtp);
      if (remainingMs > 0) {
        const remainingSec = Math.ceil(remainingMs / 1000);
        throw {
          error: `Aguarde ${remainingSec}s antes de solicitar um novo codigo.`,
          message: `Aguarde ${remainingSec}s antes de solicitar um novo codigo.`,
          status: 429,
        };
      }

      const otpResponse = await supabase.auth.signInWithOtp({
        email: emailForOtp,
        options: {
          shouldCreateUser: false,
        },
      });
      if (otpResponse.error) {
        // Se o rate limit disparou, registra para bloquear reenviagens imediatas.
        if (this._isOtpRateLimited(otpResponse.error)) {
          this._markOtpSent(emailForOtp);
        }
        const otpErr = otpResponse.error;
        const friendly = this._otpSendFailureMessage(otpErr);
        throw {
          error: friendly,
          message: friendly,
          status: this._isOtpRateLimited(otpErr)
            ? 429
            : otpErr.status || 500,
        };
      }

      this._markOtpSent(emailForOtp);
      sessionStorage.setItem(STORAGE_KEYS.MFA_PENDING, "true");
      sessionStorage.setItem(STORAGE_KEYS.MFA_PENDING_EMAIL, user.email);
      sessionStorage.setItem(STORAGE_KEYS.MFA_PENDING_REMEMBER, rememberMe.toString());

      let fotoUrl = profile.foto || user.user_metadata?.avatar_url || null;
      if (fotoUrl && typeof fotoUrl === "string" && !/^https?:\/\//i.test(fotoUrl)) {
        const normalizedPath = fotoUrl.replace(/^\/+/, "");
        const storagePath = normalizedPath.startsWith("Usuario/")
          ? normalizedPath
          : `Usuario/${normalizedPath}`;
        const { data: publicUrlData } = supabase.storage
          .from("tegrapharma")
          .getPublicUrl(storagePath);
        fotoUrl = publicUrlData?.publicUrl || fotoUrl;
      }

      const normalizedUser = {
        id: profile.id || user.id,
        supabase_id: user.id,
        email: profile.email || user.email,
        nome: profile.nome || user.user_metadata?.name || user.email,
        tipo: profile.tipo || "Consultor",
        ativo: !!profile.ativo,
        equipe_id: profile.equipe_id || null,
        foto: fotoUrl,
      };
      sessionStorage.setItem(STORAGE_KEYS.MFA_PENDING_USER, JSON.stringify(normalizedUser));

      // Garante que o acesso so sera liberado apos validacao do codigo de e-mail.
      await supabase.auth.signOut();

      return {
        success: true,
        usuario: normalizedUser,
        requires2fa: true,
      };
    } catch (error) {
      // Se o Supabase rate limitar e a lib jogar uma exceção,
      // ainda assim marcamos o cooldown para evitar novo 429 em sequência.
      if (emailForOtp && this._isOtpRateLimited(error)) {
        this._markOtpSent(emailForOtp);
      }
      throw {
        error: error.error || error.message || "Erro ao autenticar.",
        message: error.message || "Erro ao autenticar.",
        status: this._isOtpRateLimited(error) ? 429 : error.status || 500,
      };
    }
  },

  getStorage() {
    return this.resolveAuthStorage();
  },

  saveUser(usuario, token, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;

    // Salva a preferência de "Manter conectado" no localStorage para persistir
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());

    // Salva os dados de autenticação no storage apropriado
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(usuario));
    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");

    // Se não for "Manter conectado", limpa o localStorage para evitar dados duplicados
    if (!rememberMe) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    }
  },

  async logout() {
    await supabase.auth.signOut();
    // Limpa localStorage
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    // Limpa sessionStorage
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING_EMAIL);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING_USER);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING_REMEMBER);
  },

  getUser() {
    const storage = this.getStorage();
    const user = storage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    // Verifica em ambos os storages para garantir que não há dados residuais
    const localStorageAuth =
      localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true";
    const sessionStorageAuth =
      sessionStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true";

    // Também verifica se existe token e usuário
    const hasToken =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const hasUser =
      localStorage.getItem(STORAGE_KEYS.USER) ||
      sessionStorage.getItem(STORAGE_KEYS.USER);

    // Retorna true apenas se tiver autenticação E token E usuário
    return (localStorageAuth || sessionStorageAuth) && hasToken && hasUser;
  },

  isMfaPending() {
    return sessionStorage.getItem(STORAGE_KEYS.MFA_PENDING) === "true";
  },

  async verifyMfa(code) {
    const pendingEmail = sessionStorage.getItem(STORAGE_KEYS.MFA_PENDING_EMAIL);
    const rememberMe =
      sessionStorage.getItem(STORAGE_KEYS.MFA_PENDING_REMEMBER) === "true";
    const pendingUserRaw = sessionStorage.getItem(STORAGE_KEYS.MFA_PENDING_USER);
    const pendingUser = pendingUserRaw ? JSON.parse(pendingUserRaw) : null;

    if (!pendingEmail) {
      throw {
        error: "Desafio de e-mail nao encontrado. Faca login novamente.",
        status: 400,
      };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: "email",
    });

    if (error || !data?.session?.access_token) {
      throw {
        error: error?.message || "Codigo de verificacao invalido.",
        status: 401,
      };
    }

    const userToPersist = pendingUser || this.getUser();
    if (!userToPersist) {
      throw {
        error: "Usuario pendente nao encontrado. Faca login novamente.",
        status: 400,
      };
    }

    this.saveUser(userToPersist, data.session.access_token, rememberMe);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING_EMAIL);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING_USER);
    sessionStorage.removeItem(STORAGE_KEYS.MFA_PENDING_REMEMBER);

    return { success: true };
  },

  async resendEmailCode() {
    const pendingEmail = sessionStorage.getItem(STORAGE_KEYS.MFA_PENDING_EMAIL);
    if (!pendingEmail) {
      throw {
        error: "Nao ha verificacao pendente. Faca login novamente.",
        status: 400,
      };
    }

    const pendingEmailNormalized = String(pendingEmail).trim().toLowerCase();
    let emailForOtp = pendingEmailNormalized;
    const remainingMs = this._getOtpCooldownRemainingMs(pendingEmailNormalized);
    if (remainingMs > 0) {
      const remainingSec = Math.ceil(remainingMs / 1000);
      throw {
        error: `Aguarde ${remainingSec}s antes de reenviar o codigo.`,
        message: `Aguarde ${remainingSec}s antes de reenviar o codigo.`,
        status: 429,
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingEmailNormalized,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        if (this._isOtpRateLimited(error)) {
          this._markOtpSent(pendingEmailNormalized);
        }
        const friendly = this._otpSendFailureMessage(error);
        throw {
          error: this._isOtpRateLimited(error)
            ? error.message || "Aguarde antes de reenviar."
            : friendly,
          status: this._isOtpRateLimited(error) ? 429 : error.status || 500,
        };
      }

      this._markOtpSent(pendingEmailNormalized);
      return { success: true };
    } catch (error) {
      if (emailForOtp && this._isOtpRateLimited(error)) {
        this._markOtpSent(emailForOtp);
      }
      throw {
        error: error.error || error.message || "Nao foi possivel reenviar o codigo.",
        message: error.message || "Nao foi possivel reenviar o codigo.",
        status: this._isOtpRateLimited(error) ? 429 : error.status || 500,
      };
    }
  },
};
