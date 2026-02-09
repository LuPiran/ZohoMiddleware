import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { useLoading } from "../../contexts/LoadingContext";
import { WelcomePopup } from "../../components/feedback/auth";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES, STORAGE_KEYS } from "../../utils/constants";
import { MdShoppingCart, MdRefresh, MdReport, MdDescription, MdArrowForward } from "react-icons/md";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const { setLoading } = useLoading();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Desativa loading imediatamente para Dashboard (dados são mocados)
    setLoading(false);
  }, [navigate, setLoading]);

  useEffect(() => {
    const loginSuccess = sessionStorage.getItem(STORAGE_KEYS.LOGIN_SUCCESS);
    if (loginSuccess === "true") {
      // Aguarda a página carregar e mostra o popup de boas-vindas
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, []);

  // Dados mocados para o mês atual
  const dashboardData = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    return {
      compra: 24, // Total de compras no mês atual
      recompra: 18, // Total de recompras no mês atual
      ocorrencia: 12, // Total de ocorrências no mês atual
      proposta: 9, // Total de propostas no mês atual
      month: currentMonth,
      year: currentYear,
    };
  }, []);

  // Obtém o nome do usuário para a mensagem de boas-vindas
  const nomeUsuario =
    user?.nome ||
    user?.Nome ||
    user?.Name ||
    user?.nome_completo ||
    user?.Nome_Completo ||
    "Admin";

  // Cards de estatísticas
  const statsCards = [
    {
      id: "compra",
      label: "Compra",
      value: dashboardData.compra,
      icon: <MdShoppingCart className="text-4xl" />,
      color: "text-tegra-blue-dark",
      route: ROUTES.COMPRA,
    },
    {
      id: "recompra",
      label: "Recompra",
      value: dashboardData.recompra,
      icon: <MdRefresh className="text-4xl" />,
      color: "text-tegra-blue-dark",
      route: ROUTES.RECOMPRA,
    },
    {
      id: "proposta",
      label: "Proposta",
      value: dashboardData.proposta,
      icon: <MdDescription className="text-4xl" />,
      color: "text-tegra-blue-dark",
      route: ROUTES.PROPOSTA,
    },
    {
      id: "ocorrencia",
      label: "Ocorrência",
      value: dashboardData.ocorrencia,
      icon: <MdReport className="text-4xl" />,
      color: "text-tegra-blue-dark",
      route: ROUTES.OCORRENCIA,
    },
  ];

  return (
    <MainLayout>
      <div className="dashboard-page max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-7 md:py-8">
        {/* Mensagem de boas-vindas */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="dashboard-title">
            <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">
              Bem-vindo de volta, {nomeUsuario} 👋
            </h1>
          </div>
          <p className="dashboard-subtitle mt-1">
            Aqui está um resumo rápido do seu desempenho neste mês.
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
          {statsCards.map((card) => (
            <div
              key={card.id}
              className="dashboard-card p-4 sm:p-5 md:p-6 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:scale-105 transition-all duration-200 text-left relative"
            >
              {/* Botão de seta no canto superior direito */}
              <button
                onClick={() => navigate(card.route)}
                className="absolute top-4 sm:top-5 md:top-6 right-4 sm:right-5 md:right-6 p-2.5 sm:p-3 rounded-lg bg-tegra-blue-light text-white hover:bg-tegra-blue-dark transition-colors shadow-md cursor-pointer"
                type="button"
                aria-label={`Ir para ${card.label}`}
              >
                <MdArrowForward className="text-xl sm:text-2xl" />
              </button>

              {/* Ícone */}
              <div className="dashboard-card__icon">
                <div className="text-2xl sm:text-3xl md:text-4xl">
                  {card.icon}
                </div>
              </div>

              {/* Número e Label */}
              <div className="flex-1">
                <div className="text-2xl sm:text-3xl font-bold text-tegra-text-primary mb-1">
                  {card.value}
                </div>
                <div className="text-xs sm:text-sm text-tegra-text-secondary">
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Seção Dashboard */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-bold text-tegra-text-primary mb-3 sm:mb-4">
            Home
          </h2>
          <div className="dashboard-panel p-4 sm:p-5 md:p-6">
            <p className="text-sm sm:text-base text-tegra-text-secondary">
              Conteúdo adicional do Dashboard será exibido aqui.
            </p>
          </div>
        </div>
      </div>

      {/* Popup de boas-vindas */}
      {showWelcome && (
        <WelcomePopup
          userName={nomeUsuario}
          onClose={() => {
            sessionStorage.removeItem(STORAGE_KEYS.LOGIN_SUCCESS);
            setShowWelcome(false);
          }}
        />
      )}
    </MainLayout>
  );
}
