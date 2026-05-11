/**
 * Monta linhas de produtos com preço do catálogo Supabase e totais.
 */

function parsePrecoBr(val) {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  let precoLimpo = String(val)
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .trim();
  if (precoLimpo.includes(",")) {
    precoLimpo = precoLimpo.replace(/\./g, "").replace(",", ".");
  }
  precoLimpo = precoLimpo.replace(/[^\d.]/g, "");
  const n = parseFloat(precoLimpo);
  return Number.isNaN(n) ? null : n;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Array<{ nome?: string, Nome_do_Produto?: string, quantidade?: string|number, Quantidade?: string|number, preco?: string|number, produtoId?: string, produto_id?: string }>} itens
 */
export async function buildProdutosResumo(supabase, itens) {
  if (!supabase || !Array.isArray(itens) || itens.length === 0) {
    return { linhas: [], valor_total: 0, quantidade_produtos: 0 };
  }

  const ids = [
    ...new Set(
      itens
        .map((i) => i.produtoId || i.produto_id)
        .filter(Boolean)
        .map(String),
    ),
  ];

  const precos = new Map();
  if (ids.length) {
    const { data: rows, error } = await supabase
      .from("produtos")
      .select("id, nome, preco")
      .in("id", ids);
    if (error) {
      console.error("[PRODUTOS RESUMO] Erro ao buscar preços:", error);
    }
    for (const r of rows || []) {
      precos.set(String(r.id), {
        nome: r.nome || "",
        preco: r.preco != null ? Number(r.preco) : 0,
      });
    }
  }

  const linhas = [];
  let valorTotal = 0;
  let qtdSoma = 0;

  for (const raw of itens) {
    const id = raw.produtoId || raw.produto_id || null;
    const idStr = id ? String(id) : null;
    const nomeRaw =
      String(raw.nome || raw.Nome_do_Produto || "").trim() ||
      (idStr && precos.get(idStr)?.nome) ||
      "";
    const qtdNum = Math.max(
      1,
      parseInt(String(raw.quantidade ?? raw.Quantidade ?? "1"), 10) || 1,
    );

    const fromCat = idStr ? precos.get(idStr) : null;
    let unit = fromCat ? fromCat.preco : 0;
    const parsedManual = parsePrecoBr(raw.preco);
    if (parsedManual != null) {
      unit = parsedManual;
    }

    const subtotal = unit * qtdNum;
    valorTotal += subtotal;
    qtdSoma += qtdNum;

    linhas.push({
      produto_id: idStr,
      nome: nomeRaw,
      quantidade: qtdNum,
      preco_unitario: unit,
      subtotal,
    });
  }

  return {
    linhas,
    valor_total: Math.round(valorTotal * 100) / 100,
    quantidade_produtos: qtdSoma,
  };
}

/**
 * Normaliza lista de produtos do payload da ocorrência (legado `produto` único ou array `produtos`).
 */
export function normalizarLinhasProdutosOcorrencia(body) {
  if (body.produto && (body.produto.nome || body.produto.Nome)) {
    return [
      {
        nome: body.produto.nome || body.produto.Nome,
        quantidade: String(body.produto.quantidade || "1"),
        preco: body.produto.preco,
        produtoId: body.produto.produtoId || body.produto.id,
      },
    ];
  }
  const list = body.produtos;
  if (!Array.isArray(list)) return [];
  return list
    .map((p) => ({
      nome: p.Nome_do_Produto || p.nome || "",
      quantidade: String(p.Quantidade ?? p.quantidade ?? "1"),
      preco: p.preco,
      produtoId: p.produtoId || "",
    }))
    .filter((x) => x.nome);
}
