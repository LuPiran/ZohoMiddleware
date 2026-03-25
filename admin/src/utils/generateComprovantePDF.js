import jsPDF from 'jspdf';

// Logo pública servida pelo Vite em /public
const LOGO_TEGRA = '/LogoTegra.png';

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = reject;
    imagem.src = url;
  });
}

function calcularDimensoesContain(larguraOriginal, alturaOriginal, maxLargura, maxAltura) {
  if (!larguraOriginal || !alturaOriginal) {
    return { largura: maxLargura, altura: maxAltura };
  }

  const proporcao = Math.min(maxLargura / larguraOriginal, maxAltura / alturaOriginal);
  return {
    largura: larguraOriginal * proporcao,
    altura: alturaOriginal * proporcao,
  };
}

/**
 * Gera um PDF de comprovante com as informações da solicitação
 * @param {Object} dados - Dados da solicitação
 */
export const gerarComprovantePDF = async (dados) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Cores da marca - Paleta profissional
  const corPrincipal = [25, 118, 210];      // Azul vibrante
  const corSecundaria = [66, 133, 244];     // Azul claro
  const corLinha = [230, 230, 230];         // Cinza muito claro
  const corTexto = [33, 33, 33];            // Cinza escuro
  const corTextoClaro = [102, 102, 102];    // Cinza médio
  const corBranco = [255, 255, 255];        // Branco
  const corFundoSecao = [240, 246, 255];    // Azul muito claro
  const corBordaCard = [214, 228, 248];     // Azul suave

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margemEsquerda = 15;
  const margemDireita = 15;
  const larguraPagina = pageWidth - margemDireita - margemEsquerda;

  let yPosition = 0;

  const garantirEspaco = (alturaMinima = 10) => {
    if (yPosition + alturaMinima > pageHeight - 35) {
      doc.addPage();
      yPosition = 20;
    }
  };

  const desenharTituloSecao = (titulo) => {
    garantirEspaco(12);
    doc.setFillColor(...corFundoSecao);
    doc.roundedRect(margemEsquerda, yPosition - 4, larguraPagina, 8, 1.5, 1.5, 'F');
    doc.setTextColor(...corPrincipal);
    doc.setFontSize(9.5);
    doc.setFont(undefined, 'bold');
    doc.text(titulo, margemEsquerda + 3, yPosition + 1.2);
    yPosition += 9;
  };

  const desenharLinhaInfo = (label, valor) => {
    const valorFinal = valor || 'N/A';
    const linhas = doc.splitTextToSize(String(valorFinal), larguraPagina - 52);
    const altura = Math.max(5.5, linhas.length * 4.2);

    garantirEspaco(altura + 1);
    doc.setFontSize(8.8);
    doc.setTextColor(...corTextoClaro);
    doc.setFont(undefined, 'bold');
    doc.text(label, margemEsquerda, yPosition);
    doc.setTextColor(...corTexto);
    doc.setFont(undefined, 'normal');
    doc.text(linhas, margemEsquerda + 50, yPosition);
    yPosition += altura;
  };

  // ========== CABEÇALHO PRINCIPAL ==========
  // Fundo gradiente simulado com retângulo azul forte
  doc.setFillColor(...corPrincipal);
  doc.rect(0, 0, pageWidth, 50, 'F');

  let logoX = margemEsquerda;
  let logoY = 6;
  let logoLargura = 25;
  let logoAltura = 18;

  // Logo da TegraCorp
  try {
    const logoImagem = await carregarImagem(LOGO_TEGRA);
    const dimensoesLogo = calcularDimensoesContain(
      logoImagem.width,
      logoImagem.height,
      32,
      18,
    );
    logoLargura = dimensoesLogo.largura;
    logoAltura = dimensoesLogo.altura;
    doc.addImage(logoImagem, 'PNG', logoX, logoY, logoLargura, logoAltura);
  } catch (e) {
    // Se a imagem não carregar, usar texto como fallback
    doc.setTextColor(...corBranco);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Tegra', margemEsquerda, 20);
    logoLargura = 20;
    logoAltura = 12;
  }

  // Texto branco no cabeçalho
  doc.setTextColor(...corBranco);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const tituloX = logoX + logoLargura + 6;
  const tituloY = logoY + logoAltura * 0.65;
  doc.text('Comprovante de Solicitação', tituloX, tituloY);

  // Protocolo em destaque no cabeçalho
  const numeroProtocolo = dados.protocolo || 'N/A';
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Protocolo: ${numeroProtocolo}`, pageWidth - margemDireita - 50, 30);

  yPosition = 58;

  // ========== INFORMAÇÕES GERAIS ==========
  doc.setTextColor(...corTexto);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const dataFormatada = formatarDataComHora(dados.dataCriacao);
  doc.text(`Inserido no dia: ${dataFormatada}`, margemEsquerda, yPosition);
  yPosition += 7;

  // Cards resumo para leitura rapida
  const cardsResumo = [
    { label: 'Tipo', valor: dados.tipoSolicitacao || 'N/A' },
    { label: 'Paciente', valor: `${dados.nomePaciente || ''} ${dados.sobrenomePaciente || ''}`.trim() || 'N/A' },
    { label: 'Consultor', valor: dados.consultorTegra || 'N/A' },
  ];

  const gapCard = 3;
  const larguraCard = (larguraPagina - gapCard * 2) / 3;
  const yCards = yPosition;

  for (let i = 0; i < cardsResumo.length; i += 1) {
    const x = margemEsquerda + i * (larguraCard + gapCard);
    const card = cardsResumo[i];
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(...corBordaCard);
    doc.roundedRect(x, yCards, larguraCard, 14, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(...corTextoClaro);
    doc.setFont(undefined, 'bold');
    doc.text(card.label.toUpperCase(), x + 2, yCards + 4);
    doc.setFontSize(8.5);
    doc.setTextColor(...corTexto);
    doc.setFont(undefined, 'normal');
    const valorCard = doc.splitTextToSize(String(card.valor), larguraCard - 4);
    doc.text(valorCard[0] || 'N/A', x + 2, yCards + 10);
  }

  yPosition += 18;

  // Linha divisória
  doc.setDrawColor(...corLinha);
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
  yPosition += 8;

  // ========== TIPO DE SOLICITAÇÃO E CONSULTOR ==========
  desenharTituloSecao('INFORMACOES GERAIS');

  const infoGeral = [
    { label: 'Tipo de solicitação:', valor: dados.tipoSolicitacao || 'N/A' },
    { label: 'Consultor Tegra:', valor: dados.consultorTegra || 'N/A' },
  ];

  for (const info of infoGeral) {
    desenharLinhaInfo(info.label, info.valor);
  }

  yPosition += 3;

  // ========== DADOS DO PACIENTE ==========
  desenharTituloSecao('DADOS DO PACIENTE');

  const dadosPaciente = [
    { label: 'Primeiro Nome:', valor: dados.nomePaciente || 'N/A' },
    { label: 'Sobrenome:', valor: dados.sobrenomePaciente || 'N/A' },
    { label: 'Data de nascimento:', valor: formatarDataBR(dados.dataNascimento) },
    { label: 'CPF:', valor: formatarCPF(dados.cpfPaciente) },
    { label: 'RG:', valor: dados.rgPaciente || 'N/A' },
    { label: 'E-mail:', valor: dados.emailPaciente || 'N/A' },
    { label: 'Celular:', valor: formatarTelefone(dados.celularPaciente) },
    { label: 'Telefone:', valor: formatarTelefone(dados.telefonePaciente) },
  ];

  for (const dado of dadosPaciente) {
    desenharLinhaInfo(dado.label, dado.valor);
  }

  yPosition += 3;

  // ========== REPRESENTANTE LEGAL (se houver) ==========
  if (dados.temRepresentanteLegal || dados.nomeRepresentanteLegal) {
    desenharTituloSecao('REPRESENTANTE LEGAL');

    const dadosRepresentante = [
      { label: 'Nome do representante:', valor: dados.nomeRepresentanteLegal || 'N/A' },
      { label: 'CPF:', valor: formatarCPF(dados.cpfRepresentanteLegal) },
      { label: 'RG:', valor: dados.rgRepresentanteLegal || 'N/A' },
      { label: 'E-mail:', valor: dados.emailRepresentanteLegal || 'N/A' },
      { label: 'Celular:', valor: formatarTelefone(dados.celularRepresentanteLegal) },
    ];

    for (const dado of dadosRepresentante) {
      desenharLinhaInfo(dado.label, dado.valor);
    }

    yPosition += 3;
  }

  // ========== NOVO MÉDICO PRESCRITOR (se houver) ==========
  if (dados.temNovoMedicoPrescritor || dados.nomeMedico) {
    desenharTituloSecao('NOVO MEDICO PRESCRITOR');

    const dadosMedico = [
      { label: 'Nome do Médico:', valor: dados.nomeMedico || 'N/A' },
      { label: 'CRM do Médico:', valor: dados.crmMedico || 'N/A' },
      { label: 'E-mail do Médico:', valor: dados.emailMedico || 'N/A' },
      { label: 'Celular do Médico:', valor: formatarTelefone(dados.celularMedico) },
      { label: 'Especialidade do Médico:', valor: dados.especialidadeMedico || 'N/A' },
    ];

    for (const dado of dadosMedico) {
      desenharLinhaInfo(dado.label, dado.valor);
    }

    yPosition += 3;
  }

  // Verifica se precisa de nova página para os produtos
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== PRODUTOS ==========
  if (dados.produtos && dados.produtos.length > 0) {
    // Linha divisória
    doc.setDrawColor(...corLinha);
    doc.setLineWidth(0.5);
    doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
    yPosition += 8;

    desenharTituloSecao('PRODUTOS SOLICITADOS');

    // Cabeçalho da tabela
    doc.setFillColor(...corSecundaria);
    doc.setTextColor(...corBranco);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');

    const colunaProduto = margemEsquerda;
    const colunaQuantidade = margemEsquerda + 90;
    const colunaValor = margemEsquerda + 120;

    // Retângulo do cabeçalho
    doc.roundedRect(margemEsquerda, yPosition - 5, larguraPagina, 7, 1.2, 1.2, 'F');

    doc.text('Produto', colunaProduto + 2, yPosition);
    doc.text('Qtd', colunaQuantidade + 2, yPosition);
    doc.text('Valor Unit.', colunaValor + 2, yPosition);

    yPosition += 8;

    // Dados dos produtos
    doc.setTextColor(...corTexto);
    doc.setFont(undefined, 'normal');

    for (const produto of dados.produtos) {
      // Fundo alternado para melhor leitura
      if (dados.produtos.indexOf(produto) % 2 === 0) {
        doc.setFillColor(248, 250, 253);
        doc.rect(margemEsquerda, yPosition - 4, larguraPagina, 6, 'F');
      }

      doc.text(produto.nome || 'Produto sem nome', colunaProduto + 2, yPosition);
      doc.text(`${produto.quantidade || 0}`, colunaQuantidade + 2, yPosition);
      doc.text(`R$ ${parseFloat(produto.valor || 0).toFixed(2)}`, colunaValor + 2, yPosition);
      yPosition += 6;
    }

    // Total
    yPosition += 2;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...corPrincipal);
    doc.setFontSize(10);
    doc.text('TOTAL:', colunaQuantidade + 2, yPosition);
    doc.text(`R$ ${parseFloat(dados.totalCompra || 0).toFixed(2)}`, colunaValor + 2, yPosition);

    doc.setTextColor(...corTexto);
    yPosition += 8;
  }

  // Verifica se precisa de nova página para as informações finais
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  // ========== INFORMAÇÕES DE ENDEREÇO E PAGAMENTO ==========
  // Linha divisória
  doc.setDrawColor(...corLinha);
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
  yPosition += 8;

  desenharTituloSecao('ENDERECO DE ENTREGA');

  const endereco = [
    { label: 'Rua:', valor: dados.rua || 'N/A' },
    { label: 'Bairro:', valor: dados.bairro || 'N/A' },
    { label: 'Cidade:', valor: dados.cidade || 'N/A' },
    { label: 'Estado:', valor: dados.estado || 'N/A' },
    { label: 'CEP:', valor: formatarCEP(dados.cep) },
    { label: 'País:', valor: dados.pais || 'Brasil' },
  ];

  for (const dado of endereco) {
    desenharLinhaInfo(dado.label, dado.valor);
  }

  yPosition += 5;

  // ========== INFORMAÇÕES DE PAGAMENTO ==========
  desenharTituloSecao('INFORMACOES DE PAGAMENTO');

  const pagamento = [
    { label: 'Forma de pagamento:', valor: dados.formaPagamento || 'N/A' },
    { label: 'Termos e condições de pagamento:', valor: dados.termosCondicoesPagamento || 'N/A' },
  ];

  for (const dado of pagamento) {
    desenharLinhaInfo(dado.label, dado.valor);
  }

  // ========== OBSERVAÇÕES ==========
  if (dados.observacao) {
    yPosition += 3;
    doc.setTextColor(...corTexto);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('OBSERVAÇÕES', margemEsquerda, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const linhasObs = doc.splitTextToSize(dados.observacao, larguraPagina - 4);
    doc.text(linhasObs, margemEsquerda + 2, yPosition);
    yPosition += linhasObs.length * 4 + 3;
  }

  // ========== RESUMO COMPLETO DOS CAMPOS PREENCHIDOS ==========
  const camposIgnorados = new Set([
    'arquivos',
    'attachment',
    'attachments',
  ]);

  const camposCompletos = Object.entries(dados || {})
    .filter(([chave, valor]) => {
      const chaveNormalizada = String(chave || '').toLowerCase();
      if (camposIgnorados.has(chaveNormalizada)) return false;
      if (/busca|buscar|pesquisa|search|base64|arquivo/i.test(chaveNormalizada)) return false;
      return temValorParaPDF(valor);
    })
    .sort(([a], [b]) => String(a).localeCompare(String(b), 'pt-BR'));

  if (camposCompletos.length > 0) {
    garantirEspaco(18);
    yPosition += 4;

    doc.setDrawColor(...corLinha);
    doc.setLineWidth(0.5);
    doc.line(margemEsquerda, yPosition, pageWidth - margemDireita, yPosition);
    yPosition += 8;

    doc.setTextColor(...corTexto);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO COMPLETO DOS CAMPOS PREENCHIDOS', margemEsquerda, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    for (const [chave, valor] of camposCompletos) {
      const valorFormatado = formatarValorGenericoPDF(chave, valor);
      if (!temValorParaPDF(valorFormatado)) continue;

      const linhasValor = doc.splitTextToSize(String(valorFormatado), larguraPagina - 50);
      const alturaCampo = Math.max(6, linhasValor.length * 4 + 1);
      garantirEspaco(alturaCampo + 3);

      doc.setFont(undefined, 'bold');
      doc.text(`${formatarNomeCampoPDF(chave)}:`, margemEsquerda, yPosition);
      doc.setFont(undefined, 'normal');
      doc.text(linhasValor, margemEsquerda + 50, yPosition);
      yPosition += alturaCampo;
    }
  }

  // ========== RODAPÉ ==========
  const alturaPagina = pageHeight;
  let yRodape = alturaPagina - 25;

  // Linha divisória do rodapé
  doc.setDrawColor(...corLinha);
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yRodape, pageWidth - margemDireita, yRodape);
  yRodape += 6;

  doc.setFontSize(8);
  doc.setTextColor(...corTextoClaro);
  doc.setFont(undefined, 'normal');

  doc.text('Este é um comprovante autossercado. Para confirmar a solicitação, consulte o portal.', margemEsquerda, yRodape);

  const dataGeracao = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em: ${dataGeracao}`, margemEsquerda, yRodape + 4);

  // Número de página
  const totalPages = doc.internal.pages.length - 1;
  if (totalPages > 1) {
    doc.text(`Página 1 de ${totalPages}`, pageWidth - margemDireita - 20, yRodape + 4);
  }

  // ========== DOWNLOAD ==========
  const tipoFormatado = dados.tipoSolicitacao.replace(/\s+/g, '_');
  const nomeArquivo = `${tipoFormatado}_${numeroProtocolo}.pdf`;
  doc.save(nomeArquivo);
};

