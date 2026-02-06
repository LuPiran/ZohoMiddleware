import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/auth";
import { useLoading } from "../../contexts/LoadingContext";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import SplashScreen from "../../components/feedback/auth/SplashScreen";
import MainLayout from "../../components/layout/MainLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Checkbox from "../../components/ui/Checkbox";
import Textarea from "../../components/ui/Textarea";
import { ROUTES } from "../../utils/constants";
import api from "../../services/api";
import { productsService } from "../../services/products";
import { ocorrenciaService } from "../../services/ocorrencia";
import { hasAdminPanelPermission } from "../../utils/permissions";
import {
  MdPerson,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdAdd,
  MdDelete,
  MdSearch,
  MdLocationOn,
  MdClose,
  MdCloudUpload,
} from "react-icons/md";

export default function Ocorrencia() {
  const navigate = useNavigate();
  const { setLoading, isLoading } = useLoading();
  const { showToast } = useToast();
  const [showSplash, setShowSplash] = useState(false);

  // Estados do formulário do paciente
  const [nomePaciente, setNomePaciente] = useState("");
  const [sobrenomePaciente, setSobrenomePaciente] = useState("");
  const [cpfPaciente, setCpfPaciente] = useState("");
  const [rgPaciente, setRgPaciente] = useState("");
  const [celularPaciente, setCelularPaciente] = useState("");
  const [emailPaciente, setEmailPaciente] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [telefonePaciente, setTelefonePaciente] = useState("");

  // Estados do representante legal
  const [temRepresentanteLegal, setTemRepresentanteLegal] = useState(false);
  const [nomeRepresentante, setNomeRepresentante] = useState("");
  const [rgRepresentante, setRgRepresentante] = useState("");
  const [cpfRepresentante, setCpfRepresentante] = useState("");
  const [emailRepresentante, setEmailRepresentante] = useState("");
  const [celularRepresentante, setCelularRepresentante] = useState("");
  const [dataNascimentoRepresentante, setDataNascimentoRepresentante] =
    useState("");

  // Estado para dados do novo médico prescritor
  const [temNovoMedicoPrescritor, setTemNovoMedicoPrescritor] = useState(false);
  const [nomeMedico, setNomeMedico] = useState("");
  const [crmMedico, setCrmMedico] = useState("");
  const [ufCrm, setUfCrm] = useState("");
  const [celularMedico, setCelularMedico] = useState("");
  const [emailMedico, setEmailMedico] = useState("");
  const [especialidadeMedico, setEspecialidadeMedico] = useState("");

  // Lista de estados brasileiros para UF do CRM
  const estadosBrasileiros = [
    { value: "AC", label: "AC" },
    { value: "AL", label: "AL" },
    { value: "AP", label: "AP" },
    { value: "AM", label: "AM" },
    { value: "BA", label: "BA" },
    { value: "CE", label: "CE" },
    { value: "DF", label: "DF" },
    { value: "ES", label: "ES" },
    { value: "GO", label: "GO" },
    { value: "MA", label: "MA" },
    { value: "MT", label: "MT" },
    { value: "MS", label: "MS" },
    { value: "MG", label: "MG" },
    { value: "PA", label: "PA" },
    { value: "PB", label: "PB" },
    { value: "PR", label: "PR" },
    { value: "PE", label: "PE" },
    { value: "PI", label: "PI" },
    { value: "RJ", label: "RJ" },
    { value: "RN", label: "RN" },
    { value: "RS", label: "RS" },
    { value: "RO", label: "RO" },
    { value: "RR", label: "RR" },
    { value: "SC", label: "SC" },
    { value: "SP", label: "SP" },
    { value: "SE", label: "SE" },
    { value: "TO", label: "TO" },
  ];

  // Estados do endereço
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [pais, setPais] = useState("Brasil");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cep, setCep] = useState("");

  // Estado para busca de CEP
  const [buscarCep, setBuscarCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Estado para negociação feita pelo consultor
  const [negociacaoFeitaPeloConsultor, setNegociacaoFeitaPeloConsultor] =
    useState(false);
  const [solicitarLinkPagamento, setSolicitarLinkPagamento] = useState("");
  const [tipoLink, setTipoLink] = useState("");

  // Estado para produto (único produto, não lista)
  const [produto, setProduto] = useState({
    nome: "",
    produtoId: "",
    quantidade: "1",
    preco: "",
  });

  // Estado para produtos do Zoho (opções do select)
  const [produtosZoho, setProdutosZoho] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  // Estado para tipo de solicitação (apenas para Admin Painel)
  const [tipoSolicitacao, setTipoSolicitacao] = useState("1ª Compra");

  // Estados para forma de pagamento
  const [formaPagamento, setFormaPagamento] = useState("");
  const [termosCondicoesPagamento, setTermosCondicoesPagamento] = useState("");

  // Estado para motivo da ocorrência
  const [motivoOcorrencia, setMotivoOcorrencia] = useState("");
  
  // Estado para observação do motivo
  const [observacaoMotivo, setObservacaoMotivo] = useState("");

  // Estado para observação
  const [observacao, setObservacao] = useState("");

  // Estados para registro do pedido
  const [numeroPedido, setNumeroPedido] = useState("");
  const [awb, setAwb] = useState("");
  const [dataPedido, setDataPedido] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [dataValidade, setDataValidade] = useState("");

  // Estados para upload de arquivos
  const [arquivos, setArquivos] = useState([]);
  const [documentosCompletos, setDocumentosCompletos] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Carrega TODOS os produtos do Zoho ao montar o componente (sem filtrar por ativo)
    const carregarProdutos = async () => {
      setCarregandoProdutos(true);
      try {
        const response = await productsService.getAllProducts();
        if (response.success) {
          const produtosData = response.data || [];
          setProdutosZoho(produtosData);
        } else {
          showToast("⚠️ Erro ao carregar produtos", "warning");
        }
      } catch (error) {
        showToast("⚠️ Erro ao carregar produtos. Tente novamente.", "warning");
      } finally {
        setCarregandoProdutos(false);
        setLoading(false);
      }
    };

    carregarProdutos();
  }, [navigate, setLoading, showToast]);

  // Função para atualizar quantidade do produto
  const atualizarQuantidade = (valor) => {
    // Remove caracteres não numéricos
    const valorLimpo = valor.replace(/\D/g, "");

    // Se estiver vazio, mantém como está (permite digitação)
    if (valorLimpo === "") {
      setProduto({ ...produto, quantidade: "" });
      return;
    }

    const numValor = parseInt(valorLimpo);

    // Se for menor que 1, força para 1
    if (numValor < 1) {
      setProduto({ ...produto, quantidade: "1" });
    } else {
      setProduto({ ...produto, quantidade: valorLimpo });
    }
  };

  // Função para atualizar produto completo (nome, ID e preço)
  const atualizarProdutoCompleto = (nome, produtoId) => {
    // Busca o produto no array produtosZoho para obter o preço
    const produtoSelecionado = produtosZoho.find(
      (pz) => pz.id === produtoId || pz.nome === nome,
    );

    const preco = produtoSelecionado?.unitPrice || "";

    setProduto({
      nome: nome || "",
      produtoId: produtoId || "",
      quantidade: produto.quantidade || "1",
      preco: preco ? `R$ ${parseFloat(preco).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "",
    });
  };

  // Função para formatar CEP
  const formatarCep = (valor) => {
    const cep = valor.replace(/\D/g, "");
    return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  // Função para buscar CEP na API ViaCEP (via backend proxy)
  const handleBuscarCep = async (e) => {
    e.preventDefault();
    const cepLimpo = buscarCep.replace(/\D/g, "");

    if (!cepLimpo || cepLimpo.length !== 8) {
      showToast("⚠️ Digite um CEP válido com 8 dígitos", "warning");
      return;
    }

    setBuscandoCep(true);
    try {
      // Busca CEP via backend (que faz proxy para ViaCEP)
      const response = await api.get(`/api/cep/${cepLimpo}`);
      const data = response.data;

      if (data.erro || !data.logradouro) {
        showToast("❌ CEP não encontrado ou incorreto", "error");
        setBuscandoCep(false);
        return;
      }

      // Preenche os campos de endereço automaticamente
      setRua(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado(data.uf || "");
      setPais("Brasil");
      // Preenche o campo CEP do formulário com o CEP encontrado
      setCep(formatarCep(cepLimpo));

      showToast("✅ CEP encontrado com sucesso", "success", 2000);
      setBuscandoCep(false);
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);

      // Mensagem de erro mais específica
      let errorMessage = "❌ Erro ao buscar CEP";

      if (error.response?.status === 503) {
        errorMessage =
          "⚠️ Serviço de CEP temporariamente indisponível. Tente novamente.";
      } else if (error.response?.status === 404) {
        errorMessage = "❌ CEP não encontrado ou incorreto";
      } else if (error.response?.data?.message) {
        errorMessage = `❌ ${error.response.data.message}`;
      }

      showToast(errorMessage, "error");
      setBuscandoCep(false);
    }
  };

  // Função para formatar CPF
  const formatarCpf = (valor) => {
    const cpf = valor.replace(/\D/g, "");
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Função para formatar telefone/celular
  const formatarTelefone = (valor) => {
    const telefone = valor.replace(/\D/g, "");
    if (telefone.length <= 10) {
      return telefone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else {
      return telefone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
  };

  // Função para formatar RG
  const formatarRg = (valor) => {
    const rg = valor.replace(/\D/g, "");
    if (rg.length <= 2) {
      return rg;
    } else if (rg.length <= 5) {
      return rg.replace(/(\d{2})(\d{0,3})/, "$1.$2");
    } else if (rg.length <= 8) {
      return rg.replace(/(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else {
      return rg.replace(/(\d{2})(\d{3})(\d{3})(\d{0,1})/, "$1.$2.$3-$4");
    }
  };

  // Handler para CPF com formatação
  const handleCpfChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    if (valor.length <= 11) {
      setCpfPaciente(formatarCpf(valor));
    }
  };

  // Handler para telefone/celular com formatação
  const handleTelefoneChange = (e, setter) => {
    const valor = e.target.value.replace(/\D/g, "");
    if (valor.length <= 11) {
      setter(formatarTelefone(valor));
    }
  };

  // Função para limpar todos os campos do formulário
  const limparFormulario = () => {
    setNomePaciente("");
    setSobrenomePaciente("");
    setCpfPaciente("");
    setCelularPaciente("");
    setEmailPaciente("");
    setNomeMedico("");
    setCrmMedico("");
    setUfCrm("");
    setCelularMedico("");
    setEmailMedico("");
    setMotivoOcorrencia("");
    setObservacaoMotivo("");
    setNumeroPedido("");
    setAwb("");
    setDataPedido("");
    setNumeroLote("");
    setDataValidade("");
    setArquivos([]);
    setDocumentosCompletos(false);
    setProduto({ nome: "", produtoId: "", quantidade: "1", preco: "" });
  };

  // Função para validar campos obrigatórios
  const validarCamposObrigatorios = () => {
    const camposVazios = [];

    // Valida campos do paciente
    if (!nomePaciente.trim()) camposVazios.push("Nome");
    if (!sobrenomePaciente.trim()) camposVazios.push("Sobrenome");
    if (!cpfPaciente.trim()) camposVazios.push("CPF");


    // Valida produto
    if (!produto.nome.trim() || !produto.produtoId) {
      camposVazios.push("Produto");
    }

    // Valida quantidade do produto
    if (produto.nome.trim() && produto.produtoId) {
      const quantidade = parseInt(produto.quantidade) || 0;
      if (quantidade <= 0) {
        showToast(
          "❌ A quantidade do produto não pode ser igual ou menor que 0",
          "error",
        );
        return { valido: false, camposVazios: [] };
      }
    }

    // Valida campos do novo médico prescritor
    if (!nomeMedico.trim()) camposVazios.push("Nome do Médico");
    if (!crmMedico.trim()) camposVazios.push("CRM do Médico");
    if (!ufCrm.trim()) camposVazios.push("UF do CRM");
    if (!celularMedico.trim()) camposVazios.push("Celular do Médico");
    if (!emailMedico.trim()) camposVazios.push("E-mail do Médico");

    if (camposVazios.length > 0) {
      const camposTexto = camposVazios.join(", ");
      showToast(`❌ Campos: ${camposTexto} são obrigatórios`, "error");
      return { valido: false, camposVazios };
    }

    return { valido: true, camposVazios: [] };
  };

  // Função para submeter o formulário
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Valida campos obrigatórios
    const validacao = validarCamposObrigatorios();
    if (!validacao.valido) {
      return;
    }

    // Mostra splash screen durante a criação
    setShowSplash(true);
    setLoading(true);

    try {
      // Converte arquivos para base64
      const arquivosBase64 =
        arquivos && arquivos.length > 0
          ? await Promise.all(
              arquivos.map(async (arquivo) => {
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result.split(",")[1]; // Remove o prefixo data:type;base64,
                    resolve({
                      fileName: arquivo.name,
                      base64: base64,
                      contentType: arquivo.type || "application/octet-stream",
                    });
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(arquivo);
                });
              }),
            )
          : [];

      // Prepara os dados da ocorrência
      const dadosOcorrencia = {
        nomePaciente,
        sobrenomePaciente,
        cpfPaciente,
        celularPaciente,
        emailPaciente,
        motivoOcorrencia,
        observacaoMotivo,
        nomeMedico,
        emailMedico,
        ufCrm,
        celularMedico,
        crmMedico,
        produto: {
          nome: produto.nome || "",
          quantidade: produto.quantidade || "",
          preco: produto.preco || "",
        },
        numeroPedido,
        awb,
        numeroLote,
        dataPedido,
        dataValidade,
        // Arquivos para upload (convertidos para base64)
        arquivos: arquivosBase64,
      };

      // Envia para o backend
      const response = await ocorrenciaService.criarOcorrencia(dadosOcorrencia);

      if (response.success) {
        // Obtém a data de criação do registro (do Zoho ou usa data atual)
        const dataCriacao =
          response.data?.Created_Time ||
          response.data?.created_time ||
          new Date().toISOString();

        // Oculta splash screen antes de navegar
        setShowSplash(false);

        // Navega para a página de agradecimento com os dados necessários
        navigate(ROUTES.AGRADECIMENTO, {
          state: {
            tipoSolicitacao: "Ocorrência",
            nomePaciente,
            sobrenomePaciente,
            dataCriacao,
            origem: "ocorrencia",
          },
        });
      }
    } catch (error) {
      console.error("Erro ao criar ocorrência:", error);
      const errorMessage =
        error.error ||
        error.message ||
        "Erro ao cadastrar ocorrência. Tente novamente.";
      showToast(`❌ ${errorMessage}`, "error");
      setShowSplash(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen message="Criando ocorrência..." />}
      <MainLayout>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(/painel_consultor_ocorrencia.png)',
            backgroundSize: 'cover',
            backgroundPosition: '40% center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(3px)'
          }}
        />
        <div 
          className="fixed inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.8) 50%, rgba(255, 255, 255, 0.85) 100%)'
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary mb-4 sm:mb-6">
            Nova Ocorrência
          </h1>

          <form
            className="space-y-4 sm:space-y-6 md:space-y-8"
            onSubmit={handleSubmit}
          >
            {/* Seção: Dados do Paciente */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Dados do Paciente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Nome"
                  type="text"
                  value={nomePaciente}
                  onChange={(e) => setNomePaciente(e.target.value)}
                  placeholder="Nome do paciente"
                  icon={<MdPerson className="text-xl" />}
                />
                <Input
                  label="Sobrenome"
                  type="text"
                  value={sobrenomePaciente}
                  onChange={(e) => setSobrenomePaciente(e.target.value)}
                  placeholder="Sobrenome do paciente"
                  icon={<MdPerson className="text-xl" />}
                />
                <Input
                  label="CPF"
                  type="text"
                  value={cpfPaciente}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                <Input
                  label="Celular"
                  type="text"
                  value={celularPaciente}
                  onChange={(e) => handleTelefoneChange(e, setCelularPaciente)}
                  placeholder="(00) 00000-0000"
                  icon={<MdPhone className="text-xl" />}
                  maxLength={15}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={emailPaciente}
                  onChange={(e) => setEmailPaciente(e.target.value)}
                  placeholder="email@exemplo.com"
                  icon={<MdEmail className="text-xl" />}
                />
              </div>
            </div>

            {/* Seção: Motivo da Ocorrência */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Motivo da Ocorrência
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <Select
                  label="Motivo da Ocorrência"
                  value={motivoOcorrencia}
                  onChange={(e) => setMotivoOcorrencia(e.target.value)}
                  options={[
                    { value: "Acareação", label: "Acareação" },
                    { value: "Anvisa", label: "Anvisa" },
                    { value: "Atraso de produção", label: "Atraso de produção" },
                    { value: "Cor", label: "Cor" },
                    { value: "Demora na Entrega", label: "Demora na Entrega" },
                    { value: "Densidade", label: "Densidade" },
                    { value: "Descontinuidade / Subistituição de tratamento", label: "Descontinuidade / Subistituição de tratamento" },
                    { value: "Devolvido ao remetente", label: "Devolvido ao remetente" },
                    { value: "Diveregencia de Produto", label: "Diveregencia de Produto" },
                    { value: "Dosador com defeito", label: "Dosador com defeito" },
                    { value: "Duplicidade", label: "Duplicidade" },
                    { value: "Efeito adverso", label: "Efeito adverso" },
                    { value: "Embalagem violada", label: "Embalagem violada" },
                    { value: "Extraviado", label: "Extraviado" },
                    { value: "Falta de produto", label: "Falta de produto" },
                    { value: "Fora de prazo de validade", label: "Fora de prazo de validade" },
                    { value: "Fornecedor", label: "Fornecedor" },
                    { value: "Furto", label: "Furto" },
                    { value: "Inversão", label: "Inversão" },
                    { value: "Oil/tincture", label: "Oil/tincture" },
                    { value: "Pedido Parcial", label: "Pedido Parcial" },
                    { value: "Qualidade do porduto", label: "Qualidade do porduto" },
                    { value: "Quantidade", label: "Quantidade" },
                    { value: "Lacre rompido/Sem lacre padrão", label: "Lacre rompido/Sem lacre padrão" },
                    { value: "Reclamação", label: "Reclamação" },
                    { value: "Rembolso", label: "Rembolso" },
                    { value: "Sabor", label: "Sabor" },
                    { value: "Sem lacre", label: "Sem lacre" },
                    { value: "Sobra de produto", label: "Sobra de produto" },
                    { value: "Solicitação devolução", label: "Solicitação devolução" },
                    { value: "Vazando", label: "Vazando" },
                    { value: "Eventos Climáticos", label: "Eventos Climáticos" },
                    { value: "Vazio", label: "Vazio" },
                    { value: "Outros", label: "Outros" },
                  ]}
                  placeholder="Selecione o motivo da ocorrência"
                />
                <Textarea
                  label="Observação"
                  value={observacaoMotivo}
                  onChange={(e) => setObservacaoMotivo(e.target.value)}
                  placeholder="Digite suas observações sobre o motivo da ocorrência"
                  rows={4}
                />
              </div>
            </div>

            {/* Seção: Dados do Novo Médico Prescritor */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Dados do Novo Médico Prescritor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Nome do Médico"
                  type="text"
                  value={nomeMedico}
                  onChange={(e) => setNomeMedico(e.target.value)}
                  placeholder="Nome completo do médico"
                  icon={<MdPerson className="text-xl" />}
                />
                <Input
                  label="CRM do Médico"
                  type="number"
                  value={crmMedico}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "");
                    setCrmMedico(valor);
                  }}
                  placeholder="Número do CRM"
                />
                <Select
                  label="UF do CRM"
                  value={ufCrm}
                  onChange={(e) => setUfCrm(e.target.value)}
                  options={estadosBrasileiros}
                  placeholder="Selecione o estado"
                />
                <Input
                  label="Celular do Médico"
                  type="text"
                  value={celularMedico}
                  onChange={(e) => handleTelefoneChange(e, setCelularMedico)}
                  placeholder="(00) 00000-0000"
                  icon={<MdPhone className="text-xl" />}
                  maxLength={15}
                />
                <Input
                  label="E-mail do Médico"
                  type="email"
                  value={emailMedico}
                  onChange={(e) => setEmailMedico(e.target.value)}
                  placeholder="email@exemplo.com"
                  icon={<MdEmail className="text-xl" />}
                />
              </div>
            </div>

            {/* Seção: Produto */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Produto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  {produto.nome && produto.produtoId ? (
                    // Componente visual do produto selecionado (chip/pill)
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-tegra-blue rounded-full">
                      <span className="text-tegra-blue-dark font-bold text-sm">
                        {produto.nome}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          atualizarProdutoCompleto("", "");
                        }}
                        className="text-tegra-blue-dark hover:text-tegra-error transition-colors flex items-center justify-center"
                        aria-label="Remover produto"
                      >
                        <MdClose className="text-lg font-bold" />
                      </button>
                    </div>
                  ) : (
                    // Select aparece apenas quando não há produto selecionado
                    <Select
                      label="Nome do Produto"
                      value={produto.nome}
                      onChange={(e) => {
                        const valor = e.target.value;
                        const opcaoSelecionada = e.selectedOption;

                        // Busca o produto completo no array produtosZoho
                        let produtoId = null;

                        if (opcaoSelecionada && opcaoSelecionada.id) {
                          produtoId = opcaoSelecionada.id;
                        } else if (valor) {
                          // Fallback: busca pelo nome se não tiver ID na opção
                          const produtoSelecionado = produtosZoho.find(
                            (pz) => pz.nome === valor,
                          );
                          if (produtoSelecionado && produtoSelecionado.id) {
                            produtoId = produtoSelecionado.id;
                          }
                        }

                        // Atualiza produto com nome, ID e preço
                        if (valor && produtoId) {
                          atualizarProdutoCompleto(valor, produtoId);
                        } else if (!valor) {
                          // Se não tem valor, limpa tudo
                          atualizarProdutoCompleto("", "");
                        }
                      }}
                      options={produtosZoho.map((produtoZoho) => {
                        const nomeProduto = produtoZoho.nome || "";
                        return {
                          id: produtoZoho.id,
                          value: nomeProduto,
                          label: nomeProduto,
                          nome: nomeProduto,
                        };
                      })}
                      placeholder="Selecione um produto"
                      disabled={carregandoProdutos}
                      loading={carregandoProdutos}
                    />
                  )}
                </div>
                <Input
                  label="Quantidade"
                  type="number"
                  value={produto.quantidade}
                  onChange={(e) => atualizarQuantidade(e.target.value)}
                  placeholder="1"
                  min="1"
                />
                <Input
                  label="Preço"
                  type="text"
                  value={produto.preco}
                  readOnly
                  placeholder="Preço será preenchido automaticamente"
                  className="bg-tegra-gray-light cursor-not-allowed"
                />
              </div>
            </div>

            {/* Seção: Registro do Pedido */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Registro do Pedido
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Número do pedido"
                  type="text"
                  value={numeroPedido}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "");
                    setNumeroPedido(valor);
                  }}
                  placeholder="Número do pedido"
                />
                <Input
                  label="AWB"
                  type="text"
                  value={awb}
                  onChange={(e) => setAwb(e.target.value)}
                  placeholder="AWB"
                />
                <Input
                  label="Data do Pedido"
                  type="date"
                  value={dataPedido}
                  onChange={(e) => setDataPedido(e.target.value)}
                  icon={<MdCalendarToday className="text-xl" />}
                />
                <Input
                  label="Número do Lote"
                  type="text"
                  value={numeroLote}
                  onChange={(e) => setNumeroLote(e.target.value)}
                  placeholder="Número do lote"
                />
                <Input
                  label="Data de Validade"
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  icon={<MdCalendarToday className="text-xl" />}
                />
              </div>
            </div>

            {/* Seção: Upload de arquivos */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                <span className="font-bold text-tegra-blue-dark">
                  Upload de arquivos
                </span>
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {/* Campo de upload */}
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    disabled={arquivos.length >= 5}
                    onChange={(e) => {
                      const novosArquivos = Array.from(e.target.files);
                      const totalArquivos = arquivos.length + novosArquivos.length;
                      
                      if (totalArquivos > 5) {
                        showToast(
                          "⚠️ Máximo de 5 arquivos permitidos",
                          "warning"
                        );
                        return;
                      }
                      
                      setArquivos([...arquivos, ...novosArquivos]);
                      // Limpa o input para permitir selecionar o mesmo arquivo novamente
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex items-center justify-between px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      arquivos.length >= 5
                        ? "bg-tegra-gray-light border-tegra-gray-medium cursor-not-allowed opacity-60"
                        : "bg-blue-50 border-tegra-blue hover:bg-blue-100"
                    }`}
                  >
                    <span className="text-tegra-blue-dark font-medium">
                      Escolher ficheiro(s)
                    </span>
                    <MdCloudUpload className="text-tegra-blue-dark text-xl" />
                  </label>
                </div>

                {/* Texto de dica */}
                <p className="text-sm text-tegra-text-secondary">
                  (Receita / Doc ID Paciente( CPF/RG) / Comprovante Endereço /
                  Autorização Anvisa / Doc ID RL) (Máximo 5 arquivos)
                </p>

                {/* Lista de arquivos selecionados */}
                {arquivos.length > 0 && (
                  <div className="space-y-2">
                    {arquivos.map((arquivo, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-tegra-gray-light rounded border border-tegra-gray-medium"
                      >
                        <span className="text-sm text-tegra-text-primary truncate flex-1">
                          {arquivo.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setArquivos(arquivos.filter((_, i) => i !== index));
                          }}
                          className="ml-2 text-tegra-error hover:text-tegra-error-dark transition-colors"
                          aria-label="Remover arquivo"
                        >
                          <MdClose className="text-lg" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={limparFormulario}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={false}
                className="w-full sm:w-auto"
              >
                Salvar Ocorrência
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </>
  );
}
