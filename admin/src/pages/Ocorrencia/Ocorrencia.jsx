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
import {
  ROUTES,
  getNomeUsuario,
  podeIgnorarCamposObrigatorios,
} from "../../utils/constants";
import api from "../../services/api";
import { productsService } from "../../services/products";
import { ocorrenciaService } from "../../services/ocorrencia";
import { salesOrderService } from "../../services/salesOrder";
import { salvarFormularioTemporariamente, marcarFormularioComoEnviado } from "../../services/savedForms";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { isValidCPF, formatarCpf } from "../../utils/cpfValidator";
import { formatBrazilPhone } from "../../utils/phone";
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
  const [showReview, setShowReview] = useState(false);

  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const DRAFT_KEY = "zoho_draft_ocorrencia";
  const ignorarCamposObrigatorios = podeIgnorarCamposObrigatorios(authService.getUser());

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

  // Estado para lista de produtos (múltiplos produtos)
  const [produtos, setProdutos] = useState([
    { id: 1, nome: "", produtoId: "", quantidade: "1", preco: "" },
  ]);

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
    if (localStorage.getItem(DRAFT_KEY)) setShowDraftBanner(true);
    if (sessionStorage.getItem("auto_restaurar_rascunho") === "true") {
      sessionStorage.removeItem("auto_restaurar_rascunho");
      handleRestaurarRascunho();
    }
  }, []);

  // Estado para busca de número do pedido
  const [numeroPedidoBusca, setNumeroPedidoBusca] = useState("");
  const [pedidosEncontrados, setPedidosEncontrados] = useState([]);
  const [buscandoPedido, setBuscandoPedido] = useState(false);

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

  // Função para buscar pedido pelo número
  const handleBuscarPedido = async () => {
    if (!numeroPedidoBusca.trim()) {
      showToast("⚠️ Digite um número de pedido válido", "warning");
      return;
    }

    setBuscandoPedido(true);
    try {
      const response = await salesOrderService.getSalesOrderByNumber(
        numeroPedidoBusca
      );
      if (response.success && response.data.length > 0) {
        setPedidosEncontrados(response.data);
      } else {
        showToast("❌ Pedido não encontrado", "error");
      }
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      showToast("❌ Erro ao buscar pedido. Tente novamente.", "error");
    } finally {
      setBuscandoPedido(false);
    }
  };

  // Função para preencher formulário com dados do pedido selecionado
  const preencherFormularioComPedido = (pedido) => {
    // Nome e sobrenome vêm do módulo Contacts (First_Name / Last_Name)
    setNomePaciente(pedido.First_Name || "");
    setSobrenomePaciente(pedido.Last_Name || "");
    setCpfPaciente(pedido.CPF || "");
    setCelularPaciente(pedido.Celular || "");
    setEmailPaciente(pedido.E_mail || "");
    setNumeroPedido(pedido.N_mero_Pedido || "");
    setAwb(pedido.AWB || "");
    setDataPedido(pedido.Data || "");

    // Produtos vêm do subform Ordered_Items do Sales_Orders
    // Product_Name no Zoho é um lookup para o módulo Products e retorna { id, name }
    const itensPedido = (pedido.Ordered_Items || []).map((item, index) => {
      const productRef = item.Product_Name || {};

      // Tenta extrair o id e o nome diretamente do lookup
      const produtoIdZoho =
        typeof productRef === "object" && productRef !== null
          ? productRef.id || ""
          : "";

      const nomeProdutoZoho =
        typeof productRef === "object" && productRef !== null
          ? productRef.name ||
            productRef.nome ||
            productRef.Product_Name ||
            ""
          : String(productRef || "");

      // Tenta encontrar o produto nas opções já carregadas do Zoho pelo id
      const produtoCatalogo =
        produtosZoho.find((p) => p.id === produtoIdZoho) || null;

      const nomeFinal = produtoCatalogo?.nome || nomeProdutoZoho || "";
      const produtoIdFinal = produtoCatalogo?.id || produtoIdZoho || "";

      return {
        id: index + 1,
        nome: nomeFinal,
        produtoId: produtoIdFinal,
        quantidade: String(item.Quantity || "1"),
        preco: item.Preco || "",
      };
    });

    setProdutos(
      itensPedido.length > 0
        ? itensPedido
        : [{ id: 1, nome: "", produtoId: "", quantidade: "1", preco: "" }]
    );
    setPedidosEncontrados([]); // Limpa resultados da busca
  };

  // Função para adicionar um novo produto
  const adicionarProduto = () => {
    const novoId =
      produtos.length > 0 ? Math.max(...produtos.map((p) => p.id || 0)) + 1 : 1;
    setProdutos([
      ...produtos,
      { id: novoId, nome: "", produtoId: "", quantidade: "1", preco: "" },
    ]);
  };

  // Função para atualizar um produto na lista
  const atualizarProduto = (id, campo, valor) => {
    if (campo === "quantidade") {
      const valorLimpo = valor.replace(/\D/g, "");

      if (valorLimpo === "") {
        setProdutos(
          produtos.map((produto) =>
            produto.id === id ? { ...produto, [campo]: "" } : produto
          )
        );
        return;
      }

      const numValor = parseInt(valorLimpo);
      valor = numValor < 1 ? "1" : valorLimpo;
    }

    setProdutos(
      produtos.map((produto) =>
        produto.id === id ? { ...produto, [campo]: valor } : produto
      )
    );
  };

  const atualizarProdutoCompleto = (id, nome, produtoId) => {
    setProdutos(
      produtos.map((produto) =>
        produto.id === id ? { ...produto, nome, produtoId } : produto
      )
    );
  };

  // Função para remover um produto da lista
  const removerProduto = (id) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((produto) => produto.id !== id));
    }
  };

  // Função para formatar CEP
  const formatarCep = (valor) => {
    const cep = valor.replace(/\D/g, "");
    return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  // Função para buscar CEP na API contratada (via backend)
  const handleBuscarCep = async (e) => {
    e.preventDefault();
    const cepLimpo = buscarCep.replace(/\D/g, "");

    if (!cepLimpo || cepLimpo.length !== 8) {
      showToast("⚠️ Digite um CEP válido com 8 dígitos", "warning");
      return;
    }

    setBuscandoCep(true);
    try {
      // Busca CEP via backend
      const response = await api.get(`/v1/cep/${cepLimpo}`);
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

  // Função para formatar RG
  const formatarRg = (valor) => {
    const rg = valor
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "")
      .slice(0, 9);

    if (rg.length <= 2) return rg;
    if (rg.length <= 5) return `${rg.slice(0, 2)}.${rg.slice(2)}`;
    if (rg.length <= 8) return `${rg.slice(0, 2)}.${rg.slice(2, 5)}.${rg.slice(5)}`;
    return `${rg.slice(0, 2)}.${rg.slice(2, 5)}.${rg.slice(5, 8)}-${rg.slice(8)}`;
  };

  // Estados de validação de CPF
  const [cpfPacienteError, setCpfPacienteError] = useState("");

  // Handler para CPF com formatação e validação
  const handleCpfChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    if (valor.length <= 11) {
      setCpfPaciente(formatarCpf(valor));
      // Mostra erro apenas se CPF tem 11 dígitos e é inválido
      if (valor.length === 11 && !isValidCPF(valor)) {
        setCpfPacienteError("CPF inválido");
        showToast("⚠️ CPF inválido. Verifique os dígitos verificadores", "warning");
      } else {
        setCpfPacienteError("");
      }
    }
  };

  // Handler para telefone/celular com formatação
  const handleTelefoneChange = (e, setter) => {
    setter(formatBrazilPhone(e.target.value));
  };

  // Função para limpar todos os campos do formulário
  const limparFormulario = () => {
    localStorage.removeItem(DRAFT_KEY);
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
    setProdutos([
      { id: 1, nome: "", produtoId: "", quantidade: "1", preco: "" },
    ]);
  };

  const handleSalvarTemporariamente = () => {
    try {
      const draft = {
        nomePaciente, sobrenomePaciente, cpfPaciente, rgPaciente, celularPaciente,
        emailPaciente, dataNascimento, telefonePaciente,
        temRepresentanteLegal, nomeRepresentante, rgRepresentante, cpfRepresentante,
        emailRepresentante, celularRepresentante, dataNascimentoRepresentante,
        temNovoMedicoPrescritor, nomeMedico, crmMedico, ufCrm, celularMedico, emailMedico, especialidadeMedico,
        motivoOcorrencia, observacaoMotivo, observacao,
        numeroPedido, awb, dataPedido, numeroLote, dataValidade,
        produtos, documentosCompletos,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      salvarFormularioTemporariamente({
        tipo: "ocorrencia",
        titulo: `Ocorrência - ${nomePaciente || "Sem paciente"}`,
        paciente: nomePaciente,
        cpf: cpfPaciente,
        resumo: `Paciente: ${nomePaciente}, Motivo: ${motivoOcorrencia || "Não especificado"}`,
        dados: draft,
        rota: "/ocorrencia",
      });
      showToast("💾 Formulário salvo temporariamente!", "success");
    } catch {
      showToast("❌ Erro ao salvar rascunho.", "error");
    }
  };

  const handleRestaurarRascunho = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.nomePaciente !== undefined) setNomePaciente(d.nomePaciente);
      if (d.sobrenomePaciente !== undefined) setSobrenomePaciente(d.sobrenomePaciente);
      if (d.cpfPaciente !== undefined) setCpfPaciente(d.cpfPaciente);
      if (d.rgPaciente !== undefined) setRgPaciente(d.rgPaciente);
      if (d.celularPaciente !== undefined) setCelularPaciente(d.celularPaciente);
      if (d.emailPaciente !== undefined) setEmailPaciente(d.emailPaciente);
      if (d.dataNascimento !== undefined) setDataNascimento(d.dataNascimento);
      if (d.telefonePaciente !== undefined) setTelefonePaciente(d.telefonePaciente);
      if (d.temRepresentanteLegal !== undefined) setTemRepresentanteLegal(d.temRepresentanteLegal);
      if (d.nomeRepresentante !== undefined) setNomeRepresentante(d.nomeRepresentante);
      if (d.rgRepresentante !== undefined) setRgRepresentante(d.rgRepresentante);
      if (d.cpfRepresentante !== undefined) setCpfRepresentante(d.cpfRepresentante);
      if (d.emailRepresentante !== undefined) setEmailRepresentante(d.emailRepresentante);
      if (d.celularRepresentante !== undefined) setCelularRepresentante(d.celularRepresentante);
      if (d.dataNascimentoRepresentante !== undefined) setDataNascimentoRepresentante(d.dataNascimentoRepresentante);
      if (d.temNovoMedicoPrescritor !== undefined) setTemNovoMedicoPrescritor(d.temNovoMedicoPrescritor);
      if (d.nomeMedico !== undefined) setNomeMedico(d.nomeMedico);
      if (d.crmMedico !== undefined) setCrmMedico(d.crmMedico);
      if (d.ufCrm !== undefined) setUfCrm(d.ufCrm);
      if (d.celularMedico !== undefined) setCelularMedico(d.celularMedico);
      if (d.emailMedico !== undefined) setEmailMedico(d.emailMedico);
      if (d.especialidadeMedico !== undefined) setEspecialidadeMedico(d.especialidadeMedico);
      if (d.motivoOcorrencia !== undefined) setMotivoOcorrencia(d.motivoOcorrencia);
      if (d.observacaoMotivo !== undefined) setObservacaoMotivo(d.observacaoMotivo);
      if (d.observacao !== undefined) setObservacao(d.observacao);
      if (d.numeroPedido !== undefined) setNumeroPedido(d.numeroPedido);
      if (d.awb !== undefined) setAwb(d.awb);
      if (d.dataPedido !== undefined) setDataPedido(d.dataPedido);
      if (d.numeroLote !== undefined) setNumeroLote(d.numeroLote);
      if (d.dataValidade !== undefined) setDataValidade(d.dataValidade);
      if (d.produtos !== undefined) setProdutos(d.produtos);
      if (d.documentosCompletos !== undefined) setDocumentosCompletos(d.documentosCompletos);
      setShowDraftBanner(false);
      showToast("✅ Rascunho restaurado!", "success");
    } catch {
      showToast("❌ Erro ao restaurar rascunho.", "error");
    }
  };

  const handleDescartarRascunho = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
    showToast("🗑️ Rascunho descartado.", "success");
  };

  // Função para validar campos obrigatórios
  const validarCamposObrigatorios = () => {
    const camposVazios = [];

    if (!motivoOcorrencia.trim()) camposVazios.push("Motivo da Ocorrência");
    if (!observacaoMotivo.trim()) camposVazios.push("Observação");

    if (!ignorarCamposObrigatorios) {
      // Valida campos do paciente (apenas os obrigatórios)
      if (!nomePaciente.trim()) camposVazios.push("Nome");
      if (!sobrenomePaciente.trim()) camposVazios.push("Sobrenome");
      if (!cpfPaciente.trim()) camposVazios.push("CPF");
      if (!celularPaciente.trim()) camposVazios.push("Celular");
      if (!emailPaciente.trim()) camposVazios.push("E-mail");

      // Valida produtos
      if (produtos.length === 0) {
        camposVazios.push("Produtos");
      }
    }

    // Valida quantidade dos produtos
    produtos.forEach((produto, index) => {
      const quantidade = parseInt(produto.quantidade) || 0;
      if (quantidade <= 0) {
        showToast(
          `❌ A quantidade do produto na posição ${
            index + 1
          } não pode ser igual ou menor que 0`,
          "error"
        );
        return { valido: false, camposVazios: [] };
      }
    });

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
              })
            )
          : [];

      const nomeConsultor = getNomeUsuario(authService.getUser());

      // Prepara os dados da ocorrência
      const dadosOcorrencia = {
        nomePaciente,
        sobrenomePaciente,
        cpfPaciente,
        celularPaciente,
        emailPaciente,
        nomeConsultor,
        motivoOcorrencia,
        observacaoMotivo,
        nomeMedico,
        emailMedico,
        ufCrm,
        celularMedico,
        crmMedico,
        produtos: produtos.map((produto) => ({
          Nome_do_Produto: produto.nome,
          Quantidade: produto.quantidade,
        })),
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

        // Inclui todos os campos enviados no formulário (exceto uploads)
        const dadosSemArquivos = { ...dadosOcorrencia };
        delete dadosSemArquivos.arquivos;

        await marcarFormularioComoEnviado({
          tipo: "ocorrencia",
          protocolo: response.protocolo,
          zohoRecordId: response.data?.id || null,
          titulo: `Ocorrência - ${nomePaciente || "Sem paciente"}`,
          paciente: nomePaciente || "",
          cpf: cpfPaciente || "",
          resumo: `Motivo: ${motivoOcorrencia || "-"}, Produtos: ${produtos.length}`,
          dados: dadosSemArquivos,
        });

        const dadosComprovante = {
          ...dadosSemArquivos,
          protocolo: response.protocolo,
          tipoSolicitacao: "Ocorrência",
          consultorTegra: nomeConsultor,
          assunto: motivoOcorrencia,
          produtos: produtos.map((produto) => ({
            nome: produto.nome,
            quantidade: produto.quantidade || 1,
            valor: produto.preco || 0,
          })),
          observacoes: observacao || observacaoMotivo,
          dataCriacao,
          totalCompra: produtos.reduce(
            (total, produto) =>
              total +
              (parseFloat(produto?.preco) * parseInt(produto?.quantidade) || 0),
            0
          ),
        };

        // Oculta splash screen antes de navegar
        setShowSplash(false);

        const agradecimentoState = {
          tipoSolicitacao: "Ocorrência",
          nomePaciente,
          sobrenomePaciente,
          dataCriacao,
          origem: "ocorrencia",
          dadosComprovante,
        };

        // Persiste o payload para funcionar mesmo com recarga completa da rota.
        sessionStorage.setItem(
          "agradecimentoState",
          JSON.stringify(agradecimentoState),
        );

        // Força reload para garantir versão mais recente da tela imediatamente após salvar.
        window.location.href = `${ROUTES.AGRADECIMENTO}?t=${Date.now()}`;
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
            backgroundImage: "url(/painel_consultor_ocorrencia.png)",
            backgroundSize: "cover",
            backgroundPosition: "40% center",
            backgroundRepeat: "no-repeat",
            filter: "blur(3px)",
          }}
        />
        <div
          className="fixed inset-0 z-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.8) 50%, rgba(255, 255, 255, 0.85) 100%)",
          }}
        />
        {buscandoPedido && (
          <div className="cpf-loading-overlay" aria-live="polite">
            <div className="cpf-loading-glass" role="status">
              <div className="cpf-loading-spinner" />
              <p className="cpf-loading-text">Buscando dados do pedido...</p>
            </div>
          </div>
        )}
        <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary mb-4 sm:mb-6">
            Nova Ocorrência
          </h1>
          <p className="text-xs sm:text-sm text-tegra-text-secondary mb-3 sm:mb-4">
            <span className="text-tegra-error font-semibold">*</span> indica campo obrigatório.
          </p>

          {/* Banner de rascunho salvo */}
          {showDraftBanner && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-tegra-bg-accent border border-tegra-blue-light rounded-lg px-4 py-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-tegra-blue-dark">💾 Você tem um rascunho salvo para este formulário.</p>
                <p className="text-xs text-tegra-text-secondary">Deseja restaurar os dados preenchidos anteriormente?</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={handleRestaurarRascunho} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-tegra-blue text-white hover:bg-tegra-blue-dark transition-colors">Restaurar</button>
                <button type="button" onClick={handleDescartarRascunho} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-tegra-gray-medium text-tegra-text-primary hover:bg-tegra-gray-dark transition-colors">Descartar</button>
              </div>
            </div>
          )}

          <form
            className="space-y-4 sm:space-y-6 md:space-y-8"
            onSubmit={handleSubmit}
          >
            {/* Seção: Buscar Pedido */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Buscar Pedido
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <Input
                    label="Número do Pedido"
                    type="text"
                    value={numeroPedidoBusca}
                    onChange={(e) => setNumeroPedidoBusca(e.target.value)}
                    placeholder="Digite o número do pedido"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleBuscarPedido}
                    loading={buscandoPedido}
                    className="w-full sm:w-auto py-2 sm:py-2.5"
                  >
                    Buscar
                  </Button>
                </div>
              </div>
              {pedidosEncontrados.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-tegra-text-primary mb-2">
                    Resultados da Busca
                  </h3>
                  <ul className="space-y-2">
                    {pedidosEncontrados.map((pedido, index) => (
                      <li
                        key={index}
                        className="p-2 bg-tegra-gray-light rounded cursor-pointer hover:bg-tegra-gray-medium"
                        onClick={() => preencherFormularioComPedido(pedido)}
                      >
                        <span className="font-medium">Pedido:</span>{" "}
                        {pedido.N_mero_Pedido} -{" "}
                        <span className="font-medium">Cliente:</span>{" "}
                        {/* Contact_Name vindo do Zoho é um objeto { name, id } */}
                        {pedido.Contact_Name?.name || pedido.Contact_Name?.Nome || pedido.Contact_Name || ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

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
                  required
                  onChange={(e) => setNomePaciente(e.target.value)}
                  placeholder="Nome do paciente"
                  icon={<MdPerson className="text-xl" />}
                />
                <Input
                  label="Sobrenome"
                  type="text"
                  value={sobrenomePaciente}
                  required
                  onChange={(e) => setSobrenomePaciente(e.target.value)}
                  placeholder="Sobrenome do paciente"
                  icon={<MdPerson className="text-xl" />}
                />
                <Input
                  label="CPF"
                  type="text"
                  value={cpfPaciente}
                  required
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  error={cpfPacienteError}
                />
                <Input
                  label="Celular"
                  type="text"
                  value={celularPaciente}
                  required
                  onChange={(e) => handleTelefoneChange(e, setCelularPaciente)}
                  placeholder="+55 (00) 00000-0000"
                  icon={<MdPhone className="text-xl" />}
                  maxLength={20}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={emailPaciente}
                  required
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
                  required
                  onChange={(e) => setMotivoOcorrencia(e.target.value)}
                  options={[
                    { value: "Acareação", label: "Acareação" },
                    { value: "Anvisa", label: "Anvisa" },
                    {
                      value: "Atraso de produção",
                      label: "Atraso de produção",
                    },
                    { value: "Cor", label: "Cor" },
                    { value: "Demora na Entrega", label: "Demora na Entrega" },
                    { value: "Densidade", label: "Densidade" },
                    {
                      value: "Descontinuidade / Subistituição de tratamento",
                      label: "Descontinuidade / Subistituição de tratamento",
                    },
                    {
                      value: "Devolvido ao remetente",
                      label: "Devolvido ao remetente",
                    },
                    {
                      value: "Diveregencia de Produto",
                      label: "Diveregencia de Produto",
                    },
                    {
                      value: "Dosador com defeito",
                      label: "Dosador com defeito",
                    },
                    { value: "Duplicidade", label: "Duplicidade" },
                    { value: "Efeito adverso", label: "Efeito adverso" },
                    { value: "Embalagem violada", label: "Embalagem violada" },
                    { value: "Extraviado", label: "Extraviado" },
                    { value: "Falta de produto", label: "Falta de produto" },
                    {
                      value: "Fora de prazo de validade",
                      label: "Fora de prazo de validade",
                    },
                    { value: "Fornecedor", label: "Fornecedor" },
                    { value: "Furto", label: "Furto" },
                    { value: "Inversão", label: "Inversão" },
                    { value: "Oil/tincture", label: "Oil/tincture" },
                    { value: "Pedido Parcial", label: "Pedido Parcial" },
                    {
                      value: "Qualidade do porduto",
                      label: "Qualidade do porduto",
                    },
                    { value: "Quantidade", label: "Quantidade" },
                    {
                      value: "Lacre rompido/Sem lacre padrão",
                      label: "Lacre rompido/Sem lacre padrão",
                    },
                    { value: "Reclamação", label: "Reclamação" },
                    { value: "Rembolso", label: "Rembolso" },
                    { value: "Sabor", label: "Sabor" },
                    { value: "Sem lacre", label: "Sem lacre" },
                    { value: "Sobra de produto", label: "Sobra de produto" },
                    {
                      value: "Solicitação devolução",
                      label: "Solicitação devolução",
                    },
                    { value: "Vazando", label: "Vazando" },
                    {
                      value: "Eventos Climáticos",
                      label: "Eventos Climáticos",
                    },
                    { value: "Vazio", label: "Vazio" },
                    { value: "Outros", label: "Outros" },
                  ]}
                  placeholder="Selecione o motivo da ocorrência"
                />
                <Textarea
                  label="Observação"
                  value={observacaoMotivo}
                  required
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
                  placeholder="+55 (00) 00000-0000"
                  icon={<MdPhone className="text-xl" />}
                  maxLength={20}
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

            {/* Seção: Produtos */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary">
                  Produtos
                </h2>
                <Button
                  type="button"
                  variant="teal"
                  size="sm"
                  onClick={adicionarProduto}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <MdAdd className="text-lg sm:text-xl" />
                  <span className="text-sm sm:text-base">Adicionar Produto</span>
                </Button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {produtos.map((produto, index) => (
                  <div
                    key={produto.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end border-b border-tegra-gray-medium pb-3 sm:pb-4 last:border-b-0"
                  >
                    <div className="md:col-span-5">
                      {index === 0 && (
                        <label className="block text-sm font-medium text-tegra-text-secondary mb-2">
                          Nome do Produto
                        </label>
                      )}
                      {produto.nome && produto.produtoId ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-tegra-blue rounded-full">
                          <span className="text-tegra-blue-dark font-bold text-sm">
                            {produto.nome}
                          </span>
                          <button
                            type="button"
                            onClick={() => atualizarProdutoCompleto(produto.id, "", "")}
                            className="text-tegra-blue-dark hover:text-tegra-error transition-colors flex items-center justify-center"
                            aria-label="Remover produto"
                          >
                            <MdClose className="text-lg font-bold" />
                          </button>
                        </div>
                      ) : (
                        <Select
                          value={produto.nome}
                          required
                          onChange={(e) => {
                            const valor = e.target.value;
                            const opcaoSelecionada = e.selectedOption;

                            let produtoId = null;

                            if (opcaoSelecionada && opcaoSelecionada.id) {
                              produtoId = opcaoSelecionada.id;
                            } else if (valor) {
                              const produtoSelecionado = produtosZoho.find(
                                (pz) => pz.nome === valor
                              );
                              if (produtoSelecionado && produtoSelecionado.id) {
                                produtoId = produtoSelecionado.id;
                              }
                            }

                            if (valor && produtoId) {
                              atualizarProdutoCompleto(produto.id, valor, produtoId);
                            } else if (!valor) {
                              atualizarProdutoCompleto(produto.id, "", "");
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
                    <div className="md:col-span-3">
                      <Input
                        label={index === 0 ? "Quantidade" : ""}
                        type="number"
                        value={produto.quantidade}
                        onChange={(e) =>
                          atualizarProduto(produto.id, "quantidade", e.target.value)
                        }
                        placeholder="1"
                        min="1"
                      />
                    </div>
                    <div className="md:col-span-4 flex gap-2 items-end">
                      {produtos.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removerProduto(produto.id)}
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <MdDelete className="text-base sm:text-lg" />
                          <span className="text-sm sm:text-base">Remover</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
                    disabled={arquivos.length >= 10}
                    onChange={(e) => {
                      const novosArquivos = Array.from(e.target.files);
                      const totalArquivos =
                        arquivos.length + novosArquivos.length;

                      if (totalArquivos > 10) {
                        showToast(
                          "⚠️ Máximo de 10 arquivos permitidos",
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
                      arquivos.length >= 10
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
                  Anexe evidências da ocorrência (fotos, vídeos ou documentos).
                  Máximo 10 arquivos.
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
                type="button"
                variant="secondary"
                onClick={() => setShowReview(true)}
                className="w-full sm:w-auto"
              >
                Rever formulário
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSalvarTemporariamente}
                className="w-full sm:w-auto"
              >
                Salvar formulario
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={false}
                className="w-full sm:w-auto"
              >
                Enviar
              </Button>
            </div>

          </form>
        </div>
      </MainLayout>

      {showReview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-3">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-tegra-gray-medium">
              <h2 className="text-xl font-bold text-tegra-blue-dark">Revisão do Formulário — Ocorrência</h2>
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="p-1 rounded-full hover:bg-tegra-gray-light text-tegra-text-secondary hover:text-tegra-blue-dark transition-colors"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Dados do Paciente */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Dados do Paciente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Nome completo</p><p className="text-sm font-medium text-tegra-text-primary">{[nomePaciente, sobrenomePaciente].filter(Boolean).join(" ") || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">CPF</p><p className="text-sm font-medium text-tegra-text-primary">{cpfPaciente || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">RG</p><p className="text-sm font-medium text-tegra-text-primary">{rgPaciente || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Celular</p><p className="text-sm font-medium text-tegra-text-primary">{celularPaciente || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">E-mail</p><p className="text-sm font-medium text-tegra-text-primary">{emailPaciente || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Data de Nascimento</p><p className="text-sm font-medium text-tegra-text-primary">{dataNascimento || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Telefone</p><p className="text-sm font-medium text-tegra-text-primary">{telefonePaciente || "—"}</p></div>
                </div>
              </div>

              {/* Motivo da Ocorrência */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Motivo da Ocorrência</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Motivo</p><p className="text-sm font-medium text-tegra-text-primary">{motivoOcorrencia || "—"}</p></div>
                  {observacaoMotivo && (
                    <div className="sm:col-span-2"><p className="text-xs text-tegra-text-secondary">Observação do motivo</p><p className="text-sm font-medium text-tegra-text-primary whitespace-pre-wrap">{observacaoMotivo}</p></div>
                  )}
                </div>
              </div>

              {/* Dados do Novo Médico Prescritor */}
              {(nomeMedico || crmMedico) && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Novo Médico Prescritor</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-tegra-text-secondary">Nome do médico</p><p className="text-sm font-medium text-tegra-text-primary">{nomeMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">CRM</p><p className="text-sm font-medium text-tegra-text-primary">{crmMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">UF do CRM</p><p className="text-sm font-medium text-tegra-text-primary">{ufCrm || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Celular</p><p className="text-sm font-medium text-tegra-text-primary">{celularMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">E-mail</p><p className="text-sm font-medium text-tegra-text-primary">{emailMedico || "—"}</p></div>
                  </div>
                </div>
              )}

              {/* Produtos */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Produtos</h3>
                {produtos.filter(p => p.nome).length === 0 ? (
                  <p className="text-sm text-tegra-text-secondary">Nenhum produto adicionado.</p>
                ) : (
                  <div className="space-y-2">
                    {produtos.filter(p => p.nome).map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-tegra-bg-accent rounded-lg px-4 py-2">
                        <span className="text-sm font-medium text-tegra-text-primary">{p.nome}</span>
                        <span className="text-xs text-tegra-text-secondary">Qtd: {p.quantidade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Registro do Pedido */}
              {(numeroPedido || awb || dataPedido || numeroLote || dataValidade) && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Registro do Pedido</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-tegra-text-secondary">Número do pedido</p><p className="text-sm font-medium text-tegra-text-primary">{numeroPedido || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">AWB</p><p className="text-sm font-medium text-tegra-text-primary">{awb || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Data do pedido</p><p className="text-sm font-medium text-tegra-text-primary">{dataPedido || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Número do lote</p><p className="text-sm font-medium text-tegra-text-primary">{numeroLote || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Data de validade</p><p className="text-sm font-medium text-tegra-text-primary">{dataValidade || "—"}</p></div>
                  </div>
                </div>
              )}

              {/* Observação */}
              {observacao && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Observação</h3>
                  <p className="text-sm text-tegra-text-primary whitespace-pre-wrap">{observacao}</p>
                </div>
              )}

              {/* Arquivos */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Arquivos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Arquivos anexados</p><p className="text-sm font-medium text-tegra-text-primary">{arquivos.length > 0 ? `${arquivos.length} arquivo(s)` : "Nenhum"}</p></div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-tegra-gray-medium">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReview(false)}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
