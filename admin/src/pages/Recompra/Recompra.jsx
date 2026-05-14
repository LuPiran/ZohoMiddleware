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
  getOpcoesParceiro,
  podeIgnorarCamposObrigatorios,
} from "../../utils/constants";
import api from "../../services/api";
import { compraService } from "../../services/compra";
import { productsService } from "../../services/products";
import {
  salvarFormularioTemporariamente,
  marcarFormularioComoEnviado,
  marcarFalhaEnvioFormulario,
} from "../../services/savedForms";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { isValidCPF, formatarCpf } from "../../utils/cpfValidator";
import { formatBrazilPhone, formatBrazilPhoneLocal } from "../../utils/phone";
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
  MdContacts,
  MdCloudUpload,
} from "react-icons/md";

export default function Recompra() {
  const navigate = useNavigate();
  const { setLoading, isLoading } = useLoading();
  const { showToast } = useToast();
  const [showSplash, setShowSplash] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showAddressConfirmModal, setShowAddressConfirmModal] = useState(false);
  const [enderecoSugeridoCliente, setEnderecoSugeridoCliente] = useState(null);
    const [showDraftBanner, setShowDraftBanner] = useState(false);

    const DRAFT_KEY = "zoho_draft_recompra";

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
  const [atualizacaoEnderecoViaPortal, setAtualizacaoEnderecoViaPortal] =
    useState(false);
  const [enderecoPreenchidoViaCep, setEnderecoPreenchidoViaCep] =
    useState(false);
  const [enderecoBaseViaCep, setEnderecoBaseViaCep] = useState(null);

  // Estado para busca de CEP
  const [buscarCep, setBuscarCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const enderecoAguardandoConfirmacao =
    enderecoPreenchidoViaCep && !atualizacaoEnderecoViaPortal;
  const estiloCampoEndereco = enderecoAguardandoConfirmacao
      ? "border-2 border-tegra-blue-light bg-tegra-bg-accent text-tegra-blue-dark"
      : "";

  const marcarAtualizacaoEnderecoSeNecessario = () => {
    if (!atualizacaoEnderecoViaPortal) {
      setAtualizacaoEnderecoViaPortal(true);
    }
  };

  const handleEnderecoChange = (setter) => (e) => {
    setter(e.target.value);
    marcarAtualizacaoEnderecoSeNecessario();
  };

  const handleCepEnderecoChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    if (valor.length <= 8) {
      setCep(formatarCep(valor));
      marcarAtualizacaoEnderecoSeNecessario();
    }
  };

  useEffect(() => {
    if (
      !enderecoPreenchidoViaCep ||
      !enderecoBaseViaCep ||
      atualizacaoEnderecoViaPortal
    ) {
      return;
    }

    const houveAlteracaoManual =
      (rua || "") !== (enderecoBaseViaCep.rua || "") ||
      (bairro || "") !== (enderecoBaseViaCep.bairro || "") ||
      (cidade || "") !== (enderecoBaseViaCep.cidade || "") ||
      (estado || "") !== (enderecoBaseViaCep.estado || "") ||
      (pais || "") !== (enderecoBaseViaCep.pais || "") ||
      (cep || "") !== (enderecoBaseViaCep.cep || "");

    if (houveAlteracaoManual) {
      setAtualizacaoEnderecoViaPortal(true);
    }
  }, [
    rua,
    bairro,
    cidade,
    estado,
    pais,
    cep,
    enderecoPreenchidoViaCep,
    enderecoBaseViaCep,
    atualizacaoEnderecoViaPortal,
  ]);

  // Estado para negociação feita pelo consultor
  const [negociacaoFeitaPeloConsultor, setNegociacaoFeitaPeloConsultor] =
    useState(false);
  const [solicitarLinkPagamento, setSolicitarLinkPagamento] = useState("");
  const [tipoLink, setTipoLink] = useState("");

  // Estado para campanha diretoria
  const [campanhaDiretoria, setCampanhaDiretoria] = useState(false);

  // Estado para busca de cliente
  const [cpfBusca, setCpfBusca] = useState("");
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState([]);

  // Estado para produtos
  const [produtos, setProdutos] = useState([
    { id: 1, nome: "", produtoId: "", quantidade: "1" },
  ]);

  // Estado para produtos do Zoho (opções do select)
  const [produtosZoho, setProdutosZoho] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  // Estado para tipo de solicitação (fixo como "Recompra" nesta página)
  const [tipoSolicitacao, setTipoSolicitacao] = useState("Recompra");

  // Estados para forma de pagamento
  const [formaPagamento, setFormaPagamento] = useState("");
  const [termosCondicoesPagamento, setTermosCondicoesPagamento] = useState("");

  // Estado para observação
  const [observacao, setObservacao] = useState("");

  // Estado para parceiro (visível apenas para Marcelli Silva e Diego Betti)
  const [realizarProcessoComParceiro, setRealizarProcessoComParceiro] =
    useState(false);
  const [parceiroSelecionado, setParceiroSelecionado] = useState("");
  const usuarioLogado = authService.getUser();
  const opcoesParceiro = getOpcoesParceiro(usuarioLogado);
  const exibirSecaoParceiro = opcoesParceiro.length > 0;
  const ignorarCamposObrigatorios = podeIgnorarCamposObrigatorios(usuarioLogado);
  const consultorEndereco =
    (realizarProcessoComParceiro && parceiroSelecionado) ||
    getNomeUsuario(usuarioLogado) ||
    "Consultor não identificado";

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

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Carrega produtos do Zoho ao montar o componente
    const carregarProdutos = async () => {
      setCarregandoProdutos(true);
      try {
        const response = await productsService.getProducts();
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

  useEffect(() => {
    if (!exibirSecaoParceiro) {
      if (realizarProcessoComParceiro) setRealizarProcessoComParceiro(false);
      if (parceiroSelecionado) setParceiroSelecionado("");
      return;
    }

    const opcaoValida = opcoesParceiro.some(
      (opcao) => opcao.value === parceiroSelecionado
    );

    if (!opcaoValida) {
      setParceiroSelecionado(opcoesParceiro[0].value);
      if (!realizarProcessoComParceiro) {
        setRealizarProcessoComParceiro(true);
      }
    }
  }, [
    exibirSecaoParceiro,
    opcoesParceiro,
    parceiroSelecionado,
    realizarProcessoComParceiro,
  ]);

  // Função para adicionar novo produto
  const adicionarProduto = () => {
    const novoId =
      produtos.length > 0 ? Math.max(...produtos.map((p) => p.id)) + 1 : 1;
    setProdutos([
      ...produtos,
      { id: novoId, nome: "", produtoId: "", quantidade: "1" },
    ]);
  };

  // Função para remover produto
  const removerProduto = (id) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((produto) => produto.id !== id));
    }
  };

  // Função para atualizar produto
  const atualizarProduto = (id, campo, valor) => {
    // Se for quantidade, valida que não pode ser menor que 1
    if (campo === "quantidade") {
      // Remove caracteres não numéricos
      const valorLimpo = valor.replace(/\D/g, "");

      // Se estiver vazio, mantém como está (permite digitação)
      if (valorLimpo === "") {
        setProdutos(
          produtos.map((produto) =>
            produto.id === id ? { ...produto, [campo]: "" } : produto,
          ),
        );
        return;
      }

      const numValor = parseInt(valorLimpo);

      // Se for menor que 1, força para 1
      if (numValor < 1) {
        valor = "1";
      } else {
        valor = valorLimpo;
      }
    }

    setProdutos(
      produtos.map((produto) =>
        produto.id === id ? { ...produto, [campo]: valor } : produto,
      ),
    );
  };

  // Função para atualizar produto completo (nome e ID)
  const atualizarProdutoCompleto = (id, nome, produtoId) => {
    setProdutos(
      produtos.map((produto) =>
        produto.id === id ? { ...produto, nome, produtoId } : produto,
      ),
    );
  };

  const normalizarDataParaInput = (data) => {
    if (!data || typeof data !== "string") return "";

    if (data.includes("/")) {
      const partes = data.split("/");
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    }

    if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return data;
    }

    return "";
  };

  const extrairDadosRepresentanteLegal = (cliente) => {
    const pickFirst = (...keys) => {
      for (const key of keys) {
        const value = cliente?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
      return "";
    };

    const parseBooleanLike = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return ["true", "sim", "yes", "1"].includes(normalized);
      }
      return false;
    };

    const flagRepresentante = pickFirst(
      "Representante_legal",
      "Representante_Legal",
      "Tem_representante_legal",
      "temRepresentanteLegal",
    );

    const nome = pickFirst(
      "Nome_do_representante_legal",
      "Nome_do_Representante_Legal",
      "Nome_representante_legal",
      "Nome_Representante_Legal",
      "Nome_Representante",
      "nomeRepresentante",
    );

    const rg = pickFirst(
      "RG_do_representante_legal",
      "RG_do_Representante_Legal",
      "RG_Representante_Legal",
      "rgRepresentante",
    );

    const cpf = pickFirst(
      "CPF_do_representante_legal",
      "CPF_do_Representante_Legal",
      "CPF_Representante_Legal",
      "cpfRepresentante",
    );

    const email = pickFirst(
      "Email_do_representante_legal",
      "Email_do_Representante_Legal",
      "E_mail_do_representante_legal",
      "E_mail_do_Representante_Legal",
      "Email_Representante_Legal",
      "emailRepresentante",
    );

    const celular = pickFirst(
      "Celular_Representante_Legal",
      "Celular_do_representante_legal",
      "Celular_do_Representante_Legal",
      "celularRepresentante",
    );

    const dataNascimento = pickFirst(
      "Data_de_nascimento_do_representante_legal",
      "Data_de_Nascimento_do_Representante_Legal",
      "Nascimento_representante_legal",
      "dataNascimentoRepresentante",
    );

    const temDadosRepresentante =
      parseBooleanLike(flagRepresentante) ||
      Boolean(nome || rg || cpf || email || celular || dataNascimento);

    return {
      temDadosRepresentante,
      nome: String(nome || ""),
      rg: String(rg || ""),
      cpf: String(cpf || ""),
      email: String(email || ""),
      celular: String(celular || ""),
      dataNascimento: String(dataNascimento || ""),
    };
  };

  // Função para buscar cliente por CPF
  const handleBuscarCliente = async (e) => {
    e.preventDefault();
    setClientesEncontrados([]);

    try {
      setBuscandoCliente(true);

      const cpfLimpo = cpfBusca.replace(/\D/g, "");

      if (!cpfLimpo || cpfLimpo.length !== 11) {
        showToast("⚠️ Digite um CPF válido com 11 dígitos", "warning");
        return;
      }

      const response = await compraService.buscarClientePorCpf(cpfBusca);

      if (response.success && response.data) {
        const cliente = response.data;
        if (!cliente.CPF && cpfLimpo) {
          cliente.CPF = cpfLimpo;
        }
        setClientesEncontrados([cliente]);
      } else {
        showToast("❌ Cliente não encontrado", "error");
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      showToast("❌ Erro ao buscar cliente. Tente novamente.", "error");
    } finally {
      setBuscandoCliente(false);
    }
  };

  // Função para selecionar cliente e preencher formulário
  const handleSelecionarCliente = (cliente) => {
    // Mapeia os campos do Contacts para o formulário
    setNomePaciente(cliente.First_Name || "");
    setSobrenomePaciente(cliente.Last_Name || "");
    setCpfPaciente(formatarCpf(cliente.CPF || ""));
    setRgPaciente(cliente.RG || "");
    setCelularPaciente(cliente.Mobile ? formatBrazilPhone(cliente.Mobile) : "");
    setEmailPaciente(cliente.Email || "");

    // Formata data de nascimento
    setDataNascimento(normalizarDataParaInput(cliente.Date_of_Birth));

    setTelefonePaciente(cliente.Phone ? formatBrazilPhoneLocal(cliente.Phone) : "");

    const representante = extrairDadosRepresentanteLegal(cliente);
    setTemRepresentanteLegal(representante.temDadosRepresentante);
    setNomeRepresentante(representante.nome);
    setRgRepresentante(representante.rg);
    setCpfRepresentante(formatarCpf(representante.cpf));
    setEmailRepresentante(representante.email);
    setCelularRepresentante(
      representante.celular ? formatBrazilPhone(representante.celular) : "",
    );
    setDataNascimentoRepresentante(
      normalizarDataParaInput(representante.dataNascimento),
    );

    // Preenche endereço (campos Other_* do Contacts)
    const enderecoCliente = {
      rua: cliente.Other_Street || "",
      bairro: cliente.Outro_Bairro || "",
      cidade: cliente.Other_City || "",
      estado: cliente.Other_State || "",
      pais: cliente.Other_Country || "Brasil",
      cep: "",
    };

    setRua(enderecoCliente.rua);
    setBairro(enderecoCliente.bairro);
    setCidade(enderecoCliente.cidade);
    setEstado(enderecoCliente.estado);
    setPais(enderecoCliente.pais);
    setEnderecoPreenchidoViaCep(false);
    setEnderecoBaseViaCep(null);
    setAtualizacaoEnderecoViaPortal(false);

    // Formata CEP (prioriza Other_Zip, fallback para Outra_Correspond_ncia)
    const cepDoCliente = cliente.Other_Zip || cliente.Outra_Correspond_ncia;
    if (cepDoCliente) {
      const cepLimpo = cepDoCliente.replace(/\D/g, "");
      const cepFormatado = formatarCep(cepLimpo);
      setBuscarCep(cepFormatado);
      setCep(cepFormatado);
      enderecoCliente.cep = cepFormatado;
    }

    setEnderecoSugeridoCliente(enderecoCliente);
    setShowAddressConfirmModal(true);

    // Limpa a lista de clientes encontrados após selecionar
    setClientesEncontrados([]);
    showToast("✅ Cliente selecionado e dados preenchidos!", "success", 2000);
  };

  const handleConfirmarEnderecoSugerido = () => {
    setAtualizacaoEnderecoViaPortal(false);
    setShowAddressConfirmModal(false);
    showToast("✅ Endereço confirmado.", "success", 2000);
  };

  const handleQueroAlterarEndereco = () => {
    setShowAddressConfirmModal(false);

    const cepAnterior = enderecoSugeridoCliente?.cep || cep || "";

    setRua("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCep("");
    setCidade("");
    setEstado("");
    setPais("Brasil");
    setBuscarCep(cepAnterior);
    setEnderecoPreenchidoViaCep(false);
    setEnderecoBaseViaCep(null);
    setAtualizacaoEnderecoViaPortal(true);

    setTimeout(() => {
      const buscarCepSection = document.getElementById("secao-busca-cep-recompra");
      if (buscarCepSection) {
        buscarCepSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);

    showToast("✏️ Endereço limpo. CEP mantido para nova busca/validação.", "success", 2500);
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
      const cepFormatado = formatarCep(cepLimpo);
      setCep(cepFormatado);
      setEnderecoBaseViaCep({
        rua: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
        pais: "Brasil",
        cep: cepFormatado,
      });
      setEnderecoPreenchidoViaCep(true);
      setAtualizacaoEnderecoViaPortal(false);

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
    if (!valor) return "";
    const cpf = valor.toString().replace(/\D/g, "");
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
  const [cpfRepresentanteError, setCpfRepresentanteError] = useState("");
  const [cpfBuscaError, setCpfBuscaError] = useState("");

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

  // Handler para CPF Representante com formatação e validação
  const handleCpfRepresentanteChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    if (valor.length <= 11) {
      setCpfRepresentante(formatarCpf(valor));
      // Mostra erro apenas se CPF tem 11 dígitos e é inválido
      if (valor.length === 11 && !isValidCPF(valor)) {
        setCpfRepresentanteError("CPF inválido");
        showToast("⚠️ CPF do representante inválido. Verifique os dígitos verificadores", "warning");
      } else {
        setCpfRepresentanteError("");
      }
    }
  };

  // Handler para CPF Busca com formatação e validação
  const handleCpfBuscaChange = (valor) => {
    if (valor.length === 11 && !isValidCPF(valor)) {
      setCpfBuscaError("CPF inválido");
      showToast("⚠️ CPF inválido. Verifique os dígitos verificadores", "warning");
    } else {
      setCpfBuscaError("");
    }
  };

  // Handler para telefone/celular com formatação
  const handleTelefoneChange = (e, setter) => {
    setter(formatBrazilPhone(e.target.value));
  };

  const handleTelefoneLocalChange = (e, setter) => {
    setter(formatBrazilPhoneLocal(e.target.value));
  };

  // Função para limpar todos os campos do formulário
    // --- Rascunho (Salvar Temporariamente) ---
    const handleSalvarTemporariamente = () => {
      const draft = {
        nomePaciente, sobrenomePaciente, cpfPaciente, rgPaciente, celularPaciente,
        emailPaciente, dataNascimento, telefonePaciente,
        temRepresentanteLegal, nomeRepresentante, rgRepresentante, cpfRepresentante,
        emailRepresentante, celularRepresentante, dataNascimentoRepresentante,
        temNovoMedicoPrescritor, nomeMedico, crmMedico, ufCrm,
        celularMedico, emailMedico, especialidadeMedico,
        atualizacaoEnderecoViaPortal,
        rua, numero, complemento, bairro, cep, cidade, estado, pais,
        negociacaoFeitaPeloConsultor, solicitarLinkPagamento, tipoLink,
        campanhaDiretoria, produtos,
        formaPagamento, termosCondicoesPagamento, observacao,
        realizarProcessoComParceiro, parceiroSelecionado, documentosCompletos,
        salvoEm: new Date().toLocaleString("pt-BR"),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      salvarFormularioTemporariamente({
        tipo: "recompra",
        titulo: `Recompra - ${nomePaciente || "Sem paciente"}`,
        paciente: nomePaciente,
        cpf: cpfPaciente,
        resumo: `Paciente: ${nomePaciente}, Produtos: ${produtos.filter(p => p.nome).length}`,
        dados: draft,
        rota: "/recompra",
      });
      showToast("💾 Formulário salvo temporariamente!", "success");
    };

    const handleRestaurarRascunho = () => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        setNomePaciente(d.nomePaciente || "");
        setSobrenomePaciente(d.sobrenomePaciente || "");
        setCpfPaciente(d.cpfPaciente || "");
        setRgPaciente(d.rgPaciente || "");
        setCelularPaciente(d.celularPaciente || "");
        setEmailPaciente(d.emailPaciente || "");
        setDataNascimento(d.dataNascimento || "");
        setTelefonePaciente(d.telefonePaciente || "");
        setTemRepresentanteLegal(d.temRepresentanteLegal || false);
        setNomeRepresentante(d.nomeRepresentante || "");
        setRgRepresentante(d.rgRepresentante || "");
        setCpfRepresentante(d.cpfRepresentante || "");
        setEmailRepresentante(d.emailRepresentante || "");
        setCelularRepresentante(d.celularRepresentante || "");
        setDataNascimentoRepresentante(d.dataNascimentoRepresentante || "");
        setTemNovoMedicoPrescritor(d.temNovoMedicoPrescritor || false);
        setNomeMedico(d.nomeMedico || "");
        setCrmMedico(d.crmMedico || "");
        setUfCrm(d.ufCrm || "");
        setCelularMedico(d.celularMedico || "");
        setEmailMedico(d.emailMedico || "");
        setEspecialidadeMedico(d.especialidadeMedico || "");
        setAtualizacaoEnderecoViaPortal(d.atualizacaoEnderecoViaPortal || false);
        setRua(d.rua || "");
        setNumero(d.numero || "");
        setComplemento(d.complemento || "");
        setBairro(d.bairro || "");
        setCep(d.cep || "");
        setCidade(d.cidade || "");
        setEstado(d.estado || "");
        setPais(d.pais || "Brasil");
        setNegociacaoFeitaPeloConsultor(d.negociacaoFeitaPeloConsultor || false);
        setSolicitarLinkPagamento(d.solicitarLinkPagamento || "");
        setTipoLink(d.tipoLink || "");
        setCampanhaDiretoria(d.campanhaDiretoria || false);
        if (d.produtos?.length) setProdutos(d.produtos);
        setFormaPagamento(d.formaPagamento || "");
        setTermosCondicoesPagamento(d.termosCondicoesPagamento || "");
        setObservacao(d.observacao || "");
        setRealizarProcessoComParceiro(d.realizarProcessoComParceiro || false);
        setParceiroSelecionado(d.parceiroSelecionado || "");
        setDocumentosCompletos(d.documentosCompletos || false);
        setShowDraftBanner(false);
        showToast("✅ Rascunho restaurado!", "success");
      } catch {
        showToast("❌ Erro ao restaurar rascunho.", "error");
      }
    };

    const handleDescartarRascunho = () => {
      localStorage.removeItem(DRAFT_KEY);
      setShowDraftBanner(false);
    };

  const limparFormulario = () => {
      localStorage.removeItem(DRAFT_KEY);
    setNomePaciente("");
    setSobrenomePaciente("");
    setCpfPaciente("");
    setRgPaciente("");
    setCelularPaciente("");
    setEmailPaciente("");
    setDataNascimento("");
    setTelefonePaciente("");
    setRua("");
    setBairro("");
    setCidade("");
    setEstado("");
    setPais("Brasil");
    setNumero("");
    setComplemento("");
    setCep("");
    setAtualizacaoEnderecoViaPortal(false);
    setEnderecoPreenchidoViaCep(false);
    setEnderecoBaseViaCep(null);
    setEnderecoSugeridoCliente(null);
    setShowAddressConfirmModal(false);
    setBuscarCep("");
    setTemRepresentanteLegal(false);
    setNomeRepresentante("");
    setRgRepresentante("");
    setCpfRepresentante("");
    setEmailRepresentante("");
    setCelularRepresentante("");
    setDataNascimentoRepresentante("");
    setTemNovoMedicoPrescritor(false);
    setNomeMedico("");
    setCrmMedico("");
    setUfCrm("");
    setCelularMedico("");
    setEmailMedico("");
    setEspecialidadeMedico("");
    setNegociacaoFeitaPeloConsultor(false);
    setSolicitarLinkPagamento("");
    setTipoLink("");
    setCampanhaDiretoria(false);
    setFormaPagamento("");
    setTermosCondicoesPagamento("");
    setObservacao("");
    setArquivos([]);
    setDocumentosCompletos(false);
    setRealizarProcessoComParceiro(false);
    setParceiroSelecionado("");
    setProdutos([{ id: 1, nome: "", produtoId: "", quantidade: "1" }]);
    setTipoSolicitacao("Recompra"); // Reseta para o valor padrão
    setTipoBuscaCliente("nome");
    setNomeBusca("");
    setCpfBusca("");
    setClientesEncontrados([]);
  };

  // Função para validar campos obrigatórios
  const validarCamposObrigatorios = () => {
    const camposVazios = [];

    if (!ignorarCamposObrigatorios) {
      // Valida campos do paciente (apenas os obrigatórios)
      if (!nomePaciente.trim()) camposVazios.push("Nome");
      if (!sobrenomePaciente.trim()) camposVazios.push("Sobrenome");
      if (!cpfPaciente.trim()) camposVazios.push("CPF");
      if (!celularPaciente.trim()) camposVazios.push("Celular");
      if (!emailPaciente.trim()) camposVazios.push("E-mail");
    }

    // Valida CPF do paciente se preenchido
    if (cpfPaciente.trim() && !isValidCPF(cpfPaciente)) {
      showToast("❌ CPF do paciente inválido", "error");
      return { valido: false, camposVazios: [] };
    }

    // Valida CPF do representante legal se preenchido
    if (temRepresentanteLegal && cpfRepresentante.trim() && !isValidCPF(cpfRepresentante)) {
      showToast("❌ CPF do representante legal inválido", "error");
      return { valido: false, camposVazios: [] };
    }

    // Valida produtos
    const produtosValidos = produtos.filter(
      (p) => p.nome.trim() && p.produtoId,
    );

    if (!ignorarCamposObrigatorios && produtosValidos.length === 0) {
      camposVazios.push("Produto");
    }

    // Valida quantidade dos produtos
    const produtosComQuantidadeInvalida = produtos.filter((p) => {
      if (!p.nome.trim() || !p.produtoId) return false; // Ignora produtos não selecionados
      const quantidade = parseInt(p.quantidade) || 0;
      return quantidade <= 0;
    });

    if (produtosComQuantidadeInvalida.length > 0) {
      showToast(
        "❌ A quantidade do produto não pode ser igual ou menor que 0",
        "error",
      );
      return { valido: false, camposVazios: [] };
    }

    // Valida campos do representante legal (obrigatórios quando checkbox está marcado)
    if (!ignorarCamposObrigatorios && temRepresentanteLegal) {
      if (!nomeRepresentante.trim()) camposVazios.push("Nome do Representante");
      if (!cpfRepresentante.trim()) camposVazios.push("CPF do Representante");
      if (!celularRepresentante.trim()) camposVazios.push("Celular do Representante");
      if (!dataNascimentoRepresentante.trim()) camposVazios.push("Data de Nascimento do Representante");
    }

    // Valida campos do novo médico prescritor (obrigatórios quando checkbox está marcado)
    if (!ignorarCamposObrigatorios && temNovoMedicoPrescritor) {
      if (!nomeMedico.trim()) camposVazios.push("Nome do Médico");
      if (!crmMedico.trim()) camposVazios.push("CRM do Médico");
      if (!ufCrm.trim()) camposVazios.push("UF do CRM");
      if (!celularMedico.trim()) camposVazios.push("Celular do Médico");
      if (!emailMedico.trim()) camposVazios.push("E-mail do Médico");
      if (!especialidadeMedico.trim()) camposVazios.push("Especialidade do Médico");
    }

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

    // Valida produtos (já validado acima, mas filtra novamente para usar)
    const produtosValidos = produtos.filter(
      (p) =>
        p.nome.trim() &&
        p.produtoId &&
        p.quantidade &&
        parseInt(p.quantidade) > 0,
    );

    // Mostra splash screen durante a criação
    setShowSplash(true);
    setLoading(true);

    try {
      // Obtém o nome do usuário logado (ou parceiro se selecionado)
      const user = authService.getUser();
      const consultorTegra =
        realizarProcessoComParceiro && parceiroSelecionado
          ? parceiroSelecionado
          : getNomeUsuario(user) || "";

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

      // Prepara os dados da recompra
      const dadosCompra = {
        nomePaciente,
        sobrenomePaciente,
        cpfPaciente,
        dataNascimento,
        emailPaciente,
        rgPaciente,
        celularPaciente,
        telefonePaciente,
        rua,
        numero,
        bairro,
        cidade,
        estado,
        cep: cep || "",
        pais,
        complemento,
        atualizacaoEnderecoViaPortal,
        produtos: produtosValidos,
        consultorTegra,
        tipoSolicitacao: tipoSolicitacao, // Valor fixo "Recompra"
        // Campos do representante legal
        temRepresentanteLegal,
        nomeRepresentante,
        rgRepresentante,
        cpfRepresentante,
        emailRepresentante,
        celularRepresentante,
        dataNascimentoRepresentante,
        // Campos do novo médico prescritor
        temNovoMedicoPrescritor,
        nomeMedico,
        crmMedico,
        ufCrm,
        celularMedico,
        emailMedico,
        especialidadeMedico,
        // Campos de negociação
        negociacaoFeitaPeloConsultor,
        solicitarLinkPagamento,
        tipoLink,
        // Campanha Diretoria
        campanhaDiretoria,
        // Campos de pagamento
        formaPagamento,
        termosCondicoesPagamento,
        // Campo de observação
        observacao,
        // Campo de documentos completos
        documentosCompletos,
        // Arquivos para upload (convertidos para base64)
        arquivos: arquivosBase64,
      };

      // Envia para o backend
      const response = await compraService.criarCompra(dadosCompra);

      if (response.success) {
        // Obtém a data de criação do registro (do Zoho ou usa data atual)
        const dataCriacao =
          response.data?.Created_Time ||
          response.data?.created_time ||
          new Date().toISOString();

        // Calcula o total da recompra
        const totalRecompra = produtosValidos.reduce((acc, p) => {
          return acc + (parseFloat(p.valor) * parseInt(p.quantidade) || 0);
        }, 0);

        // Obtém o nome para o comprovante (ou parceiro se selecionado)
        const nomeConsultor =
          realizarProcessoComParceiro && parceiroSelecionado
            ? parceiroSelecionado
            : getNomeUsuario(usuarioLogado);

        // Inclui todos os campos enviados no formulário (exceto uploads)
        const dadosSemArquivos = { ...dadosCompra };
        delete dadosSemArquivos.arquivos;

        await marcarFormularioComoEnviado({
          tipo: "recompra",
          protocolo: response.protocolo,
          zohoRecordId: response.data?.id || null,
          titulo: `Recompra - ${nomePaciente || "Sem paciente"}`,
          paciente: nomePaciente || "",
          cpf: cpfPaciente || "",
          resumo: `Paciente: ${nomePaciente || ""}, Produtos: ${produtosValidos.length}`,
          dados: dadosSemArquivos,
        });

        const dadosComprovante = {
          ...dadosSemArquivos,
          protocolo: response.protocolo,
          consultorTegra: nomeConsultor,
          dataCriacao,
          totalCompra: totalRecompra,
        };

        // Oculta splash screen antes de navegar
        setShowSplash(false);

        // Navega para a página de agradecimento com os dados necessários
        navigate(ROUTES.AGRADECIMENTO, {
          state: {
            tipoSolicitacao: tipoSolicitacao || "Recompra",
            nomePaciente,
            sobrenomePaciente,
            dataCriacao,
            origem: "recompra",
            dadosComprovante,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao criar recompra:", error);
      const errorMessage =
        error.error ||
        error.message ||
        "Erro ao cadastrar recompra. Tente novamente.";

      await marcarFalhaEnvioFormulario({
        tipo: "recompra",
        titulo: `Recompra - ${nomePaciente || "Sem paciente"}`,
        paciente: nomePaciente || "",
        cpf: cpfPaciente || "",
        resumo: `Falha ao enviar recompra para ${nomePaciente || "paciente não identificado"}`,
        erro: errorMessage,
      });

      showToast(`❌ ${errorMessage}`, "error");
      setShowSplash(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen message="Criando recompra..." />}
      <MainLayout>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(/painel_consultor_recompra.png)',
            backgroundSize: 'cover',
            backgroundPosition: '25% center',
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
        {buscandoCliente && (
          <div className="cpf-loading-overlay" aria-live="polite">
            <div className="cpf-loading-glass" role="status">
              <div className="cpf-loading-spinner" />
              <p className="cpf-loading-text">
                Buscando dados pelo CPF...
              </p>
            </div>
          </div>
        )}
        <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary mb-4 sm:mb-6">
            Nova Recompra
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
            {/* Seção: Buscar Cliente */}
            <div id="secao-busca-cliente-recompra" className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Buscar cliente
              </h2>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <Input
                    label="CPF"
                    type="text"
                    value={cpfBusca}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");
                      if (valor.length <= 11) {
                        setCpfBusca(formatarCpf(valor));
                        handleCpfBuscaChange(valor);
                      }
                      setClientesEncontrados([]);
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    icon={<MdContacts className="text-xl" />}
                    iconClear={<MdClose className="text-xl" />}
                    showIconClear={cpfBusca.replace(/\D/g, "").length > 0}
                    onClearClick={(e) => {
                      e.preventDefault();
                      setCpfBusca("");
                      setCpfBuscaError("");
                      setClientesEncontrados([]);
                    }}
                    error={cpfBuscaError}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleBuscarCliente}
                    disabled={
                      buscandoCliente ||
                      cpfBusca.replace(/\D/g, "").length !== 11
                    }
                    loading={buscandoCliente}
                    className="w-full sm:w-auto py-2 sm:py-2.5"
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Lista de clientes encontrados */}
              {clientesEncontrados.length > 0 && (
                <div className="mt-2 space-y-2">
                  {clientesEncontrados.map((cliente, index) => {
                    const nomeCompleto =
                      cliente.Nome_Cliente ||
                      `${cliente.First_Name || ""} ${
                        cliente.Last_Name || ""
                      }`.trim();
                    const cpfExibido = cliente.CPF || cliente.cpf || "";

                    return (
                      <div
                        key={cliente.id || index}
                        onClick={() => handleSelecionarCliente(cliente)}
                        className="bg-white border-2 border-tegra-blue-dark rounded-lg p-3 cursor-pointer hover:bg-tegra-blue-light transition-colors group"
                      >
                        <div className="text-tegra-blue-dark font-bold group-hover:text-white transition-colors">
                          {nomeCompleto || "Nome não informado"}
                        </div>
                        {cpfExibido && (
                          <div className="text-tegra-text-secondary text-sm group-hover:text-white transition-colors">
                            CPF: {formatarCpf(cpfExibido)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seção: Parceiro (dinâmica via campo Parcerias do usuário) */}
            {exibirSecaoParceiro && (
              <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                  Parceiro
                </h2>
                <Checkbox
                  id="realizar-processo-parceiro"
                  label="Realizar processo com um parceiro"
                  checked={realizarProcessoComParceiro}
                  onChange={(e) => {
                    setRealizarProcessoComParceiro(e.target.checked);
                  }}
                />
                {realizarProcessoComParceiro && (
                  <div className="mt-4">
                    <Select
                      label="Parceria"
                      value={parceiroSelecionado}
                      onChange={(e) => setParceiroSelecionado(e.target.value)}
                      options={opcoesParceiro}
                      placeholder="Selecione o parceiro"
                    />
                  </div>
                )}
              </div>
            )}

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
                  label="RG"
                  type="text"
                  value={rgPaciente}
                  onChange={(e) => {
                    const valor = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                    if (valor.length <= 9) {
                      setRgPaciente(formatarRg(valor));
                    }
                  }}
                  placeholder="00.000.000-X"
                  maxLength={12}
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
                  label="Telefone"
                  type="text"
                  value={telefonePaciente}
                  onChange={(e) => handleTelefoneLocalChange(e, setTelefonePaciente)}
                  placeholder="(00) 0000-0000"
                  icon={<MdPhone className="text-xl" />}
                  maxLength={14}
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
                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  icon={<MdCalendarToday className="text-xl" />}
                />
              </div>

              {/* Checkbox Representante Legal */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-tegra-gray-medium">
                <Checkbox
                  id="representante-legal"
                  label="Representante Legal"
                  checked={temRepresentanteLegal}
                  onChange={(e) => setTemRepresentanteLegal(e.target.checked)}
                  labelClassName="text-tegra-blue-dark font-bold"
                />
              </div>
            </div>

            {/* Seção: Dados do Representante Legal */}
            {temRepresentanteLegal && (
              <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                  Dados do Representante Legal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Input
                    label="Nome Representante"
                    type="text"
                    value={nomeRepresentante}
                    required={temRepresentanteLegal}
                    onChange={(e) => setNomeRepresentante(e.target.value)}
                    placeholder="Nome do representante legal"
                    icon={<MdPerson className="text-xl" />}
                  />
                  <Input
                    label="RG Representante"
                    type="text"
                    value={rgRepresentante}
                    onChange={(e) => {
                      const valor = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                      if (valor.length <= 9) {
                        setRgRepresentante(formatarRg(valor));
                      }
                    }}
                    placeholder="00.000.000-X"
                    maxLength={12}
                  />
                  <Input
                    label="CPF Representante"
                    type="text"
                    value={cpfRepresentante}
                    required={temRepresentanteLegal}
                    onChange={handleCpfRepresentanteChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    error={cpfRepresentanteError}
                  />
                  <Input
                    label="E-mail Representante"
                    type="email"
                    value={emailRepresentante}
                    onChange={(e) => setEmailRepresentante(e.target.value)}
                    placeholder="email@exemplo.com"
                    icon={<MdEmail className="text-xl" />}
                  />
                  <Input
                    label="Celular Representante"
                    type="text"
                    value={celularRepresentante}
                    required={temRepresentanteLegal}
                    onChange={(e) =>
                      handleTelefoneChange(e, setCelularRepresentante)
                    }
                    placeholder="+55 (00) 00000-0000"
                    icon={<MdPhone className="text-xl" />}
                    maxLength={20}
                  />
                  <Input
                    label="Data de Nascimento Representante"
                    type="date"
                    value={dataNascimentoRepresentante}
                    required={temRepresentanteLegal}
                    onChange={(e) =>
                      setDataNascimentoRepresentante(e.target.value)
                    }
                    icon={<MdCalendarToday className="text-xl" />}
                  />
                </div>
              </div>
            )}

            {/* Seção: Campanha Diretoria */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <Checkbox
                id="campanha-diretoria"
                label={
                  <span className="font-bold text-tegra-blue-dark">
                    Campanha Diretoria
                  </span>
                }
                checked={campanhaDiretoria}
                onChange={(e) => setCampanhaDiretoria(e.target.checked)}
              />
            </div>

            {/* Seção: Dados do Novo Médico Prescritor */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <div className="mb-4">
                <Checkbox
                  id="novo-medico-prescritor"
                  label={
                    <span className="font-bold text-tegra-blue-dark">
                      Dados do novo médico prescritor
                    </span>
                  }
                  checked={temNovoMedicoPrescritor}
                  onChange={(e) => setTemNovoMedicoPrescritor(e.target.checked)}
                />
              </div>

              {/* Campos do médico (aparecem quando checkbox está marcado) */}
              {temNovoMedicoPrescritor && (
                <div className="mt-4 pt-4 border-t border-tegra-gray-medium">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <Input
                      label="Nome do Médico"
                      type="text"
                      value={nomeMedico}
                      required={temNovoMedicoPrescritor}
                      onChange={(e) => setNomeMedico(e.target.value)}
                      placeholder="Nome completo do médico"
                      icon={<MdPerson className="text-xl" />}
                    />
                    <Input
                      label="CRM do Médico"
                      type="number"
                      value={crmMedico}
                      required={temNovoMedicoPrescritor}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, "");
                        setCrmMedico(valor);
                      }}
                      placeholder="Número do CRM"
                    />
                    <Select
                      label="UF do CRM"
                      value={ufCrm}
                      required={temNovoMedicoPrescritor}
                      onChange={(e) => setUfCrm(e.target.value)}
                      options={estadosBrasileiros}
                      placeholder="Selecione o estado"
                    />
                    <Input
                      label="Celular do Médico"
                      type="text"
                      value={celularMedico}
                      required={temNovoMedicoPrescritor}
                      onChange={(e) => handleTelefoneChange(e, setCelularMedico)}
                      placeholder="+55 (00) 00000-0000"
                      icon={<MdPhone className="text-xl" />}
                      maxLength={20}
                    />
                    <Input
                      label="E-mail do Médico"
                      type="email"
                      value={emailMedico}
                      required={temNovoMedicoPrescritor}
                      onChange={(e) => setEmailMedico(e.target.value)}
                      placeholder="email@exemplo.com"
                      icon={<MdEmail className="text-xl" />}
                    />
                    <Input
                      label="Especialidade"
                      type="text"
                      value={especialidadeMedico}
                      required={temNovoMedicoPrescritor}
                      onChange={(e) => setEspecialidadeMedico(e.target.value)}
                      placeholder="Especialidade do médico"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Seção: Busca CEP */}
            <div id="secao-busca-cep-recompra" className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Buscar CEP
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <Input
                    label="CEP"
                    type="text"
                    value={buscarCep}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");
                      if (valor.length <= 8) {
                        setBuscarCep(formatarCep(valor));
                      }
                    }}
                    placeholder="00000-000"
                    icon={<MdSearch className="text-xl" />}
                    maxLength={9}
                    iconClear={<MdClose className="text-xl" />}
                    showIconClear={buscarCep.replace(/\D/g, "").length === 8}
                    onClearClick={(e) => {
                      e.preventDefault();
                      setBuscarCep("");
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleBuscarCep}
                    disabled={
                      buscandoCep ||
                      buscarCep.replace(/\D/g, "").length !== 8
                    }
                    loading={buscandoCep}
                    className="w-full sm:w-auto py-2 sm:py-2.5"
                  >
                    Buscar
                  </Button>
                </div>
              </div>
            </div>

            {/* Seção: Endereço */}
            <div
              id="secao-endereco-recompra"
              className={`bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6 border ${
                atualizacaoEnderecoViaPortal
                  ? "border-tegra-teal"
                  : "border-transparent"
              }`}
            >
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4 flex items-center gap-2">
                <MdLocationOn className="text-lg sm:text-xl" />
                Endereço
              </h2>
              <div className="mb-4 sm:mb-5 rounded-xl border border-tegra-gray-medium/70 bg-tegra-bg-secondary/40 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-tegra-blue-dark">
                      Atualização de endereço
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit shadow-sm ${
                      atualizacaoEnderecoViaPortal
                        ? "bg-tegra-teal text-white"
                        : "bg-tegra-gray-light text-tegra-text-secondary"
                    }`}
                  >
                    {atualizacaoEnderecoViaPortal
                      ? "Atualização via portal ativa"
                      : "Sem alteração manual detectada"}
                  </span>
                </div>

                {enderecoAguardandoConfirmacao && (
                  <div className="mt-3 rounded-md border-2 border-tegra-blue-light bg-tegra-bg-accent px-3 py-2 text-xs sm:text-sm font-semibold text-tegra-blue-dark">
                    Endereço preenchido via CEP. Ao editar qualquer campo abaixo,
                    a atualização via portal será ativada automaticamente.
                  </div>
                )}

                {atualizacaoEnderecoViaPortal && (
                  <div className="mt-3 rounded-md bg-tegra-teal/10 px-3 py-2 text-xs sm:text-sm text-tegra-blue-dark">
                    As alterações serão registradas no CRM como atualização via
                    portal. Responsável: <strong>{consultorEndereco}</strong>.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Rua"
                    type="text"
                    value={rua}
                    onChange={handleEnderecoChange(setRua)}
                    placeholder="Nome da rua"
                    className={estiloCampoEndereco}
                  />
                </div>
                <Input
                  label="Numero"
                  type="text"
                  value={numero}
                  onChange={handleEnderecoChange(setNumero)}
                  placeholder="Número"
                  className={estiloCampoEndereco}
                />
                <Input
                  label="Complemento"
                  type="text"
                  value={complemento}
                  onChange={handleEnderecoChange(setComplemento)}
                  placeholder="Apto, Bloco, etc."
                  className={estiloCampoEndereco}
                />
                <Input
                  label="Bairro"
                  type="text"
                  value={bairro}
                  onChange={handleEnderecoChange(setBairro)}
                  placeholder="Bairro"
                  className={estiloCampoEndereco}
                />
                <Input
                  label="CEP"
                  type="text"
                  value={cep}
                  onChange={handleCepEnderecoChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className={estiloCampoEndereco}
                />
                <Input
                  label="Cidade"
                  type="text"
                  value={cidade}
                  onChange={handleEnderecoChange(setCidade)}
                  placeholder="Cidade"
                  className={estiloCampoEndereco}
                />
                <Input
                  label="Estado"
                  type="text"
                  value={estado}
                  onChange={handleEnderecoChange(setEstado)}
                  placeholder="Estado (UF)"
                  maxLength={2}
                  className={estiloCampoEndereco}
                />
                <Input
                  label="Pais"
                  type="text"
                  value={pais}
                  onChange={handleEnderecoChange(setPais)}
                  placeholder="País"
                  className={estiloCampoEndereco}
                />
              </div>
            </div>

            {/* Seção: Negociação feita pelo consultor */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <Checkbox
                id="negociacao-consultor"
                label={
                  <span className="font-bold text-tegra-blue-dark">
                    Negociação feita pelo consultor?
                  </span>
                }
                checked={negociacaoFeitaPeloConsultor}
                onChange={(e) =>
                  setNegociacaoFeitaPeloConsultor(e.target.checked)
                }
              />

              {/* Campos que aparecem quando o checkbox está marcado */}
              {negociacaoFeitaPeloConsultor && (
                <div className="mt-4 pt-4 border-t border-tegra-gray-medium">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <Select
                      label="Solicitar link para pagamento?"
                      value={solicitarLinkPagamento}
                      onChange={(e) => {
                        setSolicitarLinkPagamento(e.target.value);
                        // Limpa o campo Tipo de Link se a opção for "Não"
                        if (e.target.value === "Não") {
                          setTipoLink("");
                        }
                      }}
                      options={[
                        { value: "Sim", label: "Sim" },
                        { value: "Não", label: "Não" },
                      ]}
                      placeholder="Selecione uma opção"
                    />
                    {solicitarLinkPagamento === "Sim" && (
                      <Select
                        label="Tipo de Link"
                        value={tipoLink}
                        onChange={(e) => setTipoLink(e.target.value)}
                        options={[
                          { value: "Pagar-Me", label: "Pagar-Me" },
                        ]}
                        placeholder="Selecione o tipo de link"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Campo: Tipo de Solicitação (fixo como "Recompra") */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <Select
                label="Tipo de Solicitação"
                value={tipoSolicitacao}
                onChange={(e) => setTipoSolicitacao(e.target.value)}
                options={[
                  { value: "Recompra", label: "Recompra" },
                ]}
                placeholder="Selecione o tipo de solicitação"
                disabled={true}
              />
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
                  <span className="text-sm sm:text-base">
                    Adicionar Produto
                  </span>
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
                        // Componente visual do produto selecionado (chip/pill)
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-tegra-blue rounded-full">
                          <span className="text-tegra-blue-dark font-bold text-sm">
                            {produto.nome}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              atualizarProdutoCompleto(produto.id, "", "");
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
                          value={produto.nome}
                          required
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

                            // Atualiza ambos os campos de uma vez
                            if (valor && produtoId) {
                              atualizarProdutoCompleto(
                                produto.id,
                                valor,
                                produtoId,
                              );
                            } else if (!valor) {
                              // Se não tem valor, limpa ambos
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
                          atualizarProduto(
                            produto.id,
                            "quantidade",
                            e.target.value,
                          )
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

            {/* Seção: Forma de Pagamento */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Forma de Pagamento
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <Select
                  label="Forma de Pagamento"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  options={[
                    { value: "Boleto", label: "Boleto" },
                    { value: "Cartão de Credito", label: "Cartão de Credito" },
                    { value: "Deposito", label: "Deposito" },
                    { value: "Conta Internacional", label: "Conta Internacional" },
                    { value: "PIX", label: "PIX" },
                    { value: "TED - Transferencia Bancaria", label: "TED - Transferencia Bancaria" },
                  ]}
                  placeholder="Selecione a forma de pagamento"
                />
                <Textarea
                  label="Termos e condições de pagamento"
                  value={termosCondicoesPagamento}
                  onChange={(e) => setTermosCondicoesPagamento(e.target.value)}
                  placeholder="Digite os termos e condições de pagamento"
                  rows={4}
                />
              </div>
            </div>

            {/* Seção: Observação */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
                Observação
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <Textarea
                  label="Observação"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Digite suas observações"
                  rows={4}
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
                      const totalArquivos = arquivos.length + novosArquivos.length;
                      
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

                {/* Checkbox Documentos Completos */}
                <div className="pt-2">
                  <Checkbox
                    id="documentos-completos"
                    label={
                      <span className="font-bold text-tegra-blue-dark">
                        Documentos Completos?
                      </span>
                    }
                    checked={documentosCompletos}
                    onChange={(e) => setDocumentosCompletos(e.target.checked)}
                  />
                </div>
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

      {/* Modal: Confirmar endereço puxado do CPF */}
      {showAddressConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-3">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-tegra-gray-medium">
              <h2 className="text-lg sm:text-xl font-bold text-tegra-blue-dark">
                Confirmar endereço do paciente
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressConfirmModal(false)}
                className="p-1 rounded-full hover:bg-tegra-gray-light text-tegra-text-secondary hover:text-tegra-blue-dark transition-colors"
                aria-label="Fechar confirmação de endereço"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-tegra-text-secondary mb-4">
                Este endereço foi preenchido a partir dos dados do cliente. Confira abaixo e escolha como deseja continuar.
              </p>

              <div className="rounded-lg border border-tegra-gray-medium bg-tegra-bg-secondary/40 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-tegra-text-secondary">Rua</p><p className="font-medium text-tegra-text-primary">{enderecoSugeridoCliente?.rua || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Bairro</p><p className="font-medium text-tegra-text-primary">{enderecoSugeridoCliente?.bairro || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Cidade</p><p className="font-medium text-tegra-text-primary">{enderecoSugeridoCliente?.cidade || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Estado</p><p className="font-medium text-tegra-text-primary">{enderecoSugeridoCliente?.estado || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">CEP</p><p className="font-medium text-tegra-text-primary">{enderecoSugeridoCliente?.cep || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">País</p><p className="font-medium text-tegra-text-primary">{enderecoSugeridoCliente?.pais || "—"}</p></div>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleConfirmarEnderecoSugerido}
                  className="w-full sm:w-auto"
                >
                  Confirmar endereço
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleQueroAlterarEndereco}
                  className="w-full sm:w-auto"
                >
                  Quero alterar endereço
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rever formulário */}
      {showReview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-3">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-tegra-gray-medium">
              <h2 className="text-xl font-bold text-tegra-blue-dark">Revisão do Formulário — Recompra</h2>
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

              {/* Parceiro */}
              {realizarProcessoComParceiro && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Parceiro</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-tegra-text-secondary">Parceiro selecionado</p><p className="text-sm font-medium text-tegra-text-primary">{parceiroSelecionado || "—"}</p></div>
                  </div>
                </div>
              )}

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

              {/* Representante Legal */}
              {temRepresentanteLegal && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Representante Legal</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-tegra-text-secondary">Nome</p><p className="text-sm font-medium text-tegra-text-primary">{nomeRepresentante || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">CPF</p><p className="text-sm font-medium text-tegra-text-primary">{cpfRepresentante || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">RG</p><p className="text-sm font-medium text-tegra-text-primary">{rgRepresentante || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">E-mail</p><p className="text-sm font-medium text-tegra-text-primary">{emailRepresentante || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Celular</p><p className="text-sm font-medium text-tegra-text-primary">{celularRepresentante || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Data de Nascimento</p><p className="text-sm font-medium text-tegra-text-primary">{dataNascimentoRepresentante || "—"}</p></div>
                  </div>
                </div>
              )}

              {/* Campanha Diretoria */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Campanha Diretoria</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Campanha Diretoria</p><p className="text-sm font-medium text-tegra-text-primary">{campanhaDiretoria ? "Sim" : "Não"}</p></div>
                </div>
              </div>

              {/* Novo Médico Prescritor */}
              {temNovoMedicoPrescritor && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Novo Médico Prescritor</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-tegra-text-secondary">Nome do médico</p><p className="text-sm font-medium text-tegra-text-primary">{nomeMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">CRM</p><p className="text-sm font-medium text-tegra-text-primary">{crmMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">UF do CRM</p><p className="text-sm font-medium text-tegra-text-primary">{ufCrm || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Celular</p><p className="text-sm font-medium text-tegra-text-primary">{celularMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">E-mail</p><p className="text-sm font-medium text-tegra-text-primary">{emailMedico || "—"}</p></div>
                    <div><p className="text-xs text-tegra-text-secondary">Especialidade</p><p className="text-sm font-medium text-tegra-text-primary">{especialidadeMedico || "—"}</p></div>
                  </div>
                </div>
              )}

              {/* Endereço */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Endereço</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {atualizacaoEnderecoViaPortal && (
                    <div className="sm:col-span-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-tegra-teal text-white">Atualização de endereço Via Portal ativa</span>
                    </div>
                  )}
                  <div><p className="text-xs text-tegra-text-secondary">Rua</p><p className="text-sm font-medium text-tegra-text-primary">{rua || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Número</p><p className="text-sm font-medium text-tegra-text-primary">{numero || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Complemento</p><p className="text-sm font-medium text-tegra-text-primary">{complemento || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Bairro</p><p className="text-sm font-medium text-tegra-text-primary">{bairro || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">CEP</p><p className="text-sm font-medium text-tegra-text-primary">{cep || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Cidade</p><p className="text-sm font-medium text-tegra-text-primary">{cidade || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Estado</p><p className="text-sm font-medium text-tegra-text-primary">{estado || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">País</p><p className="text-sm font-medium text-tegra-text-primary">{pais || "—"}</p></div>
                </div>
              </div>

              {/* Negociação */}
              {negociacaoFeitaPeloConsultor && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Negociação</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><p className="text-xs text-tegra-text-secondary">Solicitar link de pagamento</p><p className="text-sm font-medium text-tegra-text-primary">{solicitarLinkPagamento || "—"}</p></div>
                    {tipoLink && <div><p className="text-xs text-tegra-text-secondary">Tipo de link</p><p className="text-sm font-medium text-tegra-text-primary">{tipoLink}</p></div>}
                  </div>
                </div>
              )}

              {/* Tipo de Solicitação */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Tipo de Solicitação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Tipo</p><p className="text-sm font-medium text-tegra-text-primary">{tipoSolicitacao || "—"}</p></div>
                </div>
              </div>

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

              {/* Pagamento */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Pagamento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Forma de pagamento</p><p className="text-sm font-medium text-tegra-text-primary">{formaPagamento || "—"}</p></div>
                  <div><p className="text-xs text-tegra-text-secondary">Termos e condições</p><p className="text-sm font-medium text-tegra-text-primary">{termosCondicoesPagamento || "—"}</p></div>
                </div>
              </div>

              {/* Observação */}
              {observacao && (
                <div>
                  <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Observação</h3>
                  <p className="text-sm text-tegra-text-primary whitespace-pre-wrap">{observacao}</p>
                </div>
              )}

              {/* Arquivos e Documentos */}
              <div>
                <h3 className="text-xs font-bold text-tegra-blue uppercase tracking-wide mb-3 pb-1 border-b border-tegra-gray-medium">Documentos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-xs text-tegra-text-secondary">Documentos completos</p><p className="text-sm font-medium text-tegra-text-primary">{documentosCompletos ? "Sim" : "Não"}</p></div>
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
