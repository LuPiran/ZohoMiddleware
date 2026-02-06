import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import Input from "../../components/ui/Input";
import Checkbox from "../../components/ui/Checkbox";
import { ROUTES, STORAGE_KEYS, SUPPORT } from "../../utils/constants";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState({});
  const [loginError, setLoginError] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const logoutToastShownRef = useRef(false); // Usa ref para evitar re-renderizações
  const loginButtonRef = useRef(null);

  const supportSubject = "Ajuda no acesso ao Portal";
  const supportBody = `Olá, preciso de ajuda para acessar o portal.%0D%0A%0D%0AEmail cadastrado: ${
    email?.trim() || "informar"
  }%0D%0A%0D%0ADescrição do problema: `;
  const supportMailto = `mailto:${SUPPORT.EMAIL}?subject=${encodeURIComponent(
    supportSubject,
  )}&body=${encodeURIComponent(supportBody)}`;

  useEffect(() => {
    if (!supportModalOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSupportModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [supportModalOpen]);

  function handleSupportClick(event) {
    event.preventDefault();
    setSupportModalOpen(true);
  }

  function handleSupportConfirm() {
    setSupportModalOpen(false);
    window.location.href = supportMailto;
  }

  // Verifica se houve logout bem-sucedido ou conta inativa ao montar o componente
  useEffect(() => {
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
      showToast("❌ Os campos são obrigatórios", "error");
      return;
    }

    // Mostra animação no botão imediatamente ao clicar em entrar
    setTransitionActive(false);
    setLoginError(false);
    setLoading(true);

    try {
      // Aguarda a resposta completa da API após verificar credenciais
      const response = await authService.login(email, senha);

      // Verifica se a resposta foi bem-sucedida após a verificação
      if (response && response.success) {
        // Credenciais corretas - salva usuário e token com preferência de "Manter conectado"
        authService.saveUser(response.usuario, response.token, rememberMe);

        // Mostra toast de sucesso após a animação iniciar
        setTimeout(() => {
          showToast("✅ Login realizado com sucesso", "success", 2500);
        }, 900);

        // Ativa transição de preenchimento da tela
        const buttonRect = loginButtonRef.current?.getBoundingClientRect();

        if (buttonRect) {
          setTransitionStyle({
            "--login-btn-x": `${buttonRect.left}px`,
            "--login-btn-y": `${buttonRect.top}px`,
            "--login-btn-w": `${buttonRect.width}px`,
            "--login-btn-h": `${buttonRect.height}px`,
          });
        }

        setTransitionActive(true);

        // Aguarda a animação antes de redirecionar
        setTimeout(() => {
          sessionStorage.setItem(STORAGE_KEYS.LOGIN_TRANSITION, "true");
          navigate(ROUTES.DASHBOARD);
        }, 1850);
      } else {
        // Credenciais incorretas - volta para tela de login
        setLoading(false);
        setTransitionActive(false);
        setLoginError(true);

        // Limpa os campos
        setEmail("");
        setSenha("");
        setShowPassword(false);

        // Aguarda um pouco antes de mostrar o toast (alinhado ao efeito de erro)
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 700);

        setTimeout(() => {
          setLoginError(false);
        }, 1400);
      }
    } catch (err) {
      // Erro na requisição - volta para tela de login
      setLoading(false);
      setTransitionActive(false);
      setLoginError(true);

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

        // Aguarda um pouco antes de mostrar o toast (alinhado ao efeito de erro)
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 700);

        setTimeout(() => {
          setLoginError(false);
        }, 1400);
      } else {
        // Outro tipo de erro (rede, servidor, etc)
        showToast("❌ Erro ao fazer login. Tente novamente.", "error");

        setTimeout(() => {
          setLoginError(false);
        }, 1400);
      }
    }
  }

  return (
    <>
      {transitionActive && (
        <div
          className="login-transition-overlay"
          style={transitionStyle}
          aria-hidden="true"
        />
      )}
      {loginError && (
        <div className="login-error-overlay" aria-hidden="true" />
      )}

      <div className="login-page">
        <div
          className="login-page__bg"
          style={{ backgroundImage: "url('/Fundo_Pagina_Login.png')" }}
          aria-hidden="true"
        />
        <div className="login-page__overlay" aria-hidden="true" />

        <div className="login-card login-animate">
          <div className="login-card__brand">
            <img
              src="/logo.png"
              alt="Logo TegraPharma"
              className="login-card__logo"
            />
            <h1 className="login-card__title">Bem-vindo ao Portal</h1>
            <p className="login-card__subtitle">
              Acompanhe pedidos, ocorrências e KPIs em um só lugar.
            </p>
            <ul className="login-card__bullets">
              <li>Fluxos rápidos e centralizados</li>
              <li>Dados seguros com acesso controlado</li>
              <li>Visão clara de compras e recompra</li>
            </ul>
          </div>

          <div className="login-card__form">
            <div className="text-center mb-6">
              <h2 className="login-form__title">Faça login</h2>
              <p className="login-form__subtitle">Use suas credenciais de acesso</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

              <Checkbox
                id="rememberMe"
                label="Manter conectado"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />

              <button
                ref={loginButtonRef}
                type="submit"
                disabled={loading}
                className={`login-progress-btn ${loading ? "is-loading" : ""} ${
                  loginError ? "is-error" : ""
                }`}
              >
                <span className="login-progress-label">Entrar</span>
                <span className="login-progress-bar" aria-hidden="true" />
              </button>
            </form>

            <p className="login-form__footer">
              Precisa de ajuda?{" "}
              <a
                href={supportMailto}
                onClick={handleSupportClick}
                className="login-form__support-link"
              >
                Fale com o suporte
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {supportModalOpen && (
        <div
          className="login-support-modal__backdrop"
          role="presentation"
          onClick={() => setSupportModalOpen(false)}
        >
          <div
            className="login-support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="support-modal-title" className="login-support-modal__title">
              Contatar suporte
            </h3>
            <p className="login-support-modal__text">
              Vamos abrir seu Outlook para enviar um email ao suporte:
            </p>
            <p className="login-support-modal__email">{SUPPORT.EMAIL}</p>
            <p className="login-support-modal__text">
              Confirma o envio?
            </p>
            <div className="login-support-modal__actions">
              <button
                type="button"
                className="login-support-modal__btn login-support-modal__btn--ghost"
                onClick={() => setSupportModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="login-support-modal__btn login-support-modal__btn--primary"
                onClick={handleSupportConfirm}
              >
                Abrir email
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
