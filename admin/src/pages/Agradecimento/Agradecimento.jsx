import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { ROUTES } from "../../utils/constants";
import { MdCheck, MdDownload } from "react-icons/md";
import { gerarComprovantePDF } from "../../utils/generateComprovantePDF";

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default function Agradecimento() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const previewTipo = (searchParams.get("preview") || "").toLowerCase();
  const isPreview = ["compra", "recompra", "proposta", "ocorrencia"].includes(
    previewTipo,
  );

  const dadosPreviewPorTipo = {
    compra: {
      protocolo: "PREVIEW-COMPRA-0001",
      tipoSolicitacao: "1ª Compra",
      consultorTegra: "Paulo Silva",
      nomePaciente: "TESTE",
      sobrenomePaciente: "TI",
      celularPaciente: "+551199999999",
      emailPaciente: "teste@email.com",
      rua: "Rua Exemplo",
      numero: "123",
      bairro: "Centro",
      cidade: "Sao Paulo",
      estado: "SP",
      cep: "00000-000",
      pais: "Brasil",
      produtos: [{ nome: "MP 1:1- 1500mg", quantidade: "1", valor: "399.90" }],
      totalCompra: 399.9,
      dataCriacao: "2026-03-19T14:21:31",
    },
    recompra: {
      protocolo: "PREVIEW-RECOMPRA-0001",
      tipoSolicitacao: "Recompra",
      consultorTegra: "Paulo Silva",
      nomePaciente: "TESTE",
      sobrenomePaciente: "TI",
      celularPaciente: "+551199999999",
      emailPaciente: "teste@email.com",
      rua: "Rua Exemplo",
      numero: "123",
      bairro: "Centro",
      cidade: "Sao Paulo",
      estado: "SP",
      cep: "00000-000",
      pais: "Brasil",
      produtos: [{ nome: "MP 1:1- 1500mg", quantidade: "2", valor: "399.90" }],
      totalCompra: 799.8,
      dataCriacao: "2026-03-19T14:21:31",
    },
    proposta: {
      protocolo: "PREVIEW-PROPOSTA-0001",
      tipoSolicitacao: "Proposta",
      consultorTegra: "Paulo Silva",
      nomePaciente: "TESTE",
      sobrenomePaciente: "TI",
      celularPaciente: "+551199999999",
      emailPaciente: "teste@email.com",
      rua: "Rua Exemplo",
      numero: "123",
      bairro: "Centro",
      cidade: "Sao Paulo",
      estado: "SP",
      cep: "00000-000",
      pais: "Brasil",
      produtos: [{ nome: "MP 1:1- 1500mg", quantidade: "1", valor: "399.90" }],
      totalCompra: 399.9,
      dataCriacao: "2026-03-19T14:21:31",
    },
    ocorrencia: {
      protocolo: "PREVIEW-OCORRENCIA-0001",
      tipoSolicitacao: "Ocorrência",
      consultorTegra: "Paulo Silva",
      assunto: "Acareação",
      nomePaciente: "TESTE",
      sobrenomePaciente: "TI",
      celularPaciente: "+551199999999",
      telefonePaciente: "",
      produtos: [{ nome: "MP 1:1- 1500mg", quantidade: "", valor: "" }],
      numeroPedido: "",
      awb: "",
      dataPedido: "",
      numeroLote: "",
      dataValidade: "",
      observacoes: "123",
      dataCriacao: "2026-03-19T14:21:31",
    },
  };

  const dadosSessao = (() => {
    try {
      const raw = sessionStorage.getItem("agradecimentoState");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Obtém os dados passados via state (com fallback em sessionStorage)
  const {
    tipoSolicitacao,
    nomePaciente,
    sobrenomePaciente,
    dataCriacao,
    origem,
    dadosComprovante,
  } = location.state || dadosSessao || {};

  const dadosTela = dadosComprovante || (isPreview ? dadosPreviewPorTipo[previewTipo] : null);
  const tipoSolicitacaoTela = tipoSolicitacao || dadosTela?.tipoSolicitacao;
  const nomePacienteTela = nomePaciente || dadosTela?.nomePaciente;
  const sobrenomePacienteTela = sobrenomePaciente || dadosTela?.sobrenomePaciente;
  const dataCriacaoTela = dataCriacao || dadosTela?.dataCriacao;

  // Se não houver dados, redireciona para dashboard
  useEffect(() => {
    if (
      !isPreview &&
      (!tipoSolicitacaoTela || !nomePacienteTela || !sobrenomePacienteTela)
    ) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [
    isPreview,
    tipoSolicitacaoTela,
    nomePacienteTela,
    sobrenomePacienteTela,
    navigate,
  ]);

  const formatarDataComSegundos = (data) => {
    const dataObj = data ? new Date(data) : new Date();

    if (Number.isNaN(dataObj.getTime())) {
      return "Data inválida";
    }

    const dia = String(dataObj.getDate()).padStart(2, "0");
    const mes = MESES_ABREV[dataObj.getMonth()] || "Mes";
    const ano = dataObj.getFullYear();
    const hora = String(dataObj.getHours()).padStart(2, "0");
    const minuto = String(dataObj.getMinutes()).padStart(2, "0");
    const segundo = String(dataObj.getSeconds()).padStart(2, "0");

    return `${dia}-${mes}-${ano} ${hora}:${minuto}:${segundo}`;
  };

  const formatarValor = (valor) => {
    if (valor === null || valor === undefined) return " ";
    const texto = String(valor).trim();
    return texto || " ";
  };

  const ehOcorrencia = String(tipoSolicitacaoTela || "")
    .toLowerCase()
    .includes("ocorr");

  const nomeProdutos = (dadosTela?.produtos || [])
    .map((produto) => produto?.nome)
    .filter(Boolean)
    .join(" | ");

  const quantidadeProdutos = (dadosTela?.produtos || [])
    .map((produto) => produto?.quantidade)
    .filter((valor) => valor !== undefined && valor !== null && String(valor).trim() !== "")
    .join(" | ");

  const dadosOcorrencia = [
    {
      label: "Consultor Tegra",
      valor: formatarValor(dadosTela?.consultorTegra),
    },
    {
      label: "Assunto",
      valor: formatarValor(dadosTela?.assunto),
    },
    {
      label: "Primeiro - paciente",
      valor: formatarValor(dadosTela?.nomePaciente),
    },
    {
      label: "Sobrenome - paciente",
      valor: formatarValor(dadosTela?.sobrenomePaciente),
    },
    {
      label: "Celular do paciente",
      valor: formatarValor(dadosTela?.celularPaciente),
    },
    {
      label: "Telefone do paciente",
      valor: formatarValor(dadosTela?.telefonePaciente),
    },
    {
      label: "Nome produto",
      valor: formatarValor(nomeProdutos),
    },
    {
      label: "Quantidade produto",
      valor: formatarValor(quantidadeProdutos),
    },
    {
      label: "Número do pedido",
      valor: formatarValor(dadosTela?.numeroPedido),
    },
    {
      label: "AWB",
      valor: formatarValor(dadosTela?.awb),
    },
    {
      label: "Data do pedido",
      valor: formatarValor(dadosTela?.dataPedido),
    },
    {
      label: "Número de lote",
      valor: formatarValor(dadosTela?.numeroLote),
    },
    {
      label: "Data validade",
      valor: formatarValor(dadosTela?.dataValidade),
    },
    {
      label: "Observações",
      valor: formatarValor(dadosTela?.observacoes),
    },
  ];

  const enderecoLinha = [
    formatarValor(dadosTela?.rua),
    formatarValor(dadosTela?.numero),
    formatarValor(dadosTela?.bairro),
    formatarValor(dadosTela?.cidade),
    formatarValor(dadosTela?.estado),
    formatarValor(dadosTela?.cep),
    formatarValor(dadosTela?.pais),
  ]
    .filter((valor) => valor && valor !== " ")
    .join(" - ");

  const dadosGerais = [
    {
      label: "Consultor Tegra",
      valor: formatarValor(dadosTela?.consultorTegra),
    },
    {
      label: "Primeiro - paciente",
      valor: formatarValor(nomePacienteTela),
    },
    {
      label: "Sobrenome - paciente",
      valor: formatarValor(sobrenomePacienteTela),
    },
    {
      label: "Celular do paciente",
      valor: formatarValor(dadosTela?.celularPaciente),
    },
    {
      label: "Email do paciente",
      valor: formatarValor(dadosTela?.emailPaciente),
    },
    {
      label: "Endereco",
      valor: formatarValor(enderecoLinha),
    },
    {
      label: "Nome produto",
      valor: formatarValor(nomeProdutos),
    },
    {
      label: "Quantidade produto",
      valor: formatarValor(quantidadeProdutos),
    },
    {
      label: "Total",
      valor:
        typeof dadosTela?.totalCompra === "number"
          ? `R$ ${dadosTela.totalCompra.toFixed(2)}`
          : formatarValor(dadosTela?.totalCompra),
    },
  ];

  const dadosExibicao = ehOcorrencia ? dadosOcorrencia : dadosGerais;
  const tituloDados = ehOcorrencia ? "Dados da ocorrência" : "Dados da solicitação";

  // Função para voltar à página de origem
  const handleVoltar = () => {
    if (origem === "compra") {
      navigate(ROUTES.COMPRA);
    } else if (origem === "recompra") {
      navigate(ROUTES.RECOMPRA);
    } else if (origem === "ocorrencia") {
      navigate(ROUTES.OCORRENCIA);
    } else if (origem === "proposta") {
      navigate(ROUTES.PROPOSTA);
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  // Função para baixar o comprovante em PDF
  const handleBaixarComprovante = () => {
    if (!dadosTela) {
      console.warn("Dados do comprovante não disponíveis");
      return;
    }

    try {
      gerarComprovantePDF(dadosTela);
    } catch (error) {
      console.error("Erro ao gerar comprovante:", error);
    }
  };

  if (!tipoSolicitacaoTela || !nomePacienteTela || !sobrenomePacienteTela) {
    return null; // Retorna null enquanto redireciona
  }

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="max-w-4xl w-full bg-tegra-bg-primary rounded-2xl shadow-lg border border-tegra-gray-light overflow-hidden">
          <div className="relative px-6 sm:px-8 md:px-10 py-6 sm:py-8 bg-gradient-to-r from-tegra-bg-secondary to-tegra-bg-primary border-b border-tegra-gray-light">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-tegra-blue-dark/10" />
            <div className="absolute -bottom-10 -left-8 w-20 h-20 rounded-full bg-tegra-blue-dark/10" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-tegra-blue-dark flex items-center justify-center bg-tegra-bg-primary">
                  <MdCheck className="text-3xl sm:text-4xl text-tegra-blue-dark" />
                </div>
                <div>
                  <p className="text-base sm:text-lg md:text-xl text-tegra-text-primary font-semibold leading-tight">
                    Sua solicitação de {String(tipoSolicitacaoTela || "solicitação").toLowerCase()} foi enviada com sucesso.
                  </p>
                  <p className="text-sm text-tegra-text-secondary mt-1">
                    Inserido no dia {formatarDataComSegundos(dataCriacaoTela)}.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-tegra-blue-dark/30 bg-tegra-blue-dark/10 px-3 py-1 text-xs sm:text-sm font-medium text-tegra-blue-dark">
                  {tipoSolicitacaoTela}
                </span>
                <span className="inline-flex items-center rounded-full border border-tegra-gray-medium bg-tegra-bg-primary px-3 py-1 text-xs sm:text-sm font-medium text-tegra-text-primary">
                  Protocolo: {formatarValor(dadosTela?.protocolo)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 md:px-10 py-6 sm:py-8">
            <div className="bg-tegra-bg-secondary rounded-xl border border-tegra-gray-light p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-4 sm:mb-5">
                {tituloDados}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {dadosExibicao.map((item) => {
                  const valorNormalizado = String(item.valor || "").trim();
                  const valorFinal = valorNormalizado || "Não informado";

                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-tegra-gray-light bg-tegra-bg-primary p-3 sm:p-4 shadow-sm"
                    >
                      <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-tegra-text-secondary mb-1.5">
                        {item.label}
                      </p>
                      <p className={`text-sm sm:text-base break-words whitespace-pre-wrap ${
                        valorNormalizado
                          ? "text-tegra-text-primary font-medium"
                          : "text-tegra-text-secondary italic"
                      }`}>
                        {valorFinal}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-center text-tegra-text-primary font-medium mb-6 sm:mb-8">
              Obrigado!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBaixarComprovante}
                disabled={!dadosTela}
                className="w-full sm:w-auto min-w-[220px] flex items-center justify-center gap-2"
              >
                <MdDownload className="text-lg" />
                Baixar Comprovante
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleVoltar}
                className="w-full sm:w-auto min-w-[220px]"
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
