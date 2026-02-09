import jsPDF from 'jspdf';

/**
 * Gera um PDF de comprovante com as informações da solicitação
 * @param {Object} dados - Dados da solicitação
 * @param {string} dados.tipoSolicitacao - Tipo de solicitação (Compra, Proposta, etc)
 * @param {string} dados.nomePaciente - Nome do paciente
 * @param {string} dados.sobrenomePaciente - Sobrenome do paciente
 * @param {string} dados.cpfPaciente - CPF do paciente
 * @param {string} dados.emailPaciente - Email do paciente
 * @param {string} dados.celularPaciente - Celular do paciente
 * @param {string} dados.dataNascimento - Data de nascimento
 * @param {string} dados.rua - Rua do endereço
 * @param {string} dados.numero - Número do endereço
 * @param {string} dados.bairro - Bairro
 * @param {string} dados.cidade - Cidade
 * @param {string} dados.estado - Estado
 * @param {string} dados.cep - CEP
 * @param {string} dados.pais - País
 * @param {Array} dados.produtos - Array de produtos
 * @param {string} dados.dataCriacao - Data de criação
 * @param {number} dados.totalCompra - Total da compra
 */
export const gerarComprovantePDF = (dados) => {
  const doc = new jsPDF();

  // Cores da marca
  const corPrincipal = [25, 118, 210]; // Azul
  const corTexto = [0, 0, 0];
  const corTextoSecundario = [100, 100, 100];

  let yPosition = 20;
  const margemEsquerda = 20;
  const margemDireita = 20;
  const larguraPagina = doc.internal.pageSize.getWidth() - margemDireita - margemEsquerda;

  // ========== CABEÇALHO ==========
  // Linha superior azul
  doc.setFillColor(...corPrincipal);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('COMPROVANTE DE SOLICITAÇÃO', margemEsquerda, 20);

  // Tipo de solicitação
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Tipo: ${dados.tipoSolicitacao || 'Solicitação'}`, margemEsquerda, 30);

  yPosition = 55;

  // ========== INFORMAÇÕES GERAIS ==========
  doc.setTextColor(...corTexto);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('INFORMAÇÕES GERAIS', margemEsquerda, yPosition);
  yPosition += 10;

  // Data e Hora
  const dataFormatada = formatarDataBR(dados.dataCriacao);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Data da Solicitação: ${dataFormatada}`, margemEsquerda, yPosition);
  yPosition += 6;

  // ========== DADOS DO PACIENTE ==========
  yPosition += 5;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('DADOS DO PACIENTE', margemEsquerda, yPosition);
  yPosition += 10;

  // Configurar tamanho da fonte para dados
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const dadosPaciente = [
    { label: 'Nome Completo:', valor: `${dados.nomePaciente} ${dados.sobrenomePaciente}` },
    { label: 'CPF:', valor: formatarCPF(dados.cpfPaciente) },
    { label: 'Data de Nascimento:', valor: formatarDataBR(dados.dataNascimento) },
    { label: 'Email:', valor: dados.emailPaciente || 'N/A' },
    { label: 'Celular:', valor: formatarTelefone(dados.celularPaciente) || 'N/A' },
  ];

  for (const dado of dadosPaciente) {
    doc.setFont(undefined, 'bold');
    doc.text(dado.label, margemEsquerda, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(dado.valor, margemEsquerda + 45, yPosition);
    yPosition += 6;
  }

  // ========== ENDEREÇO ==========
  yPosition += 5;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('ENDEREÇO', margemEsquerda, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const endereco = [
    { label: 'Rua:', valor: `${dados.rua}, ${dados.numero}` },
    { label: 'Bairro:', valor: dados.bairro || 'N/A' },
    { label: 'Cidade/Estado:', valor: `${dados.cidade || 'N/A'}, ${dados.estado || 'N/A'}` },
    { label: 'CEP:', valor: formatarCEP(dados.cep) || 'N/A' },
    { label: 'País:', valor: dados.pais || 'N/A' },
  ];

  for (const dado of endereco) {
    doc.setFont(undefined, 'bold');
    doc.text(dado.label, margemEsquerda, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(dado.valor, margemEsquerda + 45, yPosition);
    yPosition += 6;
  }

  // ========== PRODUTOS ==========
  if (dados.produtos && dados.produtos.length > 0) {
    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PRODUTOS', margemEsquerda, yPosition);
    yPosition += 10;

    // Cabeçalho da tabela
    doc.setFillColor(25, 118, 210);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');

    const colunaProduto = margemEsquerda;
    const colunaQuantidade = margemEsquerda + 90;
    const colunaValor = margemEsquerda + 110;

    doc.text('Produto', colunaProduto, yPosition);
    doc.text('Qtd', colunaQuantidade, yPosition);
    doc.text('Valor Unit.', colunaValor, yPosition);

    yPosition += 8;

    // Dados da tabela
    doc.setTextColor(...corTexto);
    doc.setFont(undefined, 'normal');

    for (const produto of dados.produtos) {
      doc.text(produto.nome || 'Produto sem nome', colunaProduto, yPosition);
      doc.text(`${produto.quantidade || 0}`, colunaQuantidade, yPosition);
      doc.text(
        `R$ ${parseFloat(produto.valor || 0).toFixed(2)}`,
        colunaValor,
        yPosition
      );
      yPosition += 6;
    }

    // Total
    yPosition += 5;
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', margemEsquerda + 75, yPosition);
    doc.setFontSize(11);
    doc.setTextColor(...corPrincipal);
    doc.text(`R$ ${parseFloat(dados.totalCompra || 0).toFixed(2)}`, colunaValor, yPosition);

    doc.setTextColor(...corTexto);
  }

  // ========== RODAPÉ ==========
  const alturaPagina = doc.internal.pageSize.getHeight();
  yPosition = alturaPagina - 30;

  doc.setFontSize(8);
  doc.setTextColor(...corTextoSecundario);
  doc.setFont(undefined, 'normal');

  // Linha horizontal
  doc.setDrawColor(...corPrincipal);
  doc.line(margemEsquerda, yPosition - 5, doc.internal.pageSize.getWidth() - margemDireita, yPosition - 5);

  doc.text(
    'Este é um comprovante autossercado. Para confirmar a solicitação, consulte o portal.',
    margemEsquerda,
    yPosition
  );

  doc.text(
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    margemEsquerda,
    yPosition + 6
  );

  // Número de protocolo (baseado em timestamp)
  const numeroProtocolo = gerarNumeroProtocolo();
  doc.text(
    `Protocolo: ${numeroProtocolo}`,
    margemEsquerda,
    yPosition + 12
  );

  // ========== DOWNLOAD ==========
  const nomeArquivo = `Comprovante_${dados.tipoSolicitacao}_${dados.nomePaciente.replace(/\s+/g, '_')}_${formatarDataISO(new Date())}.pdf`;
  doc.save(nomeArquivo);
};

/**
 * Formata uma data para o padrão brasileiro
 */
function formatarDataBR(data) {
  if (!data) return 'Data não disponível';

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
 * Formata a data para formato ISO (YYYY-MM-DD)
 */
function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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
  return telefone;
}

/**
 * Gera um número de protocolo único
 */
function gerarNumeroProtocolo() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${random}${timestamp}`;
}
