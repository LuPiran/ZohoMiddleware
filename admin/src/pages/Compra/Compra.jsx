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
import { ROUTES } from "../../utils/constants";
import api from "../../services/api";
import { compraService } from "../../services/compra";
import { productsService } from "../../services/products";
import { isAdminPortal } from "../../utils/permissions";
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

  // Estados do endereço
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [pais, setPais] = useState("Brasil");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");

  // Estado para busca de CEP
  const [buscarCep, setBuscarCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Estado para produtos
  const [produtos, setProdutos] = useState([
    { id: 1, nome: "", produtoId: "", quantidade: "1" },
  ]);

  // Estado para produtos do Zoho (opções do select)
  const [produtosZoho, setProdutosZoho] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  // Estado para tipo de solicitação (oculto para Admin Portal)
  const [tipoSolicitacao, setTipoSolicitacao] = useState("Pedido");

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
      // Salva o CEP encontrado (já está formatado em buscarCep)
      // O CEP será enviado no formulário através de buscarCep

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

  // Função para validar campos obrigatórios
  const validarCamposObrigatorios = () => {
    const camposVazios = [];

    // Valida campos do paciente
    if (!nomePaciente.trim()) camposVazios.push("Nome");
    if (!sobrenomePaciente.trim()) camposVazios.push("Sobrenome");
    if (!cpfPaciente.trim()) camposVazios.push("CPF");

    // Valida campos do endereço (exceto complemento)
    if (!rua.trim()) camposVazios.push("Rua");
    if (!numero.trim()) camposVazios.push("Número");
    if (!bairro.trim()) camposVazios.push("Bairro");
    if (!cidade.trim()) camposVazios.push("Cidade");
    if (!estado.trim()) camposVazios.push("Estado");
    if (!pais.trim()) camposVazios.push("País");
    if (!buscarCep.trim()) camposVazios.push("CEP");

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

    setLoading(true);

    try {
      // Obtém o nome do usuário logado
      const user = authService.getUser();
      const consultorTegra =
        user?.nome ||
        user?.Nome ||
        user?.Name ||
        user?.nome_completo ||
        user?.Nome_Completo ||
        "";

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
        cep: buscarCep || "",
        pais,
        complemento,
        produtos: produtosValidos,
        consultorTegra,
        tipoSolicitacao: tipoSolicitacao || "Pedido", // Tipo de solicitação (oculto para Admin Portal)
      };

      // Envia para o backend
      const response = await compraService.criarCompra(dadosCompra);

      if (response.success) {
        showToast("✅ Compra cadastrada com sucesso!", "success", 3000);

        // Limpa o formulário após sucesso
        setTimeout(() => {
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
          setBuscarCep("");
          setProdutos([{ id: 1, nome: "", produtoId: "", quantidade: "1" }]);
          setTipoSolicitacao("Pedido"); // Reseta para o valor padrão
        }, 2000);
      }
    } catch (error) {
      console.error("Erro ao criar compra:", error);
      const errorMessage =
        error.error ||
        error.message ||
        "Erro ao cadastrar compra. Tente novamente.";
      showToast(`❌ ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSplash && <SplashScreen message="Criando compra..." />}
      <MainLayout>
        <div className="compra-page-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-tegra-text-primary mb-6">
              Nova Compra
            </h1>

            <form className="space-y-8 compra-form-bg" onSubmit={handleSubmit}>
            {/* Seção: Dados do Paciente */}
            <div className="compra-card rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-tegra-text-primary mb-4">
                Dados do Paciente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={(e) => setRgPaciente(e.target.value)}
                  placeholder="RG do paciente"
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
            </div>

            {/* Seção: Busca CEP */}
            <div className="compra-card rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-tegra-text-primary mb-4">
                Buscar CEP
              </h2>
              <div className="flex gap-4">
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
                  >
                    Buscar
                  </Button>
                </div>
              </div>
            </div>

            {/* Seção: Endereço */}
            <div className="compra-card rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-tegra-text-primary mb-4 flex items-center gap-2">
                <MdLocationOn className="text-xl" />
                Endereço
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Campo oculto: Tipo de Solicitação (apenas para usuários que NÃO são Admin Portal) */}
            {!isAdminPortal() && (
              <div className="compra-card rounded-lg shadow-md p-6">
                <Input
                  label="Tipo de Solicitação"
                  type="text"
                  value={tipoSolicitacao}
                  onChange={(e) => setTipoSolicitacao(e.target.value)}
                  placeholder="Pedido"
                />
              </div>
            )}

            {/* Seção: Produtos */}
            <div className="compra-card rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-tegra-text-primary">
                  Produtos
                </h2>
                <Button
                  type="button"
                  variant="teal"
                  size="sm"
                  onClick={adicionarProduto}
                  className="flex items-center gap-2"
                >
                  <MdAdd className="text-xl" />
                  Adicionar Produto
                </Button>
              </div>

              <div className="space-y-4">
                {produtos.map((produto, index) => (
                  <div
                    key={produto.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-tegra-gray-medium pb-4 last:border-b-0"
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
                          className="flex items-center gap-2"
                        >
                          <MdDelete className="text-lg" />
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={false}>
                Salvar Compra
              </Button>
            </div>
            </form>
          </div>
        </div>
      </MainLayout>
    </>
  );
}
