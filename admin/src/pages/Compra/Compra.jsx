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
import { ROUTES, getNomeUsuario, podeVerSecaoParceiro, getOpcoesParceiro } from "../../utils/constants";
import api from "../../services/api";
import { compraService } from "../../services/compra";
import { productsService } from "../../services/products";
import { isAdminPortal, hasAdminPanelPermission } from "../../utils/permissions";
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

export default function Compra() {
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

  // Estado para produtos
  const [produtos, setProdutos] = useState([
    { id: 1, nome: "", produtoId: "", quantidade: "1" },
  ]);

  // Estado para produtos do Zoho (opções do select)
  const [produtosZoho, setProdutosZoho] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  // Estado para tipo de solicitação (fixo como "1ª Compra" nesta página)
  const [tipoSolicitacao, setTipoSolicitacao] = useState("1ª Compra");

  // Estados para forma de pagamento
  const [formaPagamento, setFormaPagamento] = useState("");
  const [termosCondicoesPagamento, setTermosCondicoesPagamento] = useState("");

  // Estado para observação
  const [observacao, setObservacao] = useState("");

  // Estado para parceiro (visível apenas para Marcelli Silva e Diego Betti)
  const [realizarProcessoComParceiro, setRealizarProcessoComParceiro] =
    useState(false);
  const [parceiroSelecionado, setParceiroSelecionado] = useState("");

  // Estados para upload de arquivos
  const [arquivos, setArquivos] = useState([]);
  const [documentosCompletos, setDocumentosCompletos] = useState(false);

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
    setFormaPagamento("");
    setTermosCondicoesPagamento("");
    setObservacao("");
    setArquivos([]);
    setDocumentosCompletos(false);
    setRealizarProcessoComParceiro(false);
    setParceiroSelecionado("");
          setProdutos([{ id: 1, nome: "", produtoId: "", quantidade: "1" }]);
          setTipoSolicitacao("1ª Compra"); // Reseta para o valor padrão
  };

  // Função para validar campos obrigatórios
  const validarCamposObrigatorios = () => {
    const camposVazios = [];

    // Valida campos do paciente (apenas os obrigatórios)
    if (!nomePaciente.trim()) camposVazios.push("Nome");
    if (!sobrenomePaciente.trim()) camposVazios.push("Sobrenome");
    if (!celularPaciente.trim()) camposVazios.push("Celular");

    // Valida campos do endereço (número e complemento opcionais)
    if (!rua.trim()) camposVazios.push("Rua");
    if (!bairro.trim()) camposVazios.push("Bairro");
    if (!cidade.trim()) camposVazios.push("Cidade");
    if (!estado.trim()) camposVazios.push("Estado");
    if (!pais.trim()) camposVazios.push("País");
    if (!cep.trim()) camposVazios.push("CEP");

    // Valida produtos
    const produtosValidos = produtos.filter(
      (p) => p.nome.trim() && p.produtoId,
    );

    if (produtosValidos.length === 0) {
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
    if (temRepresentanteLegal) {
      if (!nomeRepresentante.trim()) camposVazios.push("Nome do Representante");
      if (!cpfRepresentante.trim()) camposVazios.push("CPF do Representante");
      if (!celularRepresentante.trim()) camposVazios.push("Celular do Representante");
      if (!dataNascimentoRepresentante.trim()) camposVazios.push("Data de Nascimento do Representante");
    }

    // Valida campos do novo médico prescritor (obrigatórios quando checkbox está marcado)
    if (temNovoMedicoPrescritor) {
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
      // Obtém o nome do usuário logado
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

      // Prepara os dados da compra
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
        produtos: produtosValidos,
        consultorTegra,
        tipoSolicitacao: tipoSolicitacao || "1ª Compra", // Tipo de solicitação
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

        // Calcula o total da compra
        const totalCompra = produtosValidos.reduce((acc, p) => {
          return acc + (parseFloat(p.valor) * parseInt(p.quantidade) || 0);
        }, 0);

        // Obtém o nome do usuário logado para o comprovante (ou parceiro se selecionado)
        const nomeConsultor =
          realizarProcessoComParceiro && parceiroSelecionado
            ? parceiroSelecionado
            : getNomeUsuario(authService.getUser());

        // Prepara os dados do comprovante
        const dadosComprovante = {
          protocolo: response.protocolo,
          tipoSolicitacao: tipoSolicitacao || "1ª Compra",
          consultorTegra: nomeConsultor,
          nomePaciente,
          sobrenomePaciente,
          cpfPaciente,
          emailPaciente,
          celularPaciente,
          dataNascimento,
          rua,
          numero,
          bairro,
          cidade,
          estado,
          cep,
          pais,
          produtos: produtosValidos.map(p => ({
            nome: p.nome,
            quantidade: p.quantidade,
            valor: p.valor,
          })),
          dataCriacao,
          totalCompra,
        };

        // Oculta splash screen antes de navegar
        setShowSplash(false);

        // Navega para a página de agradecimento com os dados necessários
        navigate(ROUTES.AGRADECIMENTO, {
          state: {
            tipoSolicitacao: tipoSolicitacao || "1ª Compra",
            nomePaciente,
            sobrenomePaciente,
            dataCriacao,
            origem: "compra",
            dadosComprovante,
          },
        });
      }
    } catch (error) {
      console.error("Erro ao criar compra:", error);
      const errorMessage =
        error.error ||
        error.message ||
        "Erro ao cadastrar compra. Tente novamente.";
      showToast(`❌ ${errorMessage}`, "error");
      setShowSplash(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen message="Criando compra..." />}
      <MainLayout>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: 'url(/painel_consultor_compra.png)',
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
            Nova Compra
          </h1>

          <form
            className="space-y-4 sm:space-y-6 md:space-y-8"
            onSubmit={handleSubmit}
          >
            {/* Seção: Parceiro (apenas para Marcelli Silva e Diego Betti) */}
            {podeVerSecaoParceiro(authService.getUser()) && (
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
                    if (!e.target.checked) setParceiroSelecionado("");
                  }}
                />
                {realizarProcessoComParceiro && (
                  <div className="mt-4">
                    <Select
                      label="Parceria"
                      value={parceiroSelecionado}
                      onChange={(e) => setParceiroSelecionado(e.target.value)}
                      options={getOpcoesParceiro(authService.getUser())}
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
                  label="RG"
                  type="text"
                  value={rgPaciente}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "");
                    if (valor.length <= 9) {
                      setRgPaciente(formatarRg(valor));
                    }
                  }}
                  placeholder="00.000.000-0"
                  maxLength={12}
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
                  label="Telefone"
                  type="text"
                  value={telefonePaciente}
                  onChange={(e) => handleTelefoneChange(e, setTelefonePaciente)}
                  placeholder="(00) 0000-0000"
                  icon={<MdPhone className="text-xl" />}
                  maxLength={14}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={emailPaciente}
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
                    onChange={(e) => setNomeRepresentante(e.target.value)}
                    placeholder="Nome do representante legal"
                    icon={<MdPerson className="text-xl" />}
                  />
                  <Input
                    label="RG Representante"
                    type="text"
                    value={rgRepresentante}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");
                      if (valor.length <= 9) {
                        setRgRepresentante(formatarRg(valor));
                      }
                    }}
                    placeholder="00.000.000-0"
                    maxLength={12}
                  />
                  <Input
                    label="CPF Representante"
                    type="text"
                    value={cpfRepresentante}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");
                      if (valor.length <= 11) {
                        setCpfRepresentante(formatarCpf(valor));
                      }
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
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
                    onChange={(e) =>
                      handleTelefoneChange(e, setCelularRepresentante)
                    }
                    placeholder="(00) 00000-0000"
                    icon={<MdPhone className="text-xl" />}
                    maxLength={15}
                  />
                  <Input
                    label="Data de Nascimento Representante"
                    type="date"
                    value={dataNascimentoRepresentante}
                    onChange={(e) =>
                      setDataNascimentoRepresentante(e.target.value)
                    }
                    icon={<MdCalendarToday className="text-xl" />}
                  />
                </div>
              </div>
            )}

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
                    <Input
                      label="Especialidade"
                      type="text"
                      value={especialidadeMedico}
                      onChange={(e) => setEspecialidadeMedico(e.target.value)}
                      placeholder="Especialidade do médico"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Seção: Busca CEP */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
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
                      buscandoCep || buscarCep.replace(/\D/g, "").length !== 8
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
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4 flex items-center gap-2">
                <MdLocationOn className="text-lg sm:text-xl" />
                Endereço
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Rua"
                    type="text"
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    placeholder="Nome da rua"
                  />
                </div>
                <Input
                  label="Número"
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Número"
                />
                <Input
                  label="Complemento"
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, Bloco, etc."
                />
                <Input
                  label="Bairro"
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                />
                <Input
                  label="CEP"
                  type="text"
                  value={cep}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, "");
                    if (valor.length <= 8) {
                      setCep(formatarCep(valor));
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <Input
                  label="Cidade"
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Cidade"
                />
                <Input
                  label="Estado"
                  type="text"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="Estado (UF)"
                  maxLength={2}
                />
                <Input
                  label="País"
                  type="text"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="País"
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
                          { value: "PayZen", label: "PayZen" },
                          { value: "Pagar-Me", label: "Pagar-Me" },
                        ]}
                        placeholder="Selecione o tipo de link"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Campo: Tipo de Solicitação (fixo como "1ª Compra") */}
            <div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
              <Select
                label="Tipo de Solicitação"
                value={tipoSolicitacao}
                onChange={(e) => setTipoSolicitacao(e.target.value)}
                options={[
                  { value: "1ª Compra", label: "1ª Compra" },
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
                type="submit"
                variant="primary"
                loading={false}
                className="w-full sm:w-auto"
              >
                Salvar Compra
              </Button>
            </div>
          </form>
        </div>
      </MainLayout>
    </>
  );
}
