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

const CAMPOS_IGNORADOS = new Set([
  "arquivos",
  "documentos",
  "documento",
  "attachment",
  "attachments",
]);

const CHAVE_BUSCA_REGEX = /busca|buscar|pesquisa|search/i;

const temValor = (valor) => {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "string") return valor.trim() !== "";
  if (Array.isArray(valor)) return valor.some((item) => temValor(item));
  if (typeof valor === "object") {
    return Object.values(valor).some((item) => temValor(item));
  }
  return true;
};

const formatarRotuloCampo = (chave) => {
  const texto = String(chave)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const formatarValorCampo = (valor) => {
  if (!temValor(valor)) return null;

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }

  if (Array.isArray(valor)) {
    const linhas = valor
      .map((item, index) => {
        if (!temValor(item)) return null;

        if (typeof item === "object" && !Array.isArray(item)) {
          const pares = Object.entries(item)
            .filter(([, valorInterno]) => temValor(valorInterno))
            .map(
              ([chaveInterna, valorInterno]) =>
                `${formatarRotuloCampo(chaveInterna)}: ${String(valorInterno).trim()}`,
            );

          return pares.length > 0 ? `${index + 1}. ${pares.join(" | ")}` : null;
        }

        return `${index + 1}. ${String(item).trim()}`;
      })
      .filter(Boolean);

    return linhas.length > 0 ? linhas.join("\n") : null;
  }

  if (typeof valor === "object") {
    const pares = Object.entries(valor)
      .filter(([, valorInterno]) => temValor(valorInterno))
      .map(
        ([chaveInterna, valorInterno]) =>
          `${formatarRotuloCampo(chaveInterna)}: ${String(valorInterno).trim()}`,
      );

    return pares.length > 0 ? pares.join(" | ") : null;
  }

  return String(valor).trim();
};

const extrairCamposPreenchidos = (dados) => {
  if (!dados || typeof dados !== "object") return [];

  return Object.entries(dados)
    .filter(([chave, valor]) => {
      const chaveNormalizada = String(chave || "").toLowerCase();
      if (CAMPOS_IGNORADOS.has(chaveNormalizada)) return false;
      if (CHAVE_BUSCA_REGEX.test(chaveNormalizada)) return false;
      return temValor(valor);
    })
    .map(([chave, valor]) => ({
      chave,
      label: formatarRotuloCampo(chave),
      valor: formatarValorCampo(valor),
    }))
    .filter((item) => temValor(item.valor));
};

const CONFIG_SECOES = [
  {
    id: "geral",
    titulo: "Informacoes gerais",
    regex: /(protocolo|tipoSolicitacao|consultor|dataCriacao|origem)/i,
  },
  {
    id: "paciente",
    titulo: "Paciente",
    regex: /(paciente|cpf|rg|nascimento|celular|telefone|email)/i,
  },
  {
    id: "representante",
    titulo: "Representante",
    regex: /(representante)/i,
  },
  {
    id: "medico",
    titulo: "Medico",
    regex: /(medico|crm|especialidade|ufCrm)/i,
  },
  {
    id: "endereco",
    titulo: "Endereco",
    regex: /(rua|bairro|cidade|estado|cep|pais|numero|complemento)/i,
  },
  {
    id: "produtos",
    titulo: "Produtos",
    regex: /(produto|totalCompra|numeroPedido|lote|awb|validade|pedido)/i,
  },
  {
    id: "pagamento",
    titulo: "Pagamento e negociacao",
    regex: /(pagamento|termos|condicoes|negociacao|link|tipoLink)/i,
  },
];

const agruparCamposPorSecao = (campos) => {
  const secoesMap = new Map();

  for (const secao of CONFIG_SECOES) {
    secoesMap.set(secao.id, {
      id: secao.id,
      titulo: secao.titulo,
      campos: [],
    });
  }

  secoesMap.set("outros", {
    id: "outros",
    titulo: "Outros dados",
    campos: [],
  });

  for (const campo of campos) {
    const secaoEncontrada = CONFIG_SECOES.find((secao) =>
      secao.regex.test(String(campo.chave || "")),
    );
    const secaoId = secaoEncontrada?.id || "outros";
    secoesMap.get(secaoId)?.campos.push(campo);
  }

  return Array.from(secoesMap.values()).filter(
    (secao) => secao.campos.length > 0,
  );
};

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

  const dadosExibicao = extrairCamposPreenchidos(dadosTela);
  const secoesDados = agruparCamposPorSecao(dadosExibicao);

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
  const handleBaixarComprovante = async () => {
    if (!dadosTela) {
      console.warn("Dados do comprovante não disponíveis");
      return;
    }

    try {
      await gerarComprovantePDF(dadosTela);
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
        <div className="max-w-5xl w-full bg-tegra-bg-primary rounded-2xl shadow-xl border border-tegra-gray-light overflow-hidden">
          <div className="relative px-6 sm:px-8 md:px-10 py-6 sm:py-8 bg-gradient-to-r from-tegra-bg-secondary via-tegra-bg-primary to-tegra-bg-secondary border-b border-tegra-gray-light">
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
            <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl border border-tegra-gray-light bg-tegra-bg-secondary p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wide text-tegra-text-secondary font-semibold">Protocolo</p>
                <p className="text-sm sm:text-base font-bold text-tegra-text-primary mt-1 break-all">{formatarValor(dadosTela?.protocolo)}</p>
              </div>
              <div className="rounded-xl border border-tegra-gray-light bg-tegra-bg-secondary p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wide text-tegra-text-secondary font-semibold">Paciente</p>
                <p className="text-sm sm:text-base font-bold text-tegra-text-primary mt-1">
                  {[nomePacienteTela, sobrenomePacienteTela].filter(Boolean).join(" ")}
                </p>
              </div>
              <div className="rounded-xl border border-tegra-gray-light bg-tegra-bg-secondary p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wide text-tegra-text-secondary font-semibold">Tipo</p>
                <p className="text-sm sm:text-base font-bold text-tegra-text-primary mt-1">{tipoSolicitacaoTela}</p>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
              {secoesDados.map((secao) => (
                <div
                  key={secao.id}
                  className="bg-tegra-bg-secondary rounded-xl border border-tegra-gray-light p-4 sm:p-6"
                >
                  <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                    {secao.titulo}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {secao.campos.map((item) => {
                      const valorNormalizado = String(item.valor || "").trim();
                      const valorFinal = valorNormalizado || "Nao informado";

                      return (
                        <div
                          key={`${secao.id}-${item.chave}`}
                          className="rounded-xl border border-tegra-gray-light bg-tegra-bg-primary p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow"
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
              ))}
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
