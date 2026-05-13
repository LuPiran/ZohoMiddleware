import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { ROUTES } from "../../utils/constants";
import { MdArrowBack, MdDelete, MdOpenInNew, MdCalendarToday, MdAccessTime, MdCheckCircle, MdPending } from "react-icons/md";
import {
  obterFormulariosSalvos,
  excluirFormulario as excluirFormularioService,
  sincronizarOwnerOcorrenciasSalvas,
} from "../../services/savedForms";

export default function SavedForms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [filtroAtivo, setFiltroAtivo] = useState("todos");
  const [ocorrenciasBandejaAberta, setOcorrenciasBandejaAberta] = useState(false);

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
      await sincronizarOwnerOcorrenciasSalvas();
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

  const SAVED_FORM_ID_KEYS = {
    compra: "saved_form_id_compra",
    recompra: "saved_form_id_recompra",
    proposta: "saved_form_id_proposta",
    ocorrencia: "saved_form_id_ocorrencia",
  };

  const recuperarFormulario = (form) => {
    // Gravar os dados no DRAFT_KEY do formulário para que ele restaure automaticamente
    const draftKey = DRAFT_KEYS[form.tipo];
    const formIdKey = SAVED_FORM_ID_KEYS[form.tipo];
    if (draftKey && form.dados) {
      localStorage.setItem(draftKey, JSON.stringify(form.dados));
    }
    if (formIdKey && form.id) {
      localStorage.setItem(formIdKey, form.id);
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

  const addDays = (dateString, days = 15) => {
    const result = new Date(dateString);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatarTempoRestante = (dataSalvamento) => {
    const expirationDate = addDays(dataSalvamento, 15);
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

  const formatarTempoRestanteResolucao = (crmResolvedUntil) => {
    if (!crmResolvedUntil) {
      return { label: "Resolvida no CRM", tone: "ok" };
    }

    const expirationDate = new Date(crmResolvedUntil);
    const diffMs = expirationDate.getTime() - currentTime;

    if (diffMs <= 0) {
      return { label: "Visibilidade encerrada", tone: "danger" };
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days >= 2) {
      return { label: `Resolvida há ${days} dias`, tone: "ok" };
    }

    if (days === 1) {
      return { label: `Resolvida há 1 dia e ${hours}h`, tone: "warn" };
    }

    return { label: `Resolvida - sai em ${Math.max(hours, 1)}h`, tone: "danger" };
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

  const getStatusConfig = (form) => {
    if (form.tipo === "ocorrencia" && form.enviado && form.crmStatus === "em_tratamento" && form.crmOwnerName) {
      return {
        label: "EM TRATAMENTO",
        chipClass: "bg-blue-600 text-white border-blue-700",
        cardClass: "border-l-4 border-l-blue-500",
        primaryLabelDesktop: "Abrir",
        primaryLabelMobile: "Abrir",
      };
    }

    if (form.tipo === "ocorrencia" && form.enviado && form.crmStatus === "nao_atendida") {
      return {
        label: "NAO ATENDIDA",
        chipClass: "bg-rose-600 text-white border-rose-700",
        cardClass: "border-l-4 border-l-rose-500",
        primaryLabelDesktop: "Abrir",
        primaryLabelMobile: "Abrir",
      };
    }

    if (form.tipo === "ocorrencia" && form.enviado && form.crmStatus === "resolvida") {
      return {
        label: "RESOLVIDA",
        chipClass: "bg-slate-700 text-white border-slate-800",
        cardClass: "border-l-4 border-l-slate-600",
        primaryLabelDesktop: "Abrir",
        primaryLabelMobile: "Abrir",
      };
    }

    if (form.enviado) {
      return {
        label: "ENVIADO",
        chipClass: "bg-emerald-600 text-white border-emerald-700",
        cardClass: "border-l-4 border-l-emerald-500",
        primaryLabelDesktop: "Abrir",
        primaryLabelMobile: "Abrir",
      };
    }

    return {
      label: "PENDENTE",
      chipClass: "bg-amber-500 text-white border-amber-600",
      cardClass: "border-l-4 border-l-amber-500",
      primaryLabelDesktop: "Continuar",
      primaryLabelMobile: "Continuar",
    };
  };

  const getFilterLabel = (filtro) => {
    const labels = {
      todos: "Todos",
      compra: "Compra",
      recompra: "Recompra",
      proposta: "Proposta",
      ocorrencia: "Ocorrencia",
      nao_atendida: "Não atendidas",
      em_tratamento: "Em tratamento",
      resolvidas: "Resolvidas",
    };

    return labels[filtro] || filtro;
  };

  const aplicarFiltro = (filtro) => {
    setFiltroAtivo(filtro);

    if (filtro !== "ocorrencia" && !["em_tratamento", "nao_atendida", "resolvidas"].includes(filtro)) {
      setOcorrenciasBandejaAberta(false);
      return;
    }

    setOcorrenciasBandejaAberta(true);
  };

  const filtroStatusOcorrenciaMap = {
    nao_atendida: "nao_atendida",
    em_tratamento: "em_tratamento",
    resolvidas: "resolvida",
  };

  const filteredForms = forms.filter((form) => {
    if (filtroAtivo === "todos") {
      return true;
    }

    if (filtroAtivo === "ocorrencia") {
      return form.tipo === "ocorrencia";
    }

    if (["nao_atendida", "em_tratamento", "resolvidas"].includes(filtroAtivo)) {
      const statusEsperado = filtroStatusOcorrenciaMap[filtroAtivo];
      return form.tipo === "ocorrencia" && form.crmStatus === statusEsperado;
    }

    return form.tipo === filtroAtivo;
  });

  const filtroOcorrenciaAtivo = filtroAtivo === "ocorrencia" || ["em_tratamento", "nao_atendida", "resolvidas"].includes(filtroAtivo);

  const filtrosGeraisDisponiveis = [
    "todos",
    "compra",
    "recompra",
    "proposta",
  ];

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
            {forms.length > 0 && (
              <p className="text-xs sm:text-sm text-tegra-text-secondary mt-1">
                Cada item mostra se já foi enviado ou se ainda está pendente de envio.
              </p>
            )}
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
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg border border-tegra-gray-light shadow-sm p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-tegra-text-primary">Filtrar por</p>
                  <p className="text-xs sm:text-sm text-tegra-text-secondary">
                    {filteredForms.length} de {forms.length} exibido(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filtrosGeraisDisponiveis.map((filtro) => {
                    const ativo = filtroAtivo === filtro;

                    return (
                      <button
                        key={filtro}
                        type="button"
                        onClick={() => aplicarFiltro(filtro)}
                        className={`px-3 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                          ativo
                            ? "bg-tegra-blue-dark text-white border-tegra-blue-dark"
                            : "bg-white text-tegra-text-secondary border-tegra-gray-light hover:border-tegra-blue-light hover:text-tegra-blue-dark"
                        }`}
                      >
                        {getFilterLabel(filtro)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => aplicarFiltro("ocorrencia")}
                    className={`px-3 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                      filtroOcorrenciaAtivo || ocorrenciasBandejaAberta
                        ? "bg-tegra-blue-dark text-white border-tegra-blue-dark"
                        : "bg-white text-tegra-text-secondary border-tegra-gray-light hover:border-tegra-blue-light hover:text-tegra-blue-dark"
                    }`}
                    aria-expanded={ocorrenciasBandejaAberta}
                  >
                    Ocorrências
                  </button>
                </div>
                {(ocorrenciasBandejaAberta || filtroOcorrenciaAtivo) && (
                  <div className="mt-1 rounded-xl border border-tegra-gray-light bg-tegra-gray-light/30 p-3 sm:p-4">
                    <div className="flex flex-wrap gap-2">
                      {[
                        "nao_atendida",
                        "em_tratamento",
                        "resolvidas",
                      ].map((filtro) => {
                        const ativo = filtroAtivo === filtro;

                        return (
                          <button
                            key={filtro}
                            type="button"
                            onClick={() => aplicarFiltro(filtro)}
                            className={`px-3 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                              ativo
                                ? "bg-tegra-blue-dark text-white border-tegra-blue-dark"
                                : "bg-white text-tegra-text-secondary border-tegra-gray-light hover:border-tegra-blue-light hover:text-tegra-blue-dark"
                            }`}
                          >
                            {getFilterLabel(filtro)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {filteredForms.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4 text-tegra-gray-medium">🔎</div>
                <h2 className="text-xl font-semibold text-tegra-text-primary mb-2">
                  Nenhum formulário nesse filtro
                </h2>
                <p className="text-tegra-text-secondary max-w-sm">
                  Tente mudar o filtro para ver outros formulários salvos.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredForms.map((form, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-tegra-gray-light overflow-hidden ${getStatusConfig(form).cardClass}`}
              >
                <div className="p-4 sm:p-6">
                  {(() => {
                    const status = getStatusConfig(form);
                    const showTimer = !(form.tipo === "ocorrencia" && form.enviado);
                    const showResolvedTimer = form.tipo === "ocorrencia" && form.enviado && form.crmStatus === "resolvida";
                    const timer = showTimer
                      ? formatarTempoRestante(form.dataSalvamento)
                      : null;
                    const resolvedTimer = showResolvedTimer
                      ? formatarTempoRestanteResolucao(form.crmResolvedUntil)
                      : null;

                    return (
                      <>
                  {/* Tipo e Data */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-tegra-blue-light/20 text-tegra-blue-dark text-xs sm:text-sm font-semibold rounded-full mb-2">
                        {getTituloFormulario(form.tipo)}
                      </span>
                      <div className="mb-2 inline-flex">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${status.chipClass}`}>
                          {form.enviado ? <MdCheckCircle className="text-sm" /> : <MdPending className="text-sm" />}
                          {status.label}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-tegra-text-primary">
                        {form.titulo || `Formulário ${getTituloFormulario(form.tipo)}`}
                      </h3>
                      <p className="text-xs text-tegra-text-secondary mt-1">
                        Salvo em {formatarData(form.dataSalvamento)}
                        {form.enviado && form.dataEnvio ? ` • Enviado em ${formatarData(form.dataEnvio)}` : ""}
                      </p>
                      {form.enviado && form.protocolo && (
                        <p className="text-xs text-tegra-text-secondary mt-1">
                          Protocolo: <span className="font-semibold text-tegra-text-primary">{form.protocolo}</span>
                        </p>
                      )}
                      {form.tipo === "ocorrencia" && form.enviado && (
                        <p className="text-xs mt-1 text-tegra-text-secondary">
                          {form.crmStatus === "resolvida"
                            ? "Ocorrência finalizada no CRM"
                            : form.crmStatus === "nao_atendida"
                            ? "Nao atendida: aguardando atribuicao de analista"
                            : form.crmOwnerName
                            ? `Em tratamento por: ${form.crmOwnerName}`
                            : "Aguardando definição de analista no CRM"}
                        </p>
                      )}
                      {showResolvedTimer && resolvedTimer && (
                        <p className="text-xs mt-1 text-tegra-text-secondary">
                          {resolvedTimer.label}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <div className="inline-flex items-center gap-1 text-tegra-text-secondary">
                        <MdCalendarToday className="text-base" />
                        {formatarData(form.dataSalvamento)}
                      </div>
                      {showTimer && timer && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-tegra-gray-light text-tegra-text-secondary font-medium">
                          <MdAccessTime className="text-sm" />
                          {timer.label}
                        </div>
                      )}
                      {showResolvedTimer && resolvedTimer && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                          <MdAccessTime className="text-sm" />
                          {resolvedTimer.label}
                        </div>
                      )}
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
                      <div className="text-xs sm:text-sm text-tegra-text-secondary">
                        {form.enviado ? "Pronto para consulta" : "Aguardando envio"}
                      </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end sm:ml-auto">
                      <Button
                        variant="primary"
                        onClick={() => recuperarFormulario(form)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                      >
                        <MdOpenInNew className="text-lg" />
                        <span className="hidden sm:inline">{status.primaryLabelDesktop}</span>
                        <span className="sm:hidden">{status.primaryLabelMobile}</span>
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
                      </>
                    );
                  })()}
                </div>
              </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 p-4 sm:p-6 bg-blue-50 rounded-lg border border-tegra-blue-light/30">
          <p className="text-xs sm:text-sm text-tegra-text-secondary">
            <span className="font-semibold text-tegra-blue-dark">💡 Dica:</span> Os formulários salvos
            ficam vinculados ao seu usuário e podem ser acessados em outros dispositivos com o mesmo login.
            Para manter o sistema leve, eles expiram automaticamente após 15 dias.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
