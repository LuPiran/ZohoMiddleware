import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { authService } from "../../services/auth";
import { ROUTES } from "../../utils/constants";

export default function Mfa() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleVerify(e) {
    e.preventDefault();
    if (!code.trim()) {
      showToast("Informe o codigo do autenticador.", "warning");
      return;
    }

    try {
      setLoading(true);
      await authService.verifyMfa(code.trim());
      sessionStorage.setItem("SKIP_ROUTE_LOADING", "true");
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      showToast(error.error || "Codigo de verificacao invalido.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    try {
      setResending(true);
      await authService.resendEmailCode();
      showToast("📧 Novo codigo enviado para seu e-mail.", "success", 3000);
    } catch (error) {
      showToast(error.error || "Nao foi possivel reenviar o codigo.", "error");
    } finally {
      setResending(false);
    }
  }

  async function handleBackToLogin() {
    await authService.logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <div className="fixed inset-0 z-0 box-border flex w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="absolute inset-0 login-page-bg" />
      <div className="relative w-full max-w-xl">
        <div className="login-panel p-8 sm:p-10 md:p-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-tegra-text-primary">
              Verificacao em 2 etapas
            </h2>
            <p className="mt-2 text-base text-tegra-text-secondary">
              Digite o codigo enviado para o seu e-mail.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5" noValidate>
            <Input
              id="mfaCode"
              label="Codigo de verificacao"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              disabled={loading || resending}
            />

            <Button
              type="submit"
              disabled={loading || resending}
              loading={loading}
              loadingVariant="bar"
              className="w-full mt-4 py-3 text-base font-semibold login-primary-btn"
            >
              Validar e entrar
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full py-3 text-base font-semibold"
              onClick={handleResendCode}
              disabled={loading || resending}
            >
              {resending ? "Reenviando..." : "Reenviar codigo"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full py-3 text-base font-semibold"
              onClick={handleBackToLogin}
              disabled={loading || resending}
            >
              Voltar ao login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
