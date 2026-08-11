import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";

const logoMobile = "/logoCorp.png";

export default function Login() {
  const LOGIN_PRE_REDIRECT_DELAY_MS = 120;
  const LOGIN_TRANSITION_MS = 900;
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMicrosoft, setLoadingMicrosoft] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isErrorTransitioning, setIsErrorTransitioning] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const logoutToastShownRef = useRef(false);
  const errorTransitionTimerRef = useRef(null);

  function completeLoginSuccess(response) {
    authService.saveUser(response.usuario, response.token, true);
    sessionStorage.setItem(STORAGE_KEYS.LOGIN_SUCCESS, "true");
    sessionStorage.setItem("SKIP_ROUTE_LOADING", "true");

    setTimeout(() => {
      requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD);
      }, LOGIN_TRANSITION_MS);
    }, LOGIN_PRE_REDIRECT_DELAY_MS);
  }

  function handleLoginError(err, { isMicrosoft = false } = {}) {
    setLoading(false);
    setLoadingMicrosoft(false);

    const errorMessage = err.error || err.message || err.toString();
    const statusCode = err.status || err.response?.status;

    if (statusCode === 429) {
      const rateLimitMessage =
        err.error ||
        err.response?.data?.error ||
        "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.";
      showToast(`⏱️ ${rateLimitMessage}`, "warning");
      return;
    }

    if (
      statusCode === 403 ||
      errorMessage.includes("inativo") ||
      errorMessage.includes("inativa") ||
      errorMessage.includes("Usuário inativo")
    ) {
      sessionStorage.setItem(STORAGE_KEYS.ACCOUNT_INACTIVE, "true");
      showToast(
        "⚠️ Sua conta está inativa, entre em contato com o suporte",
        "warning",
        4000,
      );
      return;
    }

    if (isMicrosoft) {
      if (
        statusCode === 401 ||
        errorMessage.includes("Token Microsoft") ||
        errorMessage.includes("inválid")
      ) {
        triggerErrorTransition();
        setTimeout(() => {
          showToast("❌ Não foi possível autenticar com a Microsoft", "error");
        }, 500);
        return;
      }

      if (
        err?.errorCode === "user_cancelled" ||
        err?.name === "BrowserAuthError"
      ) {
        showToast("Login Microsoft cancelado", "warning", 2500);
        return;
      }

      triggerErrorTransition();
      showToast(
        `❌ ${errorMessage || "Erro ao fazer login. Tente novamente."}`,
        "error",
      );
      return;
    }

    if (
      statusCode === 401 ||
      errorMessage.includes("incorret") ||
      errorMessage.includes("inválid") ||
      errorMessage.includes("Email ou senha") ||
      errorMessage.includes("credenciais")
    ) {
      setEmail("");
      setSenha("");
      setShowPassword(false);
      triggerErrorTransition();
      setTimeout(() => {
        showToast("❌ E-mail ou Senha incorretos", "error");
      }, 500);
      return;
    }

    triggerErrorTransition();
    showToast("❌ Erro ao fazer login. Tente novamente.", "error");
  }

  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem(STORAGE_KEYS.LOGOUT_SUCCESS);
    const accountInactive = sessionStorage.getItem(
      STORAGE_KEYS.ACCOUNT_INACTIVE,
    );

    if (logoutSuccess === "true" && !logoutToastShownRef.current) {
      sessionStorage.removeItem(STORAGE_KEYS.LOGOUT_SUCCESS);
      logoutToastShownRef.current = true;

      const timer = setTimeout(() => {
        showToast("✅ Deslogado com sucesso", "success", 2500);
      }, 300);

      return () => clearTimeout(timer);
    }

    if (accountInactive === "true") {
      sessionStorage.removeItem(STORAGE_KEYS.ACCOUNT_INACTIVE);

      const timer = setTimeout(() => {
        showToast(
          "⚠️ Sua conta está inativa, entre em contato com o suporte",
          "warning",
          4000,
        );
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;

    async function processRedirect() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash || "";
        const hasAuthResponse =
          params.has("code") ||
          params.has("error") ||
          params.has("client_info") ||
          hash.includes("code=") ||
          hash.includes("error=");

        if (!hasAuthResponse) {
          await authService.handleMicrosoftRedirect();
          return;
        }

        setLoadingMicrosoft(true);
        const response = await authService.handleMicrosoftRedirect();
        if (cancelled) return;

        if (response?.success) {
          completeLoginSuccess(response);
          return;
        }

        setLoadingMicrosoft(false);
      } catch (err) {
        if (cancelled) return;
        handleLoginError(err, { isMicrosoft: true });
      }
    }

    processRedirect();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim() || !senha.trim()) {
      triggerErrorTransition();
      showToast("❌ Os campos são obrigatórios", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, senha);

      if (response && response.success) {
        completeLoginSuccess(response);
      } else {
        setLoading(false);
        setEmail("");
        setSenha("");
        setShowPassword(false);
        triggerErrorTransition();
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 500);
      }
    } catch (err) {
      handleLoginError(err);
    }
  }

  async function handleMicrosoftLogin() {
    setLoadingMicrosoft(true);

    try {
      await authService.loginWithMicrosoftRedirect();
    } catch (err) {
      try {
        const response = await authService.loginWithMicrosoftPopup();
        if (response?.success) {
          completeLoginSuccess(response);
          return;
        }
        setLoadingMicrosoft(false);
        triggerErrorTransition();
        showToast("❌ Não foi possível concluir o login Microsoft", "error");
      } catch (popupErr) {
        handleLoginError(popupErr, { isMicrosoft: true });
      }
    }
  }

  function triggerErrorTransition() {
    if (errorTransitionTimerRef.current) {
      clearTimeout(errorTransitionTimerRef.current);
    }
    setIsErrorTransitioning(true);
    errorTransitionTimerRef.current = setTimeout(() => {
      setIsErrorTransitioning(false);
    }, 900);
  }

  const anyLoading = loading || loadingMicrosoft;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative">
        <div
          className={`login-transition ${isTransitioning ? "is-active" : ""}`}
        />
        <div
          className={`login-transition-glass ${isTransitioning ? "is-active" : ""}`}
        />
        <div
          className={`login-transition-grain ${isTransitioning ? "is-active" : ""}`}
        />
        <div
          className={`login-error-transition ${isErrorTransitioning ? "is-active" : ""}`}
        />
        <div
          className={`login-error-transition-glass ${isErrorTransitioning ? "is-active" : ""}`}
        />
        <div
          className={`login-error-transition-grain ${isErrorTransitioning ? "is-active" : ""}`}
        />
        <div className="absolute inset-0 login-page-bg" />

        <div className="relative w-full max-w-5xl">
          <div className="login-panel grid grid-cols-1 lg:grid-cols-2">
            <div className="login-media hidden lg:block">
              <img
                src="/Fundo_Pagina_Login.png"
                alt="Imagem de fundo TegraPharma"
                className="login-media-img"
              />
              <div className="login-media-overlay" />

              <div className="login-media-content p-8 sm:p-10 md:p-12 text-white">
                <div>
                  <img
                    src="/LogoTegra.png"
                    alt="Logo corporativo"
                    className="h-[130px] w-auto object-contain drop-shadow-lg"
                  />
                  <h1 className="mt-8 text-3xl sm:text-4xl font-bold leading-tight">
                    Bem-vindo ao painel do consultor!
                  </h1>
                </div>

                <div className="mt-12 pt-6 border-t border-white/25 text-center">
                  <p className="text-sm text-white/85 font-medium">
                    © 2026 TegraPharmaCorp. Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </div>

            <div className="login-form-panel p-8 sm:p-10 md:p-12">
              <div className="lg:hidden flex flex-col items-center justify-center mb-8">
                <img
                  src={logoMobile}
                  alt="Logo corporativo"
                  className="h-16 w-auto object-contain"
                />
              </div>

              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-tegra-text-primary">
                  Acesse sua conta
                </h2>
                <p className="mt-2 text-base text-tegra-text-secondary">
                  Use suas credenciais Zoho ou a conta Microsoft da empresa
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <Input
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    disabled={anyLoading}
                    icon={<MdEmail className="text-xl" />}
                  />
                </div>

                <div>
                  <Input
                    id="senha"
                    label="Senha"
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    disabled={anyLoading}
                    icon={<MdLock className="text-xl" />}
                    iconRight={
                      showPassword ? (
                        <MdVisibilityOff className="text-xl" />
                      ) : (
                        <MdVisibility className="text-xl" />
                      )
                    }
                    onIconClick={() => setShowPassword(!showPassword)}
                  />
                </div>

                <div className="w-full">
                  <Button
                    type="submit"
                    disabled={anyLoading}
                    loading={loading}
                    loadingVariant="bar"
                    className="w-full mt-4 py-3 text-base font-semibold login-primary-btn"
                  >
                    Entrar
                  </Button>
                </div>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-tegra-text-secondary/20" />
                <span className="text-xs uppercase tracking-wide text-tegra-text-secondary">
                  ou
                </span>
                <div className="h-px flex-1 bg-tegra-text-secondary/20" />
              </div>

              <div className="w-full">
                <Button
                  type="button"
                  disabled={anyLoading}
                  loading={loadingMicrosoft}
                  loadingVariant="bar"
                  onClick={handleMicrosoftLogin}
                  className="w-full py-3 text-base font-semibold login-primary-btn inline-flex items-center justify-center gap-3"
                >
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 23 23"
                    className="shrink-0"
                  >
                    <path fill="#f25022" d="M1 1h10v10H1z" />
                    <path fill="#00a4ef" d="M12 1h10v10H12z" />
                    <path fill="#7fba00" d="M1 12h10v10H1z" />
                    <path fill="#ffb900" d="M12 12h10v10H12z" />
                  </svg>
                  Entrar com Microsoft
                </Button>
              </div>

              <p className="mt-8 text-center text-sm text-tegra-text-secondary">
                Estamos aqui para ajudar.{" "}
                <a
                  href="mailto:suporte.ti@tegrapharma.com?subject=Solicitação%20de%20Suporte%20-%20TegraPharma%20Portal&body=Olá,%0A%0AEstou%20com%20dúvidas%20ou%20problemas%20para%20acessar%20o%20portal%20TegraPharma.%0A%0APor%20favor,%20me%20ajudem.%0A%0AObrigado."
                  className="font-semibold text-tegra-blue hover:text-tegra-blue-dark transition-colors"
                >
                  Entre em contato
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
