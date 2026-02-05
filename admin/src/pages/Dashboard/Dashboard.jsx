import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { useLoading } from "../../contexts/LoadingContext";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";
import { MdShoppingCart, MdRefresh, MdReport } from "react-icons/md";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const { setLoading } = useLoading();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Desativa loading imediatamente para Dashboard (dados são mocados)
    setLoading(false);
  }, [navigate, setLoading]);

  // Dados mocados para o mês atual
  const dashboardData = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    return {
      compra: 24, // Total de compras no mês atual
      recompra: 18, // Total de recompras no mês atual
      ocorrencia: 12, // Total de ocorrências no mês atual
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
    },
    {
      id: "recompra",
      label: "Recompra",
      value: dashboardData.recompra,
      icon: <MdRefresh className="text-4xl" />,
      color: "text-tegra-blue-dark",
    },
    {
      id: "ocorrencia",
      label: "Ocorrência",
      value: dashboardData.ocorrencia,
      icon: <MdReport className="text-4xl" />,
      color: "text-tegra-blue-dark",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de boas-vindas */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-tegra-text-primary">
            Bem-vindo de volta, {nomeUsuario} 👋
          </h1>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsCards.map((card) => (
            <div
              key={card.id}
              className="bg-tegra-bg-primary rounded-lg shadow-md p-6 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              {/* Ícone */}
              <div className={`flex-shrink-0 ${card.color}`}>{card.icon}</div>

              {/* Número e Label */}
              <div className="flex-1">
                <div className="text-3xl font-bold text-tegra-text-primary mb-1">
                  {card.value}
                </div>
                <div className="text-sm text-tegra-text-secondary">
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Seção Dashboard */}
        <div className="mt-8">
          <h2 className="text-xl  font-bold text-tegra-text-primary mb-4">
            Dashboard
          </h2>
          <div className="bg-tegra-bg-primary rounded-lg shadow p-6">
            <p className="text-tegra-text-secondary">
              Conteúdo adicional do Dashboard será exibido aqui.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
