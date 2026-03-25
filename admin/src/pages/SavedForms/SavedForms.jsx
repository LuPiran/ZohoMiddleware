import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { ROUTES } from "../../utils/constants";
import { MdArrowBack, MdDelete, MdOpenInNew, MdCalendarToday, MdAccessTime } from "react-icons/md";
import { obterFormulariosSalvos, excluirFormulario as excluirFormularioService } from "../../services/savedForms";

export default function SavedForms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    carregarFormulariosSalvos();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const carregarFormulariosSalvos = async () => {
    setLoading(true);
    try {
      const parsed = await obterFormulariosSalvos();
      const sorted = parsed.sort((a, b) => new Date(b.dataSalvamento) - new Date(a.dataSalvamento));
      setForms(sorted);
    } catch (error) {
      console.error("Erro ao carregar formulários salvos:", error);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  const excluirFormulario = async (index) => {
    if (confirm("Tem certeza que deseja excluir este formulário salvo?")) {
      const form = forms[index];
      const removed = await excluirFormularioService(form.id);
      if (removed) {
        const novaLista = forms.filter((_, i) => i !== index);
        setForms(novaLista);
      }
    }
  };

  const DRAFT_KEYS = {
    compra: "zoho_draft_compra",
    recompra: "zoho_draft_recompra",
    proposta: "zoho_draft_proposta",
    ocorrencia: "zoho_draft_ocorrencia",
  };

  const recuperarFormulario = (form) => {
    // Gravar os dados no DRAFT_KEY do formulário para que ele restaure automaticamente
    const draftKey = DRAFT_KEYS[form.tipo];
    if (draftKey && form.dados) {
      localStorage.setItem(draftKey, JSON.stringify(form.dados));
    }
    // Flag para o formulário auto-restaurar ao montar
    sessionStorage.setItem("auto_restaurar_rascunho", "true");
    navigate(form.rota);
  };

  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const addBusinessDays = (dateString, businessDays = 7) => {
    const result = new Date(dateString);
    let remaining = businessDays;

    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      const isWeekend = day === 0 || day === 6;
      if (!isWeekend) {
        remaining -= 1;
      }
    }

    return result;
  };

  const formatarTempoRestante = (dataSalvamento) => {
    const expirationDate = addBusinessDays(dataSalvamento, 7);
    const diffMs = expirationDate.getTime() - currentTime;

    if (diffMs <= 0) {
      return { label: "Expirando agora", tone: "danger" };
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days >= 2) {
      return { label: `Expira em ${days} dias`, tone: "ok" };
    }

    if (days === 1) {
      return { label: `Expira em 1 dia e ${hours}h`, tone: "warn" };
    }

    return { label: `Expira em ${Math.max(hours, 1)}h`, tone: "danger" };
  };

  const getTituloFormulario = (tipo) => {
    const tipos = {
      compra: "Compra",
      recompra: "Recompra",
      proposta: "Proposta",
      ocorrencia: "Ocorrência",
    };
    return tipos[tipo] || tipo;
  };

  return (
    <MainLayout>
      <div className="saved-forms-page max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="p-2 rounded-lg hover:bg-tegra-gray-light transition-colors"
            aria-label="Voltar ao dashboard"
          >
            <MdArrowBack className="text-2xl text-tegra-blue-dark" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-tegra-text-primary">
              Formulários Salvos
            </h1>
            <p className="text-sm sm:text-base text-tegra-text-secondary mt-1">
              {forms.length === 0
                ? "Você não possui formulários salvos"
                : `Você tem ${forms.length} formulário(s) salvo(s)`}
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-tegra-text-secondary">Carregando...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 flex flex-col items-center justify-center">
            <div className="text-5xl mb-4 text-tegra-gray-medium">📋</div>
            <h2 className="text-xl font-semibold text-tegra-text-primary mb-2">
              Nenhum formulário salvo
            </h2>
            <p className="text-tegra-text-secondary text-center mb-6 max-w-sm">
              Você ainda não salvou nenhum formulário temporariamente. Ao preencher um formulário e
              clicar em "Salvar formulario", ele aparecerá aqui.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(ROUTES.COMPRA)}
            >
              Ir para Compra
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {forms.map((form, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-tegra-gray-light overflow-hidden"
              >
                <div className="p-4 sm:p-6">
                  {/* Tipo e Data */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-tegra-blue-light/20 text-tegra-blue-dark text-xs sm:text-sm font-semibold rounded-full mb-2">
                        {getTituloFormulario(form.tipo)}
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-tegra-text-primary">
                        {form.titulo || `Formulário ${getTituloFormulario(form.tipo)}`}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-tegra-text-secondary">
                      <MdCalendarToday className="text-base" />
                      {formatarData(form.dataSalvamento)}
                    </div>
                  </div>

                  {/* Info do Formulário */}
                  <div className="mb-4 pb-4 border-b border-tegra-gray-light">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {form.paciente && (
                        <div>
                          <p className="text-tegra-text-secondary text-xs font-medium">Paciente/Cliente</p>
                          <p className="text-tegra-text-primary font-medium">{form.paciente}</p>
                        </div>
                      )}
                      {form.cpf && (
                        <div>
                          <p className="text-tegra-text-secondary text-xs font-medium">CPF/CNPJ</p>
                          <p className="text-tegra-text-primary font-medium">{form.cpf}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Dados */}
                  {form.resumo && (
                    <div className="mb-4 pb-4 border-b border-tegra-gray-light">
                      <p className="text-xs text-tegra-text-secondary font-medium mb-2">Resumo do Formulário</p>
                      <p className="text-sm text-tegra-text-primary line-clamp-3">
                        {form.resumo}
                      </p>
                    </div>
                  )}

                  {/* Rodapé do Card */}
                  <div className="pt-4 border-t border-tegra-gray-light">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {(() => {
                      const timer = formatarTempoRestante(form.dataSalvamento);
                      const toneClass =
                        timer.tone === "danger"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : timer.tone === "warn"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200";

                      return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-semibold w-fit ${toneClass}`}>
                          <MdAccessTime className="text-base" />
                          {timer.label}
                        </div>
                      );
                    })()}

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end sm:ml-auto">
                      <Button
                        variant="primary"
                        onClick={() => recuperarFormulario(form)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                      >
                        <MdOpenInNew className="text-lg" />
                        <span className="hidden sm:inline">Recuperar</span>
                        <span className="sm:hidden">Abrir</span>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => excluirFormulario(index)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-tegra-error hover:text-tegra-error-dark"
                      >
                        <MdDelete className="text-lg" />
                        <span className="hidden sm:inline">Excluir</span>
                        <span className="sm:hidden">Del</span>
                      </Button>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 p-4 sm:p-6 bg-blue-50 rounded-lg border border-tegra-blue-light/30">
          <p className="text-xs sm:text-sm text-tegra-text-secondary">
            <span className="font-semibold text-tegra-blue-dark">💡 Dica:</span> Os formulários salvos
            ficam vinculados ao seu usuário e podem ser acessados em outros dispositivos com o mesmo login.
            Para manter o sistema leve, eles expiram automaticamente após 7 dias úteis.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
