import { MdBook, MdRemoveRedEye } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";

export default function Manual() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12">
        <section className="bg-white rounded-2xl border border-tegra-gray-light shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tegra-blue-light/15 text-tegra-blue-dark flex-shrink-0">
              <MdBook className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-tegra-text-primary">
                Manual Completo do Portal
              </h1>
              <p className="mt-2 text-sm sm:text-base text-tegra-text-secondary max-w-3xl">
                Acesse o manual em PDF com todas as informações detalhadas sobre como usar o portal do consultor.
              </p>
            </div>
          </div>
        </section>

        {/* Botão para abrir Manual PDF */}
        <div className="mb-6 rounded-2xl border-2 border-tegra-blue-light/40 bg-white shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-lg sm:text-xl font-semibold text-tegra-text-primary mb-2">
                Visualizar PDF do Manual
              </h3>
              <p className="text-sm sm:text-base text-tegra-text-secondary">
                Clique no botão ao lado para abrir o manual em uma nova aba. O documento contém instruções passo a passo para todas as funcionalidades.
              </p>
            </div>
            <button
              onClick={() => window.open("/Manual_PortaldoConsultor.pdf", "_blank")}
              className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-tegra-blue hover:bg-tegra-blue-dark text-white rounded-lg font-medium transition-colors flex-shrink-0 text-sm sm:text-base whitespace-nowrap"
              aria-label="Abrir manual em PDF"
            >
              <MdRemoveRedEye className="text-xl" />
              Visualizar PDF
            </button>
          </div>
        </div>

        {/* Conteúdo informativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-tegra-gray-light shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-tegra-text-primary mb-4">
              O que você vai encontrar
            </h2>
            <ul className="space-y-3 text-sm sm:text-base text-tegra-text-secondary">
              <li className="flex gap-3">
                <span className="text-tegra-blue-dark font-bold">✓</span>
                <span>Guia completo de todas as funcionalidades</span>
              </li>
              <li className="flex gap-3">
                <span className="text-tegra-blue-dark font-bold">✓</span>
                <span>Instruções passo a passo para cada formulário</span>
              </li>
              <li className="flex gap-3">
                <span className="text-tegra-blue-dark font-bold">✓</span>
                <span>Regras de validação e campos obrigatórios</span>
              </li>
              <li className="flex gap-3">
                <span className="text-tegra-blue-dark font-bold">✓</span>
                <span>Exemplos práticos e dicas de eficiência</span>
              </li>
              <li className="flex gap-3">
                <span className="text-tegra-blue-dark font-bold">✓</span>
                <span>Respostas a perguntas frequentes</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-tegra-gray-light shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-tegra-text-primary mb-4">
              Informações do Manual
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-tegra-text-secondary">
              <div>
                <p className="font-semibold text-tegra-text-primary mb-1">Formato</p>
                <p>PDF portátil compatível com todos os navegadores</p>
              </div>
              <div>
                <p className="font-semibold text-tegra-text-primary mb-1">Tamanho</p>
                <p>Aproximadamente 685 KB</p>
              </div>
              <div>
                <p className="font-semibold text-tegra-text-primary mb-1">Acesso</p>
                <p>Disponível 24/7 sem necessidade de download</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
