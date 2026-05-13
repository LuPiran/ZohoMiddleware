import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";
import { ENV } from "../config/env.js";
import { anexarArquivosNoRegistro } from "../services/zohoAttachment.js";
import { applyZohoFieldConstraints } from "../services/zohoFieldConstraints.js";
import { parseZohoCreateResponse } from "../services/zohoSubmissionResult.js";
import { gerarNumeroProtocolo } from "../utils/protocol.js";
import { sanitizeBrazilPhoneForApi } from "../utils/phone.js";

const router = express.Router();
const MAX_ARQUIVOS_UPLOAD = 10;

/**
 * Rota para buscar cliente por CPF no módulo Contacts do Zoho
 * GET /api/proposta/cliente/:cpf
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

    console.log("[PROPOSTA API] Buscando cliente por CPF:", cpfLimpo);

    const moduleName = "Contacts";
    let clienteEncontrado = null;

    // Função auxiliar para normalizar e comparar CPFs
    const normalizarCpf = (cpf) => {
      if (!cpf) return "";
      return cpf.toString().replace(/\D/g, "");
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
            "[PROPOSTA API] ✓ CPF encontrado no registro:",
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

    // Estratégia 1: Tentar busca com critério otimizado (mais eficiente)
    // Usa fields para retornar apenas campos necessários
    // Filtra por CPF E Tipo_de_Lead = "Paciente"
    try {
      console.log("[PROPOSTA API] Tentativa 1: Busca com critério otimizado");
      const criteria = `(CPF:equals:${cpfLimpo}) AND (Tipo_de_Lead:equals:Paciente)`;
      // Campos essenciais para busca rápida
      const fields =
        "id,CPF,First_Name,Last_Name,Email,Mobile,Phone,Date_of_Birth,RG,Other_Street,Outro_Bairro,Other_City,Other_State,Other_Country,Other_Zip,Outra_Correspond_ncia,Tipo_de_Lead";
      const endpoint = `/${moduleName}?criteria=${encodeURIComponent(criteria)}&fields=${encodeURIComponent(fields)}`;

      console.log("[PROPOSTA API] Critério:", criteria);
      console.log("[PROPOSTA API] Endpoint:", endpoint);

      const response = await chamarZohoApi("GET", endpoint);

      if (response.data && response.data.length > 0) {
        clienteEncontrado = buscarClientePorCpf(response.data);
        if (clienteEncontrado) {
          console.log(
            "[PROPOSTA API] ✓ Cliente encontrado via critério:",
            clienteEncontrado.id,
          );
          return res.json({
            success: true,
            data: clienteEncontrado,
          });
        }
      }
    } catch (error) {
      console.log("[PROPOSTA API] Busca com critério falhou:", error.message);
    }

    console.log(
      "[PROPOSTA API] Critério não funcionou, iniciando busca paralela otimizada",
    );

    // Estratégia 2: Busca paralela otimizada
    // Busca múltiplas páginas simultaneamente com campos limitados
    console.log(
      "[PROPOSTA API] Tentativa 2: Busca paralela com campos limitados",
    );

    const perPage = 2000;
    const paginasParalelas = 50; // Busca 50 páginas em paralelo por vez (otimizado para máxima velocidade)
    let page = 1;
    let hasMore = true;
    let totalPaginasProcessadas = 0;
    const maxPaginas = 500; // Ajustado para 498 páginas + margem de segurança

    // Campos mínimos para busca rápida (id, CPF e Tipo_de_Lead para filtrar)
    const camposMinimos = "id,CPF,Tipo_de_Lead";

    while (hasMore && !clienteEncontrado && page <= maxPaginas) {
      try {
        // Prepara array de páginas para buscar em paralelo
        const paginasParaBuscar = [];
        for (let i = 0; i < paginasParalelas && page + i <= maxPaginas; i++) {
          paginasParaBuscar.push(page + i);
        }

        console.log(
          `[PROPOSTA API] Buscando páginas ${paginasParaBuscar[0]}-${paginasParaBuscar[paginasParaBuscar.length - 1]} em paralelo (${paginasParaBuscar.length} páginas)...`,
        );

        // Busca paralela com campos limitados
        // Tenta primeiro com campos limitados, se falhar tenta sem campos
        const promises = paginasParaBuscar.map((p) => {
          const endpoint = `/${moduleName}?page=${p}&per_page=${perPage}&fields=${encodeURIComponent(camposMinimos)}`;
          return chamarZohoApi("GET", endpoint).catch((err) => {
            console.log(
              `[PROPOSTA API] Erro na página ${p} com campos limitados, tentando sem campos:`,
              err.message,
            );
            // Se falhar com campos limitados, tenta sem campos
            const endpointSemCampos = `/${moduleName}?page=${p}&per_page=${perPage}`;
            return chamarZohoApi("GET", endpointSemCampos).catch((err2) => {
              console.error(`[PROPOSTA API] Erro na página ${p}:`, err2.message);
              return { data: [], info: {} };
            });
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
              `[PROPOSTA API] Processando página ${paginaAtual}: ${response.data.length} registros`,
            );

            // Busca apenas pelo CPF (campos limitados)
            clienteEncontrado = buscarClientePorCpf(response.data);

            if (clienteEncontrado) {
              console.log(
                "[PROPOSTA API] ✓ Cliente encontrado na página",
                paginaAtual,
                ":",
                clienteEncontrado.id,
              );
              encontrouNaIteracao = true;

              // Busca dados completos do cliente encontrado
              try {
                console.log(
                  "[PROPOSTA API] Buscando dados completos do cliente...",
                );
                const fieldsCompletos =
                  "id,CPF,First_Name,Last_Name,Email,Mobile,Phone,Date_of_Birth,RG,Other_Street,Outro_Bairro,Other_City,Other_State,Other_Country,Other_Zip,Outra_Correspond_ncia,Tipo_de_Lead";
                const fullEndpoint = `/${moduleName}/${clienteEncontrado.id}?fields=${encodeURIComponent(fieldsCompletos)}`;
                const fullResponse = await chamarZohoApi("GET", fullEndpoint);

                if (fullResponse.data && fullResponse.data.length > 0) {
                  clienteEncontrado = fullResponse.data[0];
                  console.log("[PROPOSTA API] ✓ Dados completos obtidos");
                }
              } catch (error) {
                console.log(
                  "[PROPOSTA API] ⚠️ Não foi possível buscar dados completos, usando dados parciais:",
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
                `[PROPOSTA API] Página ${paginaAtual} indica que não há mais registros`,
              );
            }
          } else {
            console.log(
              `[PROPOSTA API] Página ${paginaAtual} retornou sem dados`,
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
          `[PROPOSTA API] Erro ao buscar páginas em paralelo:`,
          error.message,
        );
        // Continua para próximo grupo mesmo em caso de erro
        page += paginasParalelas;
        if (page > maxPaginas) {
          hasMore = false;
        }
      }
    }

    if (page > maxPaginas && !clienteEncontrado) {
      console.log(
        "[PROPOSTA API] ⚠️ Limite de páginas atingido sem encontrar o cliente",
      );
    }

    if (clienteEncontrado) {
      res.json({
        success: true,
        data: clienteEncontrado,
      });
    } else {
      console.log("[PROPOSTA API] ✗ Cliente não encontrado após busca completa");
      res.status(404).json({
        success: false,
        error: "Cliente não encontrado com o CPF informado",
      });
    }
  } catch (error) {
    console.error("[PROPOSTA API] ✗ Erro ao buscar cliente:", error);
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
 * Rota para criar uma nova proposta no módulo Portal_onix do Zoho
 * POST /api/proposta
 * Body: dados da proposta
 */
