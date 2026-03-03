import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";

const router = express.Router();

/**
 * Rota para buscar pedido por número no módulo Sales_Orders do Zoho
 * GET /v1/sales-orders/:numeroPedido
 */
router.get("/:numeroPedido", async (req, res) => {
  const { numeroPedido } = req.params;
  const numeroLimpo = String(numeroPedido || "").trim();

  if (!numeroLimpo) {
    return res.status(400).json({
      success: false,
      error: "Número do pedido é obrigatório",
    });
  }

  try {
    console.log("[SALES ORDER API] Buscando pedido por número:", numeroLimpo);

    const moduleName = "Sales_Orders";
    let pedidoEncontrado = null;

    // Função auxiliar para comparar número do pedido
    const normalizarNumero = (valor) => String(valor || "").trim();

    const filtrarPorNumero = (registros) => {
      if (!Array.isArray(registros)) return null;
      for (const registro of registros) {
        const numeroRegistro = normalizarNumero(registro.N_mero_Pedido);
        if (numeroRegistro === numeroLimpo) {
          return registro;
        }
      }
      return null;
    };

    // Estratégia 1: busca com criteria (mais eficiente)
    try {
      console.log(
        "[SALES ORDER API] Tentativa 1: busca com critério N_mero_Pedido"
      );
      const fields =
        "id,Contact_Name,CPF,Celular,E_mail,N_mero_Pedido,AWB,Data,Ordered_Items";
      const criteria = `(N_mero_Pedido:equals:${numeroLimpo})`;
      const endpoint = `/${moduleName}?criteria=${encodeURIComponent(
        criteria
      )}&fields=${encodeURIComponent(fields)}`;

      const response = await chamarZohoApi("GET", endpoint);
      if (response.data && response.data.length > 0) {
        pedidoEncontrado = filtrarPorNumero(response.data);
      }
    } catch (error) {
      console.log(
        "[SALES ORDER API] Busca com critério falhou, tentando varredura paginada:",
        error.message
      );
    }

    console.log(
      "[SALES ORDER API] Iniciando busca paginada otimizada em Sales_Orders"
    );

    // Estratégia 2: varredura paginada otimizada (similar à busca de CPF)
    const perPage = 200;
    const paginasParalelas = 10;
    let page = 1;
    let hasMore = true;
    const maxPaginas = 900; // limite de segurança

    const camposMinimos =
      "id,N_mero_Pedido,Contact_Name,CPF,Celular,E_mail,AWB,Data,Ordered_Items";

    while (hasMore && !pedidoEncontrado && page <= maxPaginas) {
      const paginasParaBuscar = [];
      for (let i = 0; i < paginasParalelas && page + i <= maxPaginas; i++) {
        paginasParaBuscar.push(page + i);
      }

      console.log(
        "[SALES ORDER API] Buscando páginas:",
        paginasParaBuscar.join(", ")
      );

      const promessas = paginasParaBuscar.map((paginaAtual) => {
        const endpoint = `/${moduleName}?page=${paginaAtual}&per_page=${perPage}&fields=${encodeURIComponent(
          camposMinimos
        )}`;
        return chamarZohoApi("GET", endpoint)
          .then((response) => ({ pagina: paginaAtual, data: response.data }))
          .catch((error) => {
            console.log(
              `[SALES ORDER API] Falha ao buscar página ${paginaAtual}:`,
              error.message
            );
            return { pagina: paginaAtual, data: [] };
          });
      });

      const resultados = await Promise.all(promessas);

      for (const resultado of resultados) {
        const registros = resultado.data || [];
        if (registros.length === 0) {
          hasMore = false;
          continue;
        }

        const encontrado = filtrarPorNumero(registros);
        if (encontrado) {
          pedidoEncontrado = encontrado;
          break;
        }
      }

      page += paginasParalelas;
    }

    if (!pedidoEncontrado) {
      console.log(
        "[SALES ORDER API] Nenhum pedido encontrado para o número:",
        numeroLimpo
      );
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    // Se encontrou o pedido, busca também os dados completos do cliente em Contacts
    let pedidoComContato = pedidoEncontrado;
    try {
      const contactRef = pedidoEncontrado.Contact_Name;
      const contactId =
        typeof contactRef === "object" && contactRef !== null
          ? contactRef.id
          : null;

      if (contactId) {
        console.log(
          "[SALES ORDER API] Buscando dados do cliente em Contacts. ID:",
          contactId
        );

        const contactFields =
          "id,First_Name,Last_Name,CPF,Email,Mobile,Phone";
        const contactEndpoint = `/Contacts/${contactId}?fields=${encodeURIComponent(
          contactFields
        )}`;

        const contactResponse = await chamarZohoApi("GET", contactEndpoint);
        const contato =
          contactResponse.data && contactResponse.data.length > 0
            ? contactResponse.data[0]
            : null;

        if (contato) {
          pedidoComContato = {
            ...pedidoEncontrado,
            // Dados achatados para o front preencher o formulário
            CPF: contato.CPF || pedidoEncontrado.CPF,
            E_mail: contato.Email || pedidoEncontrado.E_mail,
            Celular: contato.Mobile || pedidoEncontrado.Celular,
            First_Name: contato.First_Name,
            Last_Name: contato.Last_Name,
          };
        }
      }
    } catch (error) {
      console.log(
        "[SALES ORDER API] Falha ao buscar dados do cliente em Contacts:",
        error.message
      );
      // Continua mesmo assim com os dados do pedido
    }

    return res.json({
      success: true,
      data: [pedidoComContato],
    });
  } catch (error) {
    console.error("[SALES ORDER API] Erro ao buscar pedido:", error);
    return res.status(500).json({
      success: false,
      error:
        error.message || "Erro interno ao buscar pedido. Tente novamente.",
    });
  }
});

export default router;