/**
 * Formata uma data com hora para o padrão brasileiro
 */
function formatarDataComHora(data) {
  if (!data) return 'Data não disponível';

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dataObj.getTime())) return 'Data inválida';

    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const horas = String(dataObj.getHours()).padStart(2, '0');
    const minutos = String(dataObj.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  } catch {
    return 'Data inválida';
  }
}

/**
 * Formata uma data para o padrão brasileiro
 */
function formatarDataBR(data) {
  if (!data) return 'N/A';

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dataObj.getTime())) return 'Data inválida';

    return dataObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Data inválida';
  }
}

/**
 * Formata CPF
 */
function formatarCPF(cpf) {
  if (!cpf) return 'N/A';
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return cpf;
  return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9)}`;
}

/**
 * Formata CEP
 */
function formatarCEP(cep) {
  if (!cep) return 'N/A';
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return cep;
  return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;
}

/**
 * Formata telefone/celular
 */
function formatarTelefone(telefone) {
  if (!telefone) return 'N/A';
  const telLimpo = telefone.replace(/\D/g, '');
  if (telLimpo.length === 11) {
    return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2, 7)}-${telLimpo.substring(7)}`;
  }
  if (telLimpo.length === 10) {
    return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2, 6)}-${telLimpo.substring(6)}`;
  }
  return telefone;
}

function temValorParaPDF(valor) {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  if (Array.isArray(valor)) return valor.some((item) => temValorParaPDF(item));
  if (typeof valor === 'object') {
    return Object.values(valor).some((item) => temValorParaPDF(item));
  }
  return true;
}

function formatarNomeCampoPDF(chave) {
  const texto = String(chave)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarValorGenericoPDF(chave, valor) {
  if (!temValorParaPDF(valor)) return '';

  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }

  if (Array.isArray(valor)) {
    return valor
      .map((item, index) => {
        if (!temValorParaPDF(item)) return null;
        if (typeof item === 'object' && !Array.isArray(item)) {
          const pares = Object.entries(item)
            .filter(([, v]) => temValorParaPDF(v))
            .map(([k, v]) => `${formatarNomeCampoPDF(k)}: ${v}`);
          return pares.length > 0 ? `${index + 1}. ${pares.join(' | ')}` : null;
        }
        return `${index + 1}. ${item}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  if (typeof valor === 'object') {
    return Object.entries(valor)
      .filter(([, v]) => temValorParaPDF(v))
      .map(([k, v]) => `${formatarNomeCampoPDF(k)}: ${v}`)
      .join(' | ');
  }

  if (/cpf/i.test(chave)) return formatarCPF(String(valor));
  if (/cep/i.test(chave)) return formatarCEP(String(valor));
  if (/telefone|celular/i.test(chave)) return formatarTelefone(String(valor));

  return String(valor);
}
