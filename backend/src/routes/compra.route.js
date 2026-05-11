import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";
import { ENV } from "../config/env.js";
import { anexarArquivosNoRegistro } from "../services/zohoAttachment.js";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";
import { authenticateToken } from "../services/jwtService.js";
import { gerarNumeroProtocolo } from "../utils/protocol.js";
import { sanitizeBrazilPhoneForApi } from "../utils/phone.js";
import { sanitizeFormBodyForStorage } from "../utils/formSnapshot.js";
import { columnsFromCompraBody } from "../utils/formularioColumns.js";
import { uploadFormularioArquivosToBucket } from "../services/supabaseFormStorage.js";
import { buildProdutosResumo } from "../utils/formularioProdutosResumo.js";
import { resolveCadastroEquipe } from "../utils/formularioCadastroMeta.js";

const router = express.Router();
const MAX_ARQUIVOS_UPLOAD = 10;

/**
 * Rota para buscar cliente por NOME (campo Nome_Cliente / First_Name + Last_Name) no módulo Contacts do Zoho
 * GET /api/compra/cliente-nome/:nome
 */
router.get("/cliente-nome/:nome", async (req, res) => {
  try {
    const { nome } = req.params;
    const nomeBusca = String(nome || "").trim();

    if (!nomeBusca || nomeBusca.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Nome do cliente deve ter pelo menos 3 caracteres",
      });
    }

    console.log(
      "[COMPRA API] Buscando cliente pelo campo Nome_Cliente:",
      nomeBusca
    );

    const moduleName = "Contacts";

    const normalizarNome = (valor) =>
      String(valor || "").trim().toLowerCase();

    const extrairNomeCliente = (cliente) => {
      const bruto = cliente.Nome_Cliente;

      // Campo multi-seleção (array)
      if (Array.isArray(bruto)) {
        const nomes = bruto
          .map((item) => {
            if (!item) return "";
            if (typeof item === "string") return item;
            if (typeof item === "object") {
              return (
                item.name ||
                item.Nome ||
                item.Nome_Cliente ||
                ""
              );
            }
            return "";
          })
          .filter(Boolean);

        if (nomes.length > 0) {
          return nomes.join(" ");
        }
      }

      // Lookup único (objeto)
      if (bruto && typeof bruto === "object") {
        return (
          bruto.name ||
          bruto.Nome ||
          bruto.Nome_Cliente ||
          ""
        );
      }

      // String simples
      if (typeof bruto === "string" && bruto.trim()) {
        return bruto;
      }

      // Fallback: First_Name + Last_Name
      return `${cliente.First_Name || ""} ${
        cliente.Last_Name || ""
      }`.trim();
    };

    const buscarClientePorNome = (registros, alvoNormalizado) => {
      if (!Array.isArray(registros)) return null;
      for (const cliente of registros) {
        const tipoLead = cliente.Tipo_de_Lead || cliente.tipo_de_lead || "";
        if (tipoLead !== "Paciente") continue;

        // Nome_Cliente pode ser multi-seleção; extrai nome legível
        const nomeCampo = extrairNomeCliente(cliente);

        if (!nomeCampo) continue;

        const nomeNormalizado = normalizarNome(nomeCampo);
        if (nomeNormalizado.includes(alvoNormalizado)) {
          console.log(
            "[COMPRA API] ✓ Nome_Cliente encontrado no registro:",
            cliente.id,
            "| Nome_Cliente bruto:",
            JSON.stringify(cliente.Nome_Cliente),
            "| Nome extraído:",
            nomeCampo
          );
          return cliente;
        }
      }
      return null;
    };

    // Estratégia principal: busca com critério em Nome_Cliente + filtro de Paciente
    try {
      console.log(
        "[COMPRA API] Tentativa 1: Busca com critério em Nome_Cliente"
      );

      const criteria = `(Nome_Cliente:contains:${nomeBusca}) AND (Tipo_de_Lead:equals:Paciente)`;
      const fields =
        "id,Nome_Cliente,First_Name,Last_Name,CPF,Email,Mobile,Phone,Date_of_Birth,RG,Other_Street,Outro_Bairro,Other_City,Other_State,Other_Country,Other_Zip,Outra_Correspond_ncia,Tipo_de_Lead";
      const endpoint = `/${moduleName}?criteria=${encodeURIComponent(
        criteria
      )}&fields=${encodeURIComponent(fields)}`;

      console.log("[COMPRA API] Critério:", criteria);
      console.log("[COMPRA API] Endpoint:", endpoint);

      const response = await chamarZohoApi("GET", endpoint);
      const registros = response.data || [];

      if (registros.length > 0) {
        const alvoNormalizado = normalizarNome(nomeBusca);
        const clienteEncontrado = buscarClientePorNome(
          registros,
          alvoNormalizado
        );

        if (clienteEncontrado) {
          return res.json({
            success: true,
            data: clienteEncontrado,
          });
        }
      }
    } catch (error) {
      console.log(
        "[COMPRA API] Busca com critério por Nome_Cliente falhou:",
        error.message
      );
    }

    // Estratégia 2: varredura paralela em TODO o módulo Contacts (similar à busca por CPF)
    console.log(
      "[COMPRA API] Busca por critério não retornou resultados; iniciando varredura paralela por Nome_Cliente"
    );

    const perPage = 2000;
    const paginasParalelas = 50;
    let page = 1;
    let hasMore = true;
    const maxPaginas = 600; // margem para ~565 páginas informadas

    const camposMinimos =
      "id,Nome_Cliente,First_Name,Last_Name,CPF,Email,Mobile,Phone,Tipo_de_Lead";

    const alvoNormalizadoGlobal = normalizarNome(nomeBusca);
    let clienteEncontradoVarredura = null;

    while (hasMore && !clienteEncontradoVarredura && page <= maxPaginas) {
      try {
        const paginasParaBuscar = [];
        for (let i = 0; i < paginasParalelas && page + i <= maxPaginas; i++) {
          paginasParaBuscar.push(page + i);
        }

        console.log(
          `[COMPRA API] (Nome) Buscando páginas ${paginasParaBuscar[0]}-${paginasParaBuscar[paginasParaBuscar.length - 1]} em paralelo (${paginasParaBuscar.length} páginas)...`
        );

        const promises = paginasParaBuscar.map((p) => {
          const endpoint = `/${moduleName}?page=${p}&per_page=${perPage}&fields=${encodeURIComponent(
            camposMinimos
          )}`;
          return chamarZohoApi("GET", endpoint)
            .then((resp) => ({ page: p, data: resp.data, info: resp.info }))
            .catch((err) => {
              console.log(
                `[COMPRA API] (Nome) Erro na página ${p}:`,
                err.message
              );
              return { page: p, data: [], info: {} };
            });
        });

        const resultados = await Promise.all(promises);
        let maisRegistrosEncontrado = false;

        for (const resultado of resultados) {
          const registros = resultado.data || [];

          if (registros.length === 0) {
            continue;
          }

          console.log(
            `[COMPRA API] (Nome) Página ${resultado.page} retornou ${registros.length} registros`
          );

          const encontrado = buscarClientePorNome(
            registros,
            alvoNormalizadoGlobal
          );

          if (encontrado) {
            clienteEncontradoVarredura = encontrado;
            break;
          }

          const info = resultado.info || {};
          if (info.more_records === true) {
            maisRegistrosEncontrado = true;
          }
        }

        hasMore = maisRegistrosEncontrado;
        page += paginasParalelas;
      } catch (error) {
        console.log(
          "[COMPRA API] (Nome) Erro na varredura paralela por Nome_Cliente:",
          error.message
        );
        page += paginasParalelas;
        if (page > maxPaginas) {
          hasMore = false;
        }
      }
    }

    if (clienteEncontradoVarredura) {
      return res.json({
        success: true,
        data: clienteEncontradoVarredura,
      });
    }

    console.log(
      "[COMPRA API] ✗ Cliente não encontrado com o Nome_Cliente informado"
    );
    return res.status(404).json({
      success: false,
      error: "Cliente não encontrado com o nome informado",
    });
  } catch (error) {
    console.error("[COMPRA API] ✗ Erro ao buscar cliente por nome:", error);
    return res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao buscar cliente por nome",
      details: error.response?.data,
    });
  }
});