router.post("/", async (req, res) => {
  try {
    const {
      tipoCliente,
      // Campos da empresa
      nomeEmpresa,
      cnpjEmpresa,
      emailEmpresa,
      telefoneEmpresa,
      temRepresentanteEmpresa,
      nomeRepresentanteEmpresa,
      emailRepresentanteEmpresa,
      celularRepresentanteEmpresa,
      // Campos do paciente
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

    console.log("[PROPOSTA API] Criando nova proposta no Zoho");
    console.log("[PROPOSTA API] Dados recebidos:", {
      tipoCliente,
      nomePaciente,
      sobrenomePaciente,
      celularPaciente,
      produtos: produtos?.length || 0,
    });
    console.log(
      "[PROPOSTA API] Produtos recebidos do frontend:",
      JSON.stringify(produtos, null, 2),
    );

    // Validação básica baseada no tipo de cliente
    if (tipoCliente === "Pessoa Juridica") {
      if (!nomeEmpresa || !cnpjEmpresa || !emailEmpresa) {
        return res.status(400).json({
          success: false,
          error: "Nome da Empresa, CNPJ e Email são obrigatórios",
        });
      }
    } else {
      // Pessoa Física: apenas campos essenciais do paciente
      if (!nomePaciente || !sobrenomePaciente || !celularPaciente) {
        return res.status(400).json({
          success: false,
          error: "Nome, Sobrenome e Celular são obrigatórios",
        });
      }
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
      "[PROPOSTA API] Produtos subform (enviando nomes para Zoho):",
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
    console.log("[PROPOSTA API] Número de protocolo gerado:", numeroProtocolo);

    // Prepara os dados para o Zoho
    const dadosZoho = {
      data: [
        {
          // Número de protocolo
          Protocolo_Portal: numeroProtocolo,
          // Campos comuns ou específicos baseados no tipo de cliente
          Name: tipoCliente === "Pessoa Juridica" ? (nomeEmpresa || "") : (nomePaciente || ""),
          Sobrenome: tipoCliente === "Pessoa Juridica" ? "" : (sobrenomePaciente || ""),
          CPF: tipoCliente === "Pessoa Juridica" ? "" : (cpfPaciente?.replace(/\D/g, "") || ""),
          CNPJ: tipoCliente === "Pessoa Juridica" ? (cnpjEmpresa?.replace(/\D/g, "") || "") : "",
          Data_de_Nascimento: tipoCliente === "Pessoa Juridica" ? null : dataNascimentoFormatada,
          Email: tipoCliente === "Pessoa Juridica" ? (emailEmpresa || "") : (emailPaciente || ""),
          RG: tipoCliente === "Pessoa Juridica" ? "" : (rgPaciente || ""),
          Celular: tipoCliente === "Pessoa Juridica" ? "" : sanitizeBrazilPhoneForApi(celularPaciente),
          Telefone: tipoCliente === "Pessoa Juridica" ? (telefoneEmpresa?.replace(/\D/g, "") || "") : (telefonePaciente?.replace(/\D/g, "") || ""),
          Rua: ruaCompleta || "",
          Bairro: bairro || "",
          Cidade: cidade || "",
          Estado: estado || "",
          CEP: cep?.replace(/\D/g, "") || "",
          Pa_s: pais || "Brasil",
          Complemento: complemento || "",
          Tipo_Cliente: tipoCliente || "Pessoa Fisica",
          Tipo_de_pedido: tipoSolicitacao || "1ª Compra",
          Consultor_Tegra: consultorTegra || "",
          Produtos_Portal_Onix: produtosSubform,
          // Campos do representante da empresa
          Representante: tipoCliente === "Pessoa Juridica" ? (temRepresentanteEmpresa || false) : false,
          Nome_do_representante: tipoCliente === "Pessoa Juridica" ? (nomeRepresentanteEmpresa || "") : "",
          E_mail_do_representante: tipoCliente === "Pessoa Juridica" ? (emailRepresentanteEmpresa || "") : "",
          Celular_do_representante: tipoCliente === "Pessoa Juridica" ? sanitizeBrazilPhoneForApi(celularRepresentanteEmpresa) : "",
          // Campos do representante legal (apenas para Pessoa Física)
          Representante_legal: tipoCliente === "Pessoa Fisica" ? (temRepresentanteLegal || false) : false,
          Nome_do_representante_legal: tipoCliente === "Pessoa Fisica" ? (nomeRepresentante || "") : "",
          RG_do_representante_legal: tipoCliente === "Pessoa Fisica" ? (rgRepresentante || "") : "",
          E_mail_do_representante_legal: tipoCliente === "Pessoa Fisica" ? (emailRepresentante || "") : "",
          Data_de_nascimento_do_representante_legal: tipoCliente === "Pessoa Fisica" ? dataNascimentoRepresentanteFormatada : null,
          CPF_do_representante_legal: tipoCliente === "Pessoa Fisica" ? (cpfRepresentante?.replace(/\D/g, "") || "") : "",
          Celular_Representante_Legal: tipoCliente === "Pessoa Fisica" ? sanitizeBrazilPhoneForApi(celularRepresentante) : "",
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
      "[PROPOSTA API] Dados formatados para Zoho:",
      JSON.stringify(dadosZoho, null, 2),
    );

    const constraintCheck = applyZohoFieldConstraints(
      "Portal_onix",
      dadosZoho.data[0],
    );

    if (constraintCheck.hasBlockingErrors) {
      return res.status(400).json({
        success: false,
        error:
          "Um ou mais campos ultrapassaram o limite de caracteres permitido para envio ao CRM.",
        details: constraintCheck.errors,
      });
    }

    if (constraintCheck.warnings.length > 0) {
      console.warn(
        "[PROPOSTA API] Campos truncados por limite de caracteres:",
        constraintCheck.warnings,
      );
    }

    dadosZoho.data[0] = constraintCheck.data;

    // Chama a API do Zoho para criar o registro
    const moduleName = "Portal_onix";
    const endpoint = `/${moduleName}`;
    const response = await chamarZohoApi("POST", endpoint, dadosZoho);

    const submission = parseZohoCreateResponse(response);
    const recordId = submission.recordId;

    if (!submission.confirmed) {
      console.error("[PROPOSTA API] ✗ Zoho nao confirmou criacao da proposta", {
        protocolo: numeroProtocolo,
        submission,
      });

      return res.status(502).json({
        success: false,
        confirmedInZoho: false,
        protocolo: numeroProtocolo,
        error:
          submission.message ||
          "Zoho nao confirmou o recebimento da proposta.",
        zoho: {
          status: submission.status,
          code: submission.code,
          recordId: submission.recordId,
        },
      });
    }

    console.log("[PROPOSTA API] ✓ Proposta criada com sucesso no Zoho");
    console.log("[PROPOSTA API] ID do registro:", recordId);

    // Faz upload dos arquivos se houver
    let arquivosAnexados = [];
    if (arquivos && arquivos.length > 0 && recordId) {
      try {
        console.log(
          `[PROPOSTA API] Fazendo upload de ${arquivos.length} arquivo(s)...`,
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
          `[PROPOSTA API] ✓ Upload concluído: ${arquivosAnexados.filter((a) => a.success).length}/${arquivos.length} arquivo(s) anexado(s) com sucesso`,
        );
      } catch (error) {
        console.error(
          "[PROPOSTA API] ⚠️ Erro ao fazer upload de arquivos (registro criado, mas arquivos não anexados):",
          error.message,
        );
        // Não falha a requisição se o upload de arquivos falhar
      }
    }

    res.json({
      success: true,
      confirmedInZoho: true,
      message: "Proposta criada com sucesso",
      protocolo: numeroProtocolo,
      data: {
        id: recordId,
        ...response.data?.[0]?.details,
      },
      arquivosAnexados: arquivosAnexados,
    });
  } catch (error) {
    console.error("[PROPOSTA API] ✗ Erro ao criar proposta:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao criar proposta no Zoho",
      details: error.response?.data,
    });
  }
});

export default router;
