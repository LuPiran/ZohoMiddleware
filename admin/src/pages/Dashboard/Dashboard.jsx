import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import MainLayout from "../../components/layout/MainLayout";
import { ROUTES } from "../../utils/constants";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
    }
  }, [navigate]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-tegra-text-primary mb-6">
          Dashboard
        </h1>
        <div className="bg-tegra-bg-primary rounded-lg shadow p-6">
          <p className="text-tegra-text-secondary">Conteúdo do Dashboard</p>
        </div>
      </div>
    </MainLayout>
  );
}