/**
* Rota para buscar cliente por CPF no módulo Contacts do Zoho
* GET /api/compra/cliente/:cpf
*/
router.get("/cliente/:cpf", async (req, res) => {
  try {
    const { cpf } = req.params;
    const cpfLimpo = cpf.replace(/\D/g, "");

    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return res.status(400).json({
        success: false,
        error: "CPF deve conter 11 dígitos",
      });
    }

    console.log("[COMPRA API] Buscando cliente por CPF:", cpfLimpo);

    const moduleName = "Contacts";
    let clienteEncontrado = null;
    let falhaTemporariaNasBuscasRapidas = false;

    // Função auxiliar para normalizar e comparar CPFs
    const normalizarCpf = (cpf) => {
      if (!cpf) return "";
      return cpf.toString().replace(/\D/g, "");
    };

    const formatarCpf = (valor) => {
      const limpo = String(valor || "").replace(/\D/g, "");
      if (limpo.length !== 11) return limpo;
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };

    // Função auxiliar para buscar cliente em um array de registros
    const buscarClientePorCpf = (registros) => {
      for (const cliente of registros) {
        // Verifica se é um Paciente (Tipo_de_Lead = "Paciente")
        const tipoLead = cliente.Tipo_de_Lead || cliente.tipo_de_lead || "";
        if (tipoLead !== "Paciente") {
          continue; // Pula registros que não são pacientes
        }

        // Tenta encontrar o CPF em diferentes campos possíveis
        const cpfCliente = normalizarCpf(
          cliente.CPF || cliente.cpf || cliente.CPF_Paciente || "",
        );

        if (cpfCliente === cpfLimpo) {
          console.log(
            "[COMPRA API] ✓ CPF encontrado no registro:",
            cliente.id,
            "| CPF:",
            cliente.CPF || cliente.cpf || cliente.CPF_Paciente,
            "| CPF normalizado:",
            cpfCliente,
            "| CPF buscado:",
            cpfLimpo,
            "| Tipo_de_Lead:",
            tipoLead,
          );
          return cliente;
        }
      }
      return null;
    };

    // Estratégia 1: Busca direta no endpoint de search (mais performática)
    try {
      console.log("[COMPRA API] Tentativa 1: Busca direta via /search");
      const cpfFormatado = formatarCpf(cpfLimpo);
      const fieldsCompletos =
        "id,CPF,First_Name,Last_Name,Email,Mobile,Phone,Date_of_Birth,RG,Other_Street,Outro_Bairro,Other_City,Other_State,Other_Country,Other_Zip,Outra_Correspond_ncia,Tipo_de_Lead";
      const criterios = [
        `(CPF:equals:${cpfLimpo}) AND (Tipo_de_Lead:equals:Paciente)`,
        `(CPF:equals:${cpfFormatado}) AND (Tipo_de_Lead:equals:Paciente)`,
      ];

      for (const criteria of criterios) {
        const endpoint = `/${moduleName}/search?criteria=${encodeURIComponent(criteria)}&fields=${encodeURIComponent(fieldsCompletos)}`;
        const response = await chamarZohoApi("GET", endpoint, null, {
          timeoutMs: 10000,
        });

        if (response.data && response.data.length > 0) {
          clienteEncontrado = buscarClientePorCpf(response.data);
          if (clienteEncontrado) {
            console.log(
              "[COMPRA API] ✓ Cliente encontrado via /search:",
              clienteEncontrado.id,
            );
            return res.json({
              success: true,
              data: clienteEncontrado,
            });
          }
        }
      }
    } catch (error) {
      console.log("[COMPRA API] Busca via /search falhou:", error.message);
      const status = error.response?.status;
      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED" ||
        status === 429
      ) {
        falhaTemporariaNasBuscasRapidas = true;
      }
    }

    // Estratégia 2: Tentar busca com critério otimizado (mais eficiente)
    // Usa fields para retornar apenas campos necessários
    // Filtra por CPF E Tipo_de_Lead = "Paciente"
    try {
      console.log("[COMPRA API] Tentativa 2: Busca com critério otimizado");
      const criteria = `(CPF:equals:${cpfLimpo}) AND (Tipo_de_Lead:equals:Paciente)`;
      // Campos essenciais para busca rápida
      const fields =
        "id,CPF,First_Name,Last_Name,Email,Mobile,Phone,Date_of_Birth,RG,Other_Street,Outro_Bairro,Other_City,Other_State,Other_Country,Other_Zip,Outra_Correspond_ncia,Tipo_de_Lead";
      const endpoint = `/${moduleName}?criteria=${encodeURIComponent(criteria)}&fields=${encodeURIComponent(fields)}`;

      console.log("[COMPRA API] Critério:", criteria);
      console.log("[COMPRA API] Endpoint:", endpoint);

      const response = await chamarZohoApi("GET", endpoint, null, {
        timeoutMs: 10000,
      });

      if (response.data && response.data.length > 0) {
        clienteEncontrado = buscarClientePorCpf(response.data);
        if (clienteEncontrado) {
          console.log(
            "[COMPRA API] ✓ Cliente encontrado via critério:",
            clienteEncontrado.id,
          );
          return res.json({
            success: true,
            data: clienteEncontrado,
          });
        }
      }
    } catch (error) {
      console.log("[COMPRA API] Busca com critério falhou:", error.message);
      const status = error.response?.status;
      if (
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED" ||
        status === 429
      ) {
        falhaTemporariaNasBuscasRapidas = true;
      }
    }

    if (falhaTemporariaNasBuscasRapidas) {
      console.log(
        "[COMPRA API] ⚠️ Zoho instável nas buscas rápidas. Encerrando sem fallback pesado",
      );
      return res.status(503).json({
        success: false,
        error:
          "Serviço de busca temporariamente indisponível no CRM. Tente novamente em instantes.",
      });
    }

    console.log(
      "[COMPRA API] Critério não funcionou, iniciando fallback controlado",
    );

    // Estratégia 3: Fallback controlado
    console.log("[COMPRA API] Tentativa 3: Fallback com limite de tempo");

    const perPage = 200;
    const paginasParalelas = 3;
    let page = 1;
    let hasMore = true;
    let totalPaginasProcessadas = 0;
    const maxPaginas = 15;
    const inicioBusca = Date.now();
    const timeoutBuscaMs = 8000;

    // Campos mínimos para busca rápida (id, CPF e Tipo_de_Lead para filtrar)
    const camposMinimos = "id,CPF,Tipo_de_Lead";

    while (
      hasMore &&
      !clienteEncontrado &&
      page <= maxPaginas &&
      Date.now() - inicioBusca < timeoutBuscaMs
    ) {
      try {
        // Prepara array de páginas para buscar em paralelo
        const paginasParaBuscar = [];
        for (let i = 0; i < paginasParalelas && page + i <= maxPaginas; i++) {
          paginasParaBuscar.push(page + i);
        }

        console.log(
          `[COMPRA API] Buscando páginas ${paginasParaBuscar[0]}-${paginasParaBuscar[paginasParaBuscar.length - 1]} em paralelo (${paginasParaBuscar.length} páginas)...`,
        );

        // Busca paralela com campos limitados
        const promises = paginasParaBuscar.map((p) => {
          const endpoint = `/${moduleName}?page=${p}&per_page=${perPage}&fields=${encodeURIComponent(camposMinimos)}`;
          return chamarZohoApi("GET", endpoint, null, {
            timeoutMs: 10000,
          }).catch((err) => {
            console.log(
              `[COMPRA API] Erro na página ${p} no fallback:`,
              err.message,
            );
            return { data: [], info: {} };
          });
        });

        const responses = await Promise.all(promises);

        // Processa todas as respostas em paralelo
        let encontrouNaIteracao = false;
        let maisRegistrosEncontrado = false;

        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          const paginaAtual = paginasParaBuscar[i];

          if (response.data && response.data.length > 0) {
            console.log(
              `[COMPRA API] Processando página ${paginaAtual}: ${response.data.length} registros`,
            );

            // Busca apenas pelo CPF (campos limitados)
            clienteEncontrado = buscarClientePorCpf(response.data);

            if (clienteEncontrado) {
              console.log(
                "[COMPRA API] ✓ Cliente encontrado na página",
                paginaAtual,
                ":",
                clienteEncontrado.id,
              );
              encontrouNaIteracao = true;

              // Busca dados completos do cliente encontrado
              try {
                console.log(
                  "[COMPRA API] Buscando dados completos do cliente...",
                );
                const fieldsCompletos =
                  "id,CPF,First_Name,Last_Name,Email,Mobile,Phone,Date_of_Birth,RG,Other_Street,Outro_Bairro,Other_City,Other_State,Other_Country,Other_Zip,Outra_Correspond_ncia,Tipo_de_Lead";
                const fullEndpoint = `/${moduleName}/${clienteEncontrado.id}?fields=${encodeURIComponent(fieldsCompletos)}`;
                const fullResponse = await chamarZohoApi(
                  "GET",
                  fullEndpoint,
                  null,
                  {
                    timeoutMs: 10000,
                  },
                );

                if (fullResponse.data && fullResponse.data.length > 0) {
                  clienteEncontrado = fullResponse.data[0];
                  console.log("[COMPRA API] ✓ Dados completos obtidos");
                }
              } catch (error) {
                console.log(
                  "[COMPRA API] ⚠️ Não foi possível buscar dados completos, usando dados parciais:",
                  error.message,
                );
                // Continua com dados parciais (pelo menos temos id e CPF)
              }

              break; // Sai do loop quando encontra
            }

            totalPaginasProcessadas++;

            // Verifica se há mais páginas (verifica todas as respostas)
            const info = response.info || {};
            if (info.more_records === true) {
              maisRegistrosEncontrado = true;
            } else if (info.more_records === false) {
              console.log(
                `[COMPRA API] Página ${paginaAtual} indica que não há mais registros`,
              );
            }
          } else {
            console.log(
              `[COMPRA API] Página ${paginaAtual} retornou sem dados`,
            );
          }
        }

        // Atualiza hasMore baseado em todas as respostas
        hasMore = maisRegistrosEncontrado;

        // Se encontrou, sai do loop principal
        if (encontrouNaIteracao) {
          break;
        }

        if (clienteEncontrado) {
          break; // Sai do loop principal quando encontra
        }

        // Avança para o próximo grupo de páginas
        page += paginasParalelas;

        if (!hasMore) {
          break;
        }
      } catch (error) {
        console.error(
          `[COMPRA API] Erro ao buscar páginas em paralelo:`,
          error.message,
        );
        // Continua para próximo grupo mesmo em caso de erro
        page += paginasParalelas;
        if (page > maxPaginas) {
          hasMore = false;
        }
      }
    }

    if (Date.now() - inicioBusca >= timeoutBuscaMs && !clienteEncontrado) {
      console.log("[COMPRA API] ⚠️ Timeout do fallback de CPF atingido");
    }

    if (page > maxPaginas && !clienteEncontrado) {
      console.log(
        "[COMPRA API] ⚠️ Limite de páginas atingido sem encontrar o cliente",
      );
    }

    if (clienteEncontrado) {
      res.json({
        success: true,
        data: clienteEncontrado,
      });
    } else {
      console.log("[COMPRA API] ✗ Cliente não encontrado após busca completa");
      res.status(404).json({
        success: false,
        error: "Cliente não encontrado com o CPF informado",
      });
    }
  } catch (error) {
    console.error("[COMPRA API] ✗ Erro ao buscar cliente:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao buscar cliente",
      details: error.response?.data,
    });
  }
});

