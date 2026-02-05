import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import logo from "../../assets/Logo-TegraPharma.webp";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import SplashScreen from "../../components/feedback/auth/SplashScreen";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Verifica se houve logout bem-sucedido ao montar o componente
  useEffect(() => {
    // Verifica no sessionStorage (onde a flag é salva durante o logout)
    const logoutSuccess = sessionStorage.getItem(STORAGE_KEYS.LOGOUT_SUCCESS);

    if (logoutSuccess === "true") {
      // Remove a flag
      sessionStorage.removeItem(STORAGE_KEYS.LOGOUT_SUCCESS);

      // Mostra toast de logout bem-sucedido após um pequeno delay
      setTimeout(() => {
        showToast("✅ Deslogado com sucesso", "success", 2500);
      }, 300);
    }
  }, [showToast]);

  async function handleSubmit(e) {
    e.preventDefault();

    // Validação: campos obrigatórios
    if (!email.trim() || !senha.trim()) {
      showToast("❌ Os campos são obrigatórios", "error");
      return;
    }

    // Mostra splash screen imediatamente ao clicar em entrar
    setShowSplash(true);
    setLoading(true);

    try {
      // Aguarda a resposta completa da API após verificar credenciais
      const response = await authService.login(email, senha);

      // Verifica se a resposta foi bem-sucedida após a verificação
      if (response && response.success) {
        // Credenciais corretas - salva usuário e token com preferência de "Manter conectado"
        authService.saveUser(response.usuario, response.token, rememberMe);

        // Mostra toast de sucesso
        showToast("✅ Login realizado com sucesso", "success", 2500);

        // Aguarda um pouco para mostrar o toast antes de redirecionar
        setTimeout(() => {
          setShowSplash(false);
          navigate(ROUTES.DASHBOARD);
        }, 2500);
      } else {
        // Credenciais incorretas - volta para tela de login
        setShowSplash(false);
        setLoading(false);

        // Limpa os campos
        setEmail("");
        setSenha("");
        setShowPassword(false);

        // Aguarda um pouco antes de mostrar o toast
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 500);
      }
    } catch (err) {
      // Erro na requisição - volta para tela de login
      setShowSplash(false);
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

        // Aguarda um pouco antes de mostrar o toast
        setTimeout(() => {
          showToast("❌ E-mail ou Senha incorretos", "error");
        }, 500);
      } else {
        // Outro tipo de erro (rede, servidor, etc)
        showToast("❌ Erro ao fazer login. Tente novamente.", "error");
      }
    }
  }

  return (
    <>
      {showSplash && <SplashScreen message="Entrando..." />}

      <div className="min-h-screen bg-gradient-to-br from-tegra-bg-accent to-tegra-teal-light flex items-center justify-center p-4">
        <div className="bg-tegra-bg-primary shadow-2xl rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src={logo}
              alt="Logo TegraPharma"
              className="mx-auto mb-4 max-h-20 object-contain"
            />
            <p className="text-tegra-text-secondary">
              Faça login para continuar
            </p>
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

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full"
            >
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
