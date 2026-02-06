import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { ROUTES } from "../../utils/constants";
import { MdCheck } from "react-icons/md";

export default function Agradecimento() {
  const navigate = useNavigate();
  const location = useLocation();

  // Obtém os dados passados via state
  const { tipoSolicitacao, nomePaciente, sobrenomePaciente, dataCriacao, origem } =
    location.state || {};

  // Se não houver dados, redireciona para dashboard
  useEffect(() => {
    if (!tipoSolicitacao || !nomePaciente || !sobrenomePaciente) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [tipoSolicitacao, nomePaciente, sobrenomePaciente, navigate]);

  // Formata a data de criação
  const formatarData = (data) => {
    if (!data) {
      return new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    try {
      // Se for uma string ISO, converte para Date
      const dataObj = typeof data === "string" ? new Date(data) : data;
      return dataObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Função para voltar à página de origem
  const handleVoltar = () => {
    if (origem === "compra") {
      navigate(ROUTES.COMPRA);
    } else if (origem === "recompra") {
      navigate(ROUTES.RECOMPRA);
    } else if (origem === "ocorrencia") {
      navigate(ROUTES.OCORRENCIA);
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  if (!tipoSolicitacao || !nomePaciente || !sobrenomePaciente) {
    return null; // Retorna null enquanto redireciona
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-tegra-bg-primary rounded-lg shadow-lg p-6 sm:p-8 md:p-10 text-center">
          {/* Ícone de Check com Círculo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-tegra-blue-dark flex items-center justify-center">
                <MdCheck className="text-5xl sm:text-6xl md:text-7xl text-tegra-blue-dark" />
              </div>
            </div>
          </div>

          {/* Texto de Confirmação */}
          <div className="mb-6 sm:mb-8">
            <p className="text-base sm:text-lg md:text-xl text-tegra-text-primary mb-2">
              <span className="font-semibold">{tipoSolicitacao}</span> do Paciente{" "}
              <span className="font-semibold">
                {nomePaciente} {sobrenomePaciente}
              </span>{" "}
              foi criado
            </p>
            <p className="text-sm sm:text-base text-tegra-text-secondary">
              {formatarData(dataCriacao)}
            </p>
          </div>

          {/* Botão Voltar */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="primary"
              onClick={handleVoltar}
              className="w-full sm:w-auto min-w-[200px]"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