/**
 * Rota para criar uma nova compra no módulo Portal_onix do Zoho
 * POST /api/compra
 * Body: dados da compra
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
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
      cep,
      pais,
      complemento,
      atualizacaoEnderecoViaPortal,
      produtos,
      consultorTegra,
      tipoSolicitacao,
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
      // Arquivos para upload
      arquivos,
    } = req.body;

    console.log("[COMPRA API] Criando nova compra no Zoho");
    console.log("[COMPRA API] Dados recebidos:", {
      nomePaciente,
      sobrenomePaciente,
      celularPaciente,
      produtos: produtos?.length || 0,
    });
    console.log(
      "[COMPRA API] Produtos recebidos do frontend:",
      JSON.stringify(produtos, null, 2),
    );

    // Validação básica (somente campos essenciais do paciente)
    if (!nomePaciente || !sobrenomePaciente || !celularPaciente) {
      return res.status(400).json({
        success: false,
        error: "Nome, Sobrenome e Celular são obrigatórios",
      });
    }

    if (!produtos || produtos.length === 0) {
      return res.status(400).json({
        success: false,
        error: "É necessário adicionar pelo menos um produto",
      });
    }

    if (Array.isArray(arquivos) && arquivos.length > MAX_ARQUIVOS_UPLOAD) {
      return res.status(400).json({
        success: false,
        error: `Máximo de ${MAX_ARQUIVOS_UPLOAD} arquivos permitidos`,
      });
    }

    // Combina Rua + Número
    const ruaCompleta = numero ? `${rua}, ${numero}` : rua;

    // Formata a data de nascimento para o formato esperado pelo Zoho (YYYY-MM-DD)
    let dataNascimentoFormatada = null;
    if (dataNascimento) {
      // Se já estiver no formato YYYY-MM-DD, usa direto
      if (dataNascimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dataNascimentoFormatada = dataNascimento;
      } else {
        // Tenta converter de DD/MM/YYYY para YYYY-MM-DD
        const partes = dataNascimento.split("/");
        if (partes.length === 3) {
          dataNascimentoFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
        } else {
          dataNascimentoFormatada = dataNascimento;
        }
      }
    }

    // Prepara o subformulário de produtos
    // O campo Produto no Zoho é um campo de linha única (texto), então enviamos o nome
    const produtosSubform = produtos
      .filter((produto) => produto.nome && produto.nome.trim()) // Filtra apenas produtos com nome válido
      .map((produto) => ({
        Produto: produto.nome, // Nome do produto (campo de linha única)
        Quantidade: produto.quantidade || "1",
      }));

    console.log(
      "[COMPRA API] Produtos subform (enviando nomes para Zoho):",
      JSON.stringify(produtosSubform, null, 2),
    );

    // Formata a data de nascimento do representante
    let dataNascimentoRepresentanteFormatada = null;
    if (dataNascimentoRepresentante) {
      if (dataNascimentoRepresentante.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dataNascimentoRepresentanteFormatada = dataNascimentoRepresentante;
      } else {
        const partes = dataNascimentoRepresentante.split("/");
        if (partes.length === 3) {
          dataNascimentoRepresentanteFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
        } else {
          dataNascimentoRepresentanteFormatada = dataNascimentoRepresentante;
        }
      }
    }

    // Gera o número de protocolo único
    const numeroProtocolo = gerarNumeroProtocolo();
    console.log("[COMPRA API] Número de protocolo gerado:", numeroProtocolo);

    const enderecoAtualizadoViaPortal = Boolean(atualizacaoEnderecoViaPortal);

    const formatarZohoDateTime = (data) => {
      const date = data instanceof Date ? data : new Date(data);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      const pad = (valor) => String(valor).padStart(2, "0");
      const offsetMinutos = -date.getTimezoneOffset();
      const sinal = offsetMinutos >= 0 ? "+" : "-";
      const offsetAbsoluto = Math.abs(offsetMinutos);
      const horasOffset = pad(Math.floor(offsetAbsoluto / 60));
      const minutosOffset = pad(offsetAbsoluto % 60);

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sinal}${horasOffset}:${minutosOffset}`;
    };

    // Prepara os dados para o Zoho
    const dadosZoho = {
      data: [
        {
          Protocolo_Portal: numeroProtocolo,
          Name: nomePaciente || "",
          Sobrenome: sobrenomePaciente || "",
          CPF: cpfPaciente?.replace(/\D/g, "") || "",
          Data_de_Nascimento: dataNascimentoFormatada,
          Email: emailPaciente || "",
          RG: rgPaciente || "",
          Celular: sanitizeBrazilPhoneForApi(celularPaciente),
          Telefone: telefonePaciente?.replace(/\D/g, "") || "",
          Rua: ruaCompleta || "",
          Bairro: bairro || "",
          Cidade: cidade || "",
          Estado: estado || "",
          CEP: cep?.replace(/\D/g, "") || "",
          Pa_s: pais || "Brasil",
          Complemento: complemento || "",
          Atualizacao_Endereco_Via_Portal: enderecoAtualizadoViaPortal,
          Nome_Usuario_Atualizacao_Endereco: enderecoAtualizadoViaPortal
            ? consultorTegra || ""
            : "",
          Data_Atualizacao_Endereco_ViaPortal: enderecoAtualizadoViaPortal
            ? formatarZohoDateTime(new Date())
            : null,
          Tipo_Cliente: "Pessoa Fisica",
          Tipo_de_pedido: tipoSolicitacao || "1ª Compra",
          Consultor_Tegra: consultorTegra || "",
          Produtos_Portal_Onix: produtosSubform,
          // Campos do representante legal
          Representante_legal: temRepresentanteLegal || false,
          Nome_do_representante_legal: nomeRepresentante || "",
          RG_do_representante_legal: rgRepresentante || "",
          E_mail_do_representante_legal: emailRepresentante || "",
          Data_de_nascimento_do_representante_legal: dataNascimentoRepresentanteFormatada,
          CPF_do_representante_legal: cpfRepresentante?.replace(/\D/g, "") || "",
          Celular_Representante_Legal: sanitizeBrazilPhoneForApi(celularRepresentante),
          // Campos do novo médico prescritor
          Dados_do_novo_m_dico_prescritor: temNovoMedicoPrescritor || false,
          Celular_do_m_dico: sanitizeBrazilPhoneForApi(celularMedico),
          CRM_do_m_dico: crmMedico || "",
          E_mail_2: emailMedico || "",
          Especialidade_do_m_dico: especialidadeMedico || "",
          Nome_do_m_dico: nomeMedico || "",
          UF_do_CRM: ufCrm || "",
          // Campos de negociação
          Negocia_o_feita_pelo_consultor1: negociacaoFeitaPeloConsultor || false,
          Solicitar_Link_de_Pagamento: solicitarLinkPagamento || "",
          Tipo_de_link: tipoLink || "",
          // Campanha Diretoria
          Campanha_Diretoria: campanhaDiretoria || false,
          // Campos de pagamento
          Forma_de_Pagamento: formaPagamento || "",
          Termos_e_condi_es: termosCondicoesPagamento || "",
          // Campo de observação
          Observa_es: observacao || "",
          // Campo de documentos completos
          Documentos_Completos: documentosCompletos || false,
        },
      ],
    };

    console.log(
      "[COMPRA API] Dados formatados para Zoho:",
      JSON.stringify(dadosZoho, null, 2),
    );

    // Chama a API do Zoho para criar o registro
    const moduleName = "Portal_onix";
    const endpoint = `/${moduleName}`;
    const response = await chamarZohoApi("POST", endpoint, dadosZoho);

    const resultadoZoho = response.data?.[0];
    const recordId = resultadoZoho?.details?.id;

    if (!resultadoZoho || resultadoZoho.status === "error" || !recordId) {
      const zohoMessage =
        resultadoZoho?.message ||
        response.message ||
        "Zoho não retornou confirmação de criação do registro";

      console.error("[COMPRA API] ✗ Zoho rejeitou a criação da compra:", {
        protocolo: numeroProtocolo,
        response,
      });

      return res.status(502).json({
        success: false,
        error: zohoMessage,
        protocolo: numeroProtocolo,
        details: resultadoZoho?.details || response,
      });
    }

    console.log("[COMPRA API] ✓ Compra criada com sucesso no Zoho");
    console.log("[COMPRA API] ID do registro:", recordId);

    // Faz upload dos arquivos se houver
    let arquivosAnexados = [];
    if (arquivos && arquivos.length > 0 && recordId) {
      try {
        console.log(
          `[COMPRA API] Fazendo upload de ${arquivos.length} arquivo(s)...`,
        );
        const arquivosParaUpload = arquivos.map((arquivo) => ({
          buffer: Buffer.from(arquivo.base64, "base64"),
          fileName: arquivo.fileName,
          contentType: arquivo.contentType || "application/octet-stream",
        }));

        arquivosAnexados = await anexarArquivosNoRegistro({
          moduleName,
          recordId,
          arquivos: arquivosParaUpload,
        });

        console.log(
          `[COMPRA API] ✓ Upload concluído: ${arquivosAnexados.filter((a) => a.success).length}/${arquivos.length} arquivo(s) anexado(s) com sucesso`,
        );
      } catch (error) {
        console.error(
          "[COMPRA API] ⚠️ Erro ao fazer upload de arquivos (registro criado, mas arquivos não anexados):",
          error.message,
        );
        // Não falha a requisição se o upload de arquivos falhar
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase && recordId) {
      try {
        const formulario = sanitizeFormBodyForStorage(req.body);
        const table =
          String(tipoSolicitacao || "").trim() === "Recompra"
            ? "recompras"
            : "compras";
        const pastaRaiz =
          String(tipoSolicitacao || "").trim() === "Recompra"
            ? "Recompra"
            : "Compra";

        const { paths: anexosStorage, errors: storageErrors } =
          await uploadFormularioArquivosToBucket(supabase, {
            pastaRaiz,
            protocolo: numeroProtocolo,
            arquivos: arquivos || [],
          });
        if (storageErrors.length) {
          console.error(
            "[COMPRA API] Upload de anexos para o bucket Supabase:",
            storageErrors,
          );
        }

        const resumoProd = await buildProdutosResumo(supabase, produtos || []);
        const cadastro = await resolveCadastroEquipe(supabase, req);

        const { error: dbErr } = await supabase.from(table).insert({
          protocolo_portal: numeroProtocolo,
          zoho_record_id: String(recordId),
          formulario,
          anexos_storage: anexosStorage,
          produtos_linhas: resumoProd.linhas,
          valor_total: resumoProd.valor_total,
          quantidade_produtos: resumoProd.quantidade_produtos,
          ...cadastro,
          ...columnsFromCompraBody(req.body),
        });
        if (dbErr) {
          console.error(
            `[COMPRA API] Erro ao salvar cópia do formulário em ${table}:`,
            dbErr,
          );
        }
      } catch (persistErr) {
        console.error(
          "[COMPRA API] Erro ao persistir formulário no banco local:",
          persistErr,
        );
      }
    }

    res.json({
      success: true,
      message: "Compra criada com sucesso",
      protocolo: numeroProtocolo,
      data: {
        id: recordId,
        ...response.data?.[0]?.details,
      },
      arquivosAnexados: arquivosAnexados,
    });
  } catch (error) {
    console.error("[COMPRA API] ✗ Erro ao criar compra:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao criar compra no Zoho",
      details: error.response?.data,
    });
  }
});

export default router;
