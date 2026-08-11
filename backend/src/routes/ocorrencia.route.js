import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";
import { ENV } from "../config/env.js";
import { anexarArquivosNoRegistro } from "../services/zohoAttachment.js";
import { applyZohoFieldConstraints } from "../services/zohoFieldConstraints.js";
import { parseZohoCreateResponse } from "../services/zohoSubmissionResult.js";
import { gerarNumeroProtocolo } from "../utils/protocol.js";
import { sanitizeBrazilPhoneForApi } from "../utils/phone.js";
import { writeRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const MAX_ARQUIVOS_UPLOAD = 10;

/**
 * Rota para criar uma nova ocorrência no módulo Ocorrencias do Zoho
 * POST /api/ocorrencia
 * Body: dados da ocorrência
 */
router.post("/", writeRateLimiter, async (req, res) => {
  try {
    const {
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
      produtos,
      numeroPedido,
      awb,
      numeroLote,
      dataPedido,
      dataValidade,
      arquivos,
    } = req.body;

    console.log("[OCORRENCIA API] Criando nova ocorrência no Zoho");
    console.log("[OCORRENCIA API] Dados recebidos:", {
      nomePaciente,
      sobrenomePaciente,
      celularPaciente,
      nomeConsultor,
      motivoOcorrencia,
    });

    // Validação básica: apenas campos essenciais do paciente + motivo
    if (!nomePaciente || !sobrenomePaciente || !celularPaciente) {
      return res.status(400).json({
        success: false,
        error: "Nome, Sobrenome e Celular são obrigatórios",
      });
    }

    if (!motivoOcorrencia) {
      return res.status(400).json({
        success: false,
        error: "Motivo da Ocorrência é obrigatório",
      });
    }

    if (!String(observacaoMotivo || "").trim()) {
      return res.status(400).json({
        success: false,
        error: "Observação é obrigatória",
      });
    }

    if (Array.isArray(arquivos) && arquivos.length > MAX_ARQUIVOS_UPLOAD) {
      return res.status(400).json({
        success: false,
        error: `Máximo de ${MAX_ARQUIVOS_UPLOAD} arquivos permitidos`,
      });
    }

    // Formata a data do pedido para o formato esperado pelo Zoho (YYYY-MM-DD)
    let dataPedidoFormatada = null;
    if (dataPedido) {
      if (dataPedido.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dataPedidoFormatada = dataPedido;
      } else {
        try {
          const dataObj = new Date(dataPedido);
          if (!isNaN(dataObj.getTime())) {
            dataPedidoFormatada = dataObj.toISOString().split("T")[0];
          }
        } catch (error) {
          console.error("[OCORRENCIA API] Erro ao formatar data do pedido:", error);
        }
      }
    }

    // Formata a data de validade para o formato esperado pelo Zoho (YYYY-MM-DD)
    let dataValidadeFormatada = null;
    if (dataValidade) {
      if (dataValidade.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dataValidadeFormatada = dataValidade;
      } else {
        try {
          const dataObj = new Date(dataValidade);
          if (!isNaN(dataObj.getTime())) {
            dataValidadeFormatada = dataObj.toISOString().split("T")[0];
          }
        } catch (error) {
          console.error("[OCORRENCIA API] Erro ao formatar data de validade:", error);
        }
      }
    }

    // Remove formatação do CPF
    const cpfLimpo = cpfPaciente ? cpfPaciente.replace(/\D/g, "") : "";

    // Remove formatação do celular
    const celularLimpo = sanitizeBrazilPhoneForApi(celularPaciente);

    // Remove formatação do celular do médico
    const celularMedicoLimpo = sanitizeBrazilPhoneForApi(celularMedico);

    // Remove formatação do número do pedido
    const numeroPedidoLimpo = numeroPedido
      ? numeroPedido.replace(/\D/g, "")
      : "";

    // Gera o número de protocolo único
    const numeroProtocolo = gerarNumeroProtocolo();
    console.log("[OCORRENCIA API] Número de protocolo gerado:", numeroProtocolo);

    // Extrai nomes dos produtos (concatenados com vírgula)
    const nomeProduto = Array.isArray(produtos) && produtos.length > 0
      ? produtos
          .filter(p => p && p.Nome_do_Produto)
          .map(p => String(p.Nome_do_Produto).trim())
          .join(", ")
      : "";

    // Soma as quantidades dos produtos (Zoho espera integer)
    const quantidadeProduto = Array.isArray(produtos) && produtos.length > 0
      ? produtos
          .filter(p => p && p.Quantidade)
          .reduce((sum, p) => sum + (parseInt(p.Quantidade, 10) || 0), 0)
      : 0;

    // Prepara os dados para o Zoho
    const dadosZoho = {
      data: [
        {
          Protocolo_Portal: numeroProtocolo,
          Primeiro_Nome: nomePaciente || "",
          Segundo_Nome: sobrenomePaciente || "",
          CPF_Cliente: cpfLimpo || "",
          Celular_Cliente: celularLimpo || "",
          E_mail_do_Cliente: emailPaciente || "",
          Nome_consultor_Tegra: String(nomeConsultor || "").trim(),
          Name: motivoOcorrencia || "",
          Observa_es_Ocorr_ncia: observacaoMotivo || "",
          M_dico_Prescritor_Portal: nomeMedico || "",
          E_mail_do_M_dico: emailMedico || "",
          UF_do_M_dico: ufCrm || "",
          Telefone_do_M_dico: celularMedicoLimpo || "",
          CRM_do_M_dico: crmMedico || "",
          Nome_Produto: nomeProduto || "",
          Quantidade_Produto: quantidadeProduto,
          Pre_o_Unit_rio:
            Array.isArray(produtos) && produtos.length > 0 && produtos[0]?.Pre_o_Unit_rio
              ? (() => {
                  const preco = produtos[0].Pre_o_Unit_rio;
                  // Remove "R$" e espaços, depois trata pontos e vírgulas
                  let precoLimpo = String(preco)
                    .replace(/R\$/g, "")
                    .replace(/\s/g, "")
                    .trim();
                  
                  // Se tem vírgula, assume formato brasileiro (X.XXX,XX)
                  if (precoLimpo.includes(",")) {
                    // Remove pontos (milhares) e substitui vírgula por ponto (decimal)
                    precoLimpo = precoLimpo.replace(/\./g, "").replace(",", ".");
                  }
                  
                  // Remove tudo que não é número ou ponto
                  precoLimpo = precoLimpo.replace(/[^\d.]/g, "");
                  
                  const precoNumero = parseFloat(precoLimpo);
                  return isNaN(precoNumero) ? 0 : precoNumero;
                })()
              : 0,
          Invoice_Pedido: numeroPedidoLimpo || "",
          AWB: awb || "",
          N_mero_de_lote: numeroLote || "",
          Data_do_pedido: dataPedidoFormatada || null,
          Data_Validade: dataValidadeFormatada || null,
          Status_da_Ocorr_ncia2: {
            name: "Criado"
          },
        },
      ],
    };

    console.log(
      "[OCORRENCIA API] Dados formatados para Zoho:",
      JSON.stringify(dadosZoho, null, 2),
    );

    const constraintCheck = applyZohoFieldConstraints(
      "Ocorrencias",
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
        "[OCORRENCIA API] Campos truncados por limite de caracteres:",
        constraintCheck.warnings,
      );
    }

    dadosZoho.data[0] = constraintCheck.data;

    // Chama a API do Zoho para criar o registro
    const moduleName = "Ocorrencias";
    const endpoint = `/${moduleName}`;
    const response = await chamarZohoApi("POST", endpoint, dadosZoho);

    const submission = parseZohoCreateResponse(response);
    const recordId = submission.recordId;

    if (!submission.confirmed) {
      console.error("[OCORRENCIA API] ✗ Zoho nao confirmou criacao da ocorrencia", {
        protocolo: numeroProtocolo,
        submission,
      });

      return res.status(502).json({
        success: false,
        confirmedInZoho: false,
        protocolo: numeroProtocolo,
        error:
          submission.message ||
          "Zoho nao confirmou o recebimento da ocorrencia.",
        zoho: {
          status: submission.status,
          code: submission.code,
          recordId: submission.recordId,
        },
      });
    }

    console.log("[OCORRENCIA API] ✓ Ocorrência criada com sucesso no Zoho");
    console.log("[OCORRENCIA API] ID do registro:", recordId);

    // Faz upload dos arquivos se houver
    let arquivosAnexados = [];
    if (arquivos && arquivos.length > 0 && recordId) {
      try {
        console.log(
          `[OCORRENCIA API] Fazendo upload de ${arquivos.length} arquivo(s)`,
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
          `[OCORRENCIA API] ✓ Upload concluído: ${arquivosAnexados.filter((a) => a.success).length}/${arquivos.length} arquivo(s) anexado(s) com sucesso`,
        );
      } catch (error) {
        console.error(
          "[OCORRENCIA API] ⚠️ Erro ao fazer upload de arquivos (registro criado, mas arquivos não anexados):",
          error.message,
        );
        // Não falha a requisição se o upload de arquivos falhar
      }
    }

    res.json({
      success: true,
      confirmedInZoho: true,
      message: "Ocorrência criada com sucesso",
      protocolo: numeroProtocolo,
      data: {
        id: recordId,
        ...response.data?.[0]?.details,
      },
      arquivosAnexados: arquivosAnexados,
    });
  } catch (error) {
    console.error("[OCORRENCIA API] ✗ Erro ao criar ocorrência:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Erro ao criar ocorrência no Zoho",
      details: error.response?.data,
    });
  }
});

export default router;
