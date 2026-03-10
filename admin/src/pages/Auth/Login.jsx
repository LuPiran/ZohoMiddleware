import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";
// import LogoTegraPharmacorp from "../../assets/LogoTegraPharmacorp.png";

// Logo mobile
const logoMobile = "/logoCorp.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isErrorTransitioning, setIsErrorTransitioning] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const logoutToastShownRef = useRef(false); // Usa ref para evitar re-renderizações
  const errorTransitionTimerRef = useRef(null);

  // Verifica se houve logout bem-sucedido ou conta inativa ao montar o componente
  useEffect(() => {
    // Mantém o estado visual do checkbox sincronizado com a preferência persistida.
    const rememberMePreference =
      localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === "true";
    setRememberMe(rememberMePreference);

    // Verifica no sessionStorage (onde a flag é salva durante o logout)
    const logoutSuccess = sessionStorage.getItem(STORAGE_KEYS.LOGOUT_SUCCESS);
    const accountInactive = sessionStorage.getItem(
      STORAGE_KEYS.ACCOUNT_INACTIVE,
    );

    if (logoutSuccess === "true" && !logoutToastShownRef.current) {
      // Remove a flag imediatamente para evitar loops
      sessionStorage.removeItem(STORAGE_KEYS.LOGOUT_SUCCESS);
      logoutToastShownRef.current = true;

      // Mostra toast de logout bem-sucedido após um pequeno delay
      const timer = setTimeout(() => {
        showToast("✅ Deslogado com sucesso", "success", 2500);
      }, 300);

      // Limpa o timer se o componente desmontar
      return () => clearTimeout(timer);
    }

    // Verifica se a conta está inativa
    if (accountInactive === "true") {
      // Remove a flag imediatamente para evitar loops
      sessionStorage.removeItem(STORAGE_KEYS.ACCOUNT_INACTIVE);

      // Mostra toast de conta inativa após um pequeno delay
      const timer = setTimeout(() => {
        showToast(
          "⚠️ Sua conta está inativa, entre em contato com o suporte",
          "warning",
          4000,
        );
      }, 300);

      // Limpa o timer se o componente desmontar
      return () => clearTimeout(timer);
    }
  }, [showToast]); // Adiciona showToast nas dependências

  async function handleSubmit(e) {
    e.preventDefault();

    // Validação: campos obrigatórios
    if (!email.trim() || !senha.trim()) {
      triggerErrorTransition();
      showToast("❌ Os campos são obrigatórios", "error");
      return;
    }

    setLoading(true);

    try {
      // Aguarda a resposta completa da API após verificar credenciais
      const response = await authService.login(email, senha);

      // Verifica se a resposta foi bem-sucedida após a verificação
      if (response && response.success) {
        // Credenciais corretas - salva usuário e token com preferência de "Manter conectado"
        authService.saveUser(response.usuario, response.token, rememberMe);

        // Marca login concluído para exibir popup no dashboard
        sessionStorage.setItem(STORAGE_KEYS.LOGIN_SUCCESS, "true");
        // Flag para pular a tela de loading na transição de rota
        sessionStorage.setItem("SKIP_ROUTE_LOADING", "true");

        // Aguarda um pouco antes de redirecionar
        setTimeout(() => {
          requestAnimationFrame(() => {
            setIsTransitioning(true);
          });
          setTimeout(() => {
            navigate(ROUTES.DASHBOARD);
          }, 2000);
        }, 300);
      } else {
        // Credenciais incorretas - volta para tela de login
        setLoading(false);

        // Limpa os campos
        setEmail("");
        setSenha("");
        setShowPassword(false);

        triggerErrorTransition();

        // Aguarda um pouco antes de mostrar o toast
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 500);
      }
    } catch (err) {
      // Erro na requisição - volta para tela de login
      setLoading(false);

      const errorMessage = err.error || err.message || err.toString();
      const statusCode = err.status || err.response?.status;

      // Verifica se é erro de rate limiting (429 - Too Many Requests)
      if (statusCode === 429) {
        const rateLimitMessage =
          err.error ||
          err.response?.data?.error ||
          "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.";
        showToast(`⏱️ ${rateLimitMessage}`, "warning");
        return;
      }

      // Verifica se é erro de conta inativa (403 - Forbidden)
      if (
        statusCode === 403 ||
        errorMessage.includes("inativo") ||
        errorMessage.includes("inativa") ||
        errorMessage.includes("Usuário inativo")
      ) {
        // Salva flag de conta inativa no sessionStorage para mostrar toast ao voltar para login
        sessionStorage.setItem(STORAGE_KEYS.ACCOUNT_INACTIVE, "true");

        // Limpa os campos
        setEmail("");
        setSenha("");
        setShowPassword(false);

        // Mostra toast de conta inativa imediatamente
        showToast(
          "⚠️ Sua conta está inativa, entre em contato com o suporte",
          "warning",
          4000,
        );
        return;
      }

      // Verifica se é erro de credenciais incorretas (401 ou mensagem específica)
      if (
        statusCode === 401 ||
        errorMessage.includes("incorret") ||
        errorMessage.includes("inválid") ||
        errorMessage.includes("Email ou senha") ||
        errorMessage.includes("credenciais")
      ) {
        // Limpa os campos
        setEmail("");
        setSenha("");
        setShowPassword(false);

        triggerErrorTransition();

        // Aguarda um pouco antes de mostrar o toast
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 500);
      } else {
        // Outro tipo de erro (rede, servidor, etc)
        triggerErrorTransition();
        showToast("❌ Erro ao fazer login. Tente novamente.", "error");
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
                  Use suas credenciais para continuar
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
                    disabled={loading}
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
                    disabled={loading}
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

                <div className="pt-2">
                  <Checkbox
                    id="rememberMe"
                    label="Manter-me conectado"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                </div>

                <div className="w-full">
                  <Button
                    type="submit"
                    disabled={loading}
                    loading={loading}
                    loadingVariant="bar"
                    className="w-full mt-7 py-3 text-base font-semibold login-primary-btn"
                  >
                    Entrar
                  </Button>
                </div>
              </form>

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
