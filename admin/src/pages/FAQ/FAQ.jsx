import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdRemove, MdHelpOutline, MdSearch, MdClose } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";

const faqData = [
  /* ══════════════════════════════════════════════
     LEADS MÉDICOS — VISÃO GERAL
  ══════════════════════════════════════════════ */
  {
    categoria: "Leads Médicos — Visão Geral",
    itens: [
      {
        pergunta: "O que é a tela de Leads Médicos?",
        resposta: "É a central de gestão dos médicos prospectados. Nela você visualiza <strong>toda a sua carteira de leads</strong> em forma de lista, com status, nome, especialidade, cidade e data de entrada. Clique em qualquer linha para abrir o detalhe completo do lead — incluindo timeline, dados de contato e o formulário de tentativas.",
      },
      {
        pergunta: "Como filtro os leads por status, período ou data?",
        resposta: "Clique no botão <strong>'Filtros'</strong> no canto superior direito da tela de Leads Médicos. Um painel deslizará pela direita com três seções: <strong>Período rápido</strong> (últimos 7, 30 ou 90 dias / este ano), <strong>Status</strong> (selecione quantos quiser) e <strong>Data de criação / Data de entrada</strong> (range personalizado). Após configurar, clique em <strong>'Aplicar filtros'</strong>. Para remover tudo de uma vez, clique em 'Limpar'.",
      },
      {
        pergunta: "Como exporto minha lista de leads para Excel?",
        resposta: "Na tela de Leads Médicos, clique no botão verde <strong>'Exportar'</strong> ao lado de 'Filtros'. O sistema baixará automaticamente um arquivo <strong>.xlsx</strong> com todos os leads que estão sendo exibidos no momento (respeitando os filtros ativos). O arquivo contém 15 colunas: ID, Nome, E-mail, Telefone, Celular, CRM, Especialidade, Cidade, UF, Origem, Status, Consultor, Gerência, Data de criação e Data de entrada. <em>Dica: aplique os filtros antes de exportar para ter apenas os leads desejados na planilha.</em>",
      },
      {
        pergunta: "Como funciona a busca por texto na lista de leads?",
        resposta: "No topo da lista existe um campo de busca. Digite o termo desejado e pressione <strong>Enter</strong> ou clique no ícone de lupa à direita. O sistema filtra os leads por: <strong>ID, Nome, E-mail, Especialidade, Cidade, UF, Origem e Consultor</strong>. Para limpar a busca, apague o texto e pressione Enter novamente. A busca e os filtros de painel funcionam juntos — você pode combinar os dois.",
      },
      {
        pergunta: "A lista de leads tem paginação?",
        resposta: "Sim. A lista exibe <strong>10 leads por página</strong>. No rodapé da lista há botões de navegação: primeira página, página anterior, número da página atual / total, próxima página e última página. O contador também mostra quantos leads estão sendo exibidos e o total filtrado.",
      },
      {
        pergunta: "O que faz o botão 'Importar' em cada lead?",
        resposta: "O botão <strong>'Importar'</strong> (ícone de download, azul escuro) na linha de cada lead inicia o processo de importação daquele lead para o sistema. Ele aparece tanto na visualização desktop (tabela) quanto na mobile (card). Para ver todos os detalhes do lead, use o botão <strong>'Visualizar'</strong>.",
      },
      {
        pergunta: "O que significa cada status na lista de leads?",
        resposta: "Os status refletem o picklist oficial do Zoho CRM: <strong>Novo Lead</strong> — cadastro recém-chegado, ainda não triado. <strong>Lead Em Qualificação</strong> — passou pela triagem e está pronto para abordagem. <strong>Lead Com Interesse</strong> — médico demonstrou interesse e aguarda conversão (aparece em roxo). <strong>Lead Sem Contato</strong> — nenhuma das tentativas obteve resposta (aparece em amarelo). <strong>Lead Convertido</strong> — médico realizou a primeira compra (aparece em verde). <strong>Lead Sem Interesse</strong> — funil encerrado, médico recusou (aparece em vermelho). Cada status tem uma cor e ponto colorido para identificação rápida na lista.",
      },
      {
        pergunta: "O que são os gráficos que aparecem no topo da tela de Leads Médicos?",
        resposta: "Acima da lista de leads existe um mini-painel com <strong>3 indicadores</strong>: <strong>Leads por mês</strong> — gráfico de área mostrando a evolução do volume de leads nos últimos períodos; <strong>Por status</strong> — gráfico de rosca (donut) com a distribuição percentual por cada status; <strong>Conversão</strong> — percentual de leads convertidos com barra de progresso. No celular, esses gráficos ficam <em>recolhidos em acordeão</em> — toque no título de cada um para expandir. Todos os gráficos acompanham os filtros aplicados na lista.",
      },
      {
        pergunta: "O que é a timeline 'Acompanhe o lead'?",
        resposta: "No topo da página de detalhe de cada lead existe uma barra de progresso visual chamada <strong>'Acompanhe o lead'</strong>. Ela exibe as etapas do funil — Criado, Qualificado, 1ª / 2ª / 3ª Tentativa, Lead Com Interesse e Convertido — com as datas em que cada etapa foi atingida. Etapas concluídas ficam em verde (teal), a etapa atual em destaque com borda colorida, e as futuras em cinza. No celular a timeline rola horizontalmente.",
      },
      {
        pergunta: "O que é o 'Histórico de ações' no detalhe do lead?",
        resposta: "Na parte inferior da página de detalhe existe a seção <strong>'Histórico de ações'</strong>, que registra todo o rastro cronológico do lead: criação, oferta SLA, aceite ou recusa, cada tentativa de contato, sem contato, sem interesse, conversão, etc. — com data, hora e nome de quem realizou a ação. Se houver mais de 5 eventos, a lista fica rolável verticalmente.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     LEADS MÉDICOS — ATENDIMENTO E TENTATIVAS
  ══════════════════════════════════════════════ */
  {
    categoria: "Leads Médicos — Atendimento e Tentativas",
    itens: [
      {
        pergunta: "O que é o timer de oferta de lead (SLA)?",
        resposta: "Quando um lead é distribuído para você, aparece um <strong>contador regressivo</strong> no topo da página de detalhe desse lead. Você tem um tempo limitado para <strong>Aceitar</strong> ou <strong>Recusar</strong> a oferta. Se aceitar, o lead entra definitivamente na sua carteira. Se recusar — ou deixar o prazo esgotar — o lead é redistribuído automaticamente para o próximo consultor na fila. Quando restam menos de 5 minutos, o timer fica amarelo; abaixo de 2 minutos, vermelho.",
      },
      {
        pergunta: "Como registro uma tentativa de contato com o médico?",
        resposta: "Após aceitar o lead, na seção <strong>'Primeira tentativa'</strong> (ou Segunda / Terceira), preencha: <strong>1.</strong> A <strong>Observação do contato</strong> — descreva brevemente o que aconteceu na ligação ou mensagem (mínimo 10 caracteres). <strong>2.</strong> As <strong>Evidências fotográficas</strong> — envie ao menos 1 imagem comprovando a tentativa (print de ligação, conversa de WhatsApp, etc.). <strong>3.</strong> Clique em <strong>'Continuar para compra'</strong> para registrar a tentativa e abrir o modal de compra.",
      },
      {
        pergunta: "Quantas tentativas posso registrar por lead?",
        resposta: "O sistema permite até <strong>3 tentativas</strong> de contato por lead. Cada tentativa tem uma janela de tempo a partir da qualificação. O contador de dias restantes fica visível no card de tentativas — quando próximo de zero, aparece em vermelho indicando urgência.",
      },
      {
        pergunta: "O que são as evidências fotográficas e por que são obrigatórias?",
        resposta: "Evidências são <strong>imagens que comprovam</strong> que o contato com o médico foi tentado (ex.: print da chamada no celular, conversa de WhatsApp, e-mail). São obrigatórias em cada tentativa para garantir rastreabilidade e transparência. Formatos aceitos: <strong>JPG, PNG, WEBP e GIF</strong> — tamanho máximo <strong>5 MB por imagem</strong>. Você pode enviar de 1 a 5 imagens: arraste e solte os arquivos na área tracejada, ou clique no botão para selecionar. Miniaturas aparecem com opção de remover antes de enviar. Se não enviar ao menos 1 imagem, o botão de envio fica bloqueado.",
      },
      {
        pergunta: "O que acontece quando clico em 'Lead sem contato'?",
        resposta: "Esta ação registra que <strong>não foi possível estabelecer nenhum contato</strong> com o médico naquela janela de tentativa. O status do lead muda para <strong>Lead Sem Contato</strong>. Uma confirmação aparecerá na tela antes de efetivar a ação. Evidências fotográficas também são necessárias para registrar o sem contato.",
      },
      {
        pergunta: "O que acontece quando clico em 'Lead sem interesse'?",
        resposta: "Esta ação <strong>encerra o funil</strong> daquele lead — o médico foi contatado, mas não tem interesse no produto. O status muda para <strong>Lead Sem Interesse</strong> e a data de encerramento é registrada. <em>Atenção: esta ação é irreversível. Uma janela de confirmação aparecerá antes de concluir.</em> Também é necessário fornecer uma observação (mínimo 10 caracteres) e pelo menos 1 evidência.",
      },
      {
        pergunta: "O que é o modal de compra que abre ao registrar uma tentativa?",
        resposta: "Ao clicar em <strong>'Continuar para compra'</strong>, um modal de tela cheia se abre mostrando: no cabeçalho, a confirmação de que a observação e as evidências foram validadas; e abaixo, o <strong>formulário de Compra completo pré-preenchido</strong> com os dados do médico (nome, CRM, celular, e-mail, especialidade). Preencha os dados do paciente e produtos e clique em <strong>'Registrar compra e tentativa'</strong> — tudo é enviado ao Zoho de uma vez. Se fechar o modal, a tentativa <em>não</em> será registrada — você precisará repetir o processo.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     ATALHOS RÁPIDOS NO DETALHE DO LEAD
  ══════════════════════════════════════════════ */
  {
    categoria: "Atalhos Rápidos no Detalhe do Lead",
    itens: [
      {
        pergunta: "O que são os ícones ao lado do e-mail do médico?",
        resposta: "Ao lado do e-mail do lead existe um ícone de <strong>envelope azul</strong>. Ao clicar, o portal abre automaticamente o seu aplicativo de e-mail padrão (Outlook, Gmail, etc.) com o endereço do médico já preenchido no destinatário — pronto para enviar.",
      },
      {
        pergunta: "Como entro em contato pelo WhatsApp direto do portal?",
        resposta: "Ao lado do campo <strong>Celular</strong> existe um ícone verde do <strong>WhatsApp</strong>. Ao clicar, o portal abre o WhatsApp Web (ou o app no celular) com a conversa direcionada para o número do médico, já com o código do Brasil (+55) adicionado automaticamente. Você só precisa digitar a mensagem e enviar.",
      },
      {
        pergunta: "Como abro o endereço do médico no Maps?",
        resposta: "Ao lado do endereço completo existe um ícone de <strong>direções azul</strong>. Clique nele para abrir o <strong>Google Maps</strong> com o endereço do médico já pesquisado. Em iPhones, o iOS pode oferecer a opção de abrir no <strong>Apple Maps</strong> automaticamente.",
      },
      {
        pergunta: "Esses atalhos funcionam no celular também?",
        resposta: "Sim! No celular, os atalhos ficam ainda mais práticos: o ícone de e-mail abre o app de e-mail do dispositivo, o de WhatsApp abre o aplicativo do WhatsApp diretamente, e o de Maps abre o app de mapas nativo do iPhone (Apple Maps) ou do Android (Google Maps).",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     PRIMEIROS PASSOS E RASCUNHOS
  ══════════════════════════════════════════════ */
  {
    categoria: "Primeiros Passos e Rascunhos",
    itens: [
      {
        pergunta: "Posso interromper o preenchimento de um formulário e continuar depois?",
        resposta: "Sim! Em qualquer formulário (Compra, Recompra, Proposta ou Ocorrência), você pode clicar no botão <strong>'Salvar formulário'</strong> (botão cinza secundário). Isso criará um rascunho armazenado localmente. Acesse depois em <strong>'Formulários Salvos'</strong> no menu. Lá você verá o prazo de expiração (<strong>15 dias</strong>) e poderá clicar em 'Recuperar' para voltar de onde parou.",
      },
      {
        pergunta: "Como tenho certeza de que não digitei nada errado antes de enviar?",
        resposta: "Todos os formulários possuem um botão <strong>'Rever formulário'</strong> (na seção de botões de ação). Ao clicar nele, um modal se abrirá mostrando um resumo completo de todos os dados preenchidos: paciente, endereço, produtos, etc. Sempre use essa opção para fazer uma dupla checagem antes de clicar em 'Enviar'.",
      },
      {
        pergunta: "O sistema valida CPF e CNPJ automaticamente?",
        resposta: "Sim! O sistema formata e valida os dígitos do CPF em tempo real conforme você digita. Se o número for inválido, o campo ficará com um alerta visual e o envio do formulário será bloqueado até que um CPF correto seja inserido.",
      },
      {
        pergunta: "Por que meu rascunho expirou?",
        resposta: "Os rascunhos têm validade de <strong>15 dias</strong>. Após esse período, o rascunho é automaticamente removido. Lembre-se de finalizar ou recuperar seus rascunhos periodicamente.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     FACILIDADES E PREENCHIMENTO AUTOMÁTICO
  ══════════════════════════════════════════════ */
  {
    categoria: "Facilidades e Preenchimento Automático",
    itens: [
      {
        pergunta: "Preciso digitar o endereço inteiro do paciente manualmente?",
        resposta: "Não! Basta digitar ou colar o CEP no campo <strong>'Buscar CEP'</strong> e clicar no botão verde 'Buscar'. O sistema preencherá automaticamente a Rua, Bairro, Cidade e Estado. Você só precisará preencher o Número e o Complemento (se houver).",
      },
      {
        pergunta: "Como funciona a busca automática de cliente na Recompra?",
        resposta: "Na tela de <strong>Recompra</strong>, existe uma seção chamada 'Buscar cliente' no topo. Digite o CPF do cliente e clique em 'Buscar'. O sistema localizará o cadastro no CRM e preencherá automaticamente todos os dados pessoais, de contato e endereço. Se você editar o endereço depois, o sistema marcará a flag <strong>'Atualização via portal'</strong> para informar ao back-office.",
      },
      {
        pergunta: "Como funciona a busca de pedidos na Ocorrência?",
        resposta: "Na tela de <strong>Ocorrência</strong>, existe um campo de busca no topo onde você digita o número do pedido. O sistema puxará automaticamente os dados do paciente, os produtos comprados (com quantidades corretas), a AWB e as datas, poupando você de digitar tudo manualmente.",
      },
      {
        pergunta: "O que é a busca de cliente por CPF na Compra e Proposta?",
        resposta: "Alguns formulários possuem campos de busca para localizar clientes já cadastrados no CRM. Se o cliente não for encontrado, você ainda pode preencher os dados manualmente e criar um novo cadastro.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     REGRAS DE COMPRA, RECOMPRA E PROPOSTA
  ══════════════════════════════════════════════ */
  {
    categoria: "Regras de Compra, Recompra e Proposta",
    itens: [
      {
        pergunta: "Qual é a diferença entre a tela de Compra e a de Proposta?",
        resposta: "A tela de <strong>Compra</strong> é focada em <strong>Pessoas Físicas (pacientes)</strong>. Já a tela de <strong>Proposta</strong> possui um seletor 'Tipo de Cliente' onde você pode alternar entre 'Pessoa Física' e <strong>'Pessoa Jurídica'</strong>. Ao selecionar Pessoa Jurídica, o sistema abrirá campos para Razão Social, CNPJ, Telefone, E-mail da Empresa e dados do Representante da Empresa.",
      },
      {
        pergunta: "Por que os campos mudaram quando troquei o Tipo de Cliente na Proposta?",
        resposta: "Quando você muda o 'Tipo de Cliente' na Proposta (de Pessoa Física para Jurídica ou vice-versa), o sistema <strong>limpa automaticamente todos os campos</strong> do formulário anterior para evitar confusão de dados.",
      },
      {
        pergunta: "O que é a 'Atualização via portal ativa' na Recompra?",
        resposta: "Quando você busca um cliente pelo CPF na Recompra e depois edita manualmente algum dado de endereço, o sistema detecta a mudança e ativa a flag <strong>'Atualização via portal ativa'</strong>. Isso informa ao back-office que o cliente tem um novo endereço que precisa ser validado.",
      },
      {
        pergunta: "Como eu peço um link de pagamento (Pagar-Me) para o cliente?",
        resposta: "Nos formulários de Compra, Recompra e Proposta, marque a caixa <strong>'Negociação feita pelo consultor?'</strong>. Isso abrirá novos campos onde você marca 'Sim' para <strong>'Solicitar link para pagamento?'</strong> e escolhe o tipo: <strong>Pagar-Me</strong>.",
      },
      {
        pergunta: "O que é a Campanha Diretoria?",
        resposta: "Na tela de Compra e Recompra, existe um checkbox para <strong>'Campanha Diretoria'</strong>. Marque-o se a compra está relacionada a uma campanha especial da diretoria. Isso sinaliza o registro no sistema para análise posterior.",
      },
      {
        pergunta: "Como funciona o fluxo de Parceria?",
        resposta: "Se você tem parceiros configurados no seu perfil, ao clicar em <strong>'Enviar'</strong> em qualquer formulário (Compra, Recompra ou Proposta), um modal aparecerá com duas opções: <strong>'Enviar no meu nome (consultor)'</strong> ou <strong>'Enviar com parceiro'</strong>. Escolha a opção desejada, selecione o parceiro e confirme.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     CAMPOS OBRIGATÓRIOS E VALIDAÇÕES
  ══════════════════════════════════════════════ */
  {
    categoria: "Campos Obrigatórios e Validações",
    itens: [
      {
        pergunta: "Quais são os campos obrigatórios que não posso deixar em branco?",
        resposta: "<strong>Na seção Dados do Paciente:</strong> Nome, Sobrenome e Celular são obrigatórios. <strong>Na seção de Produtos:</strong> selecione pelo menos um produto com quantidade mínima de 1. Se marcar 'Representante Legal', todos os campos dele ficam obrigatórios. Igualmente, se marcar 'Novo Médico Prescritor', todos os campos do médico ficam obrigatórios.",
      },
      {
        pergunta: "Como a quantidade de produto é validada?",
        resposta: "A quantidade de cada produto <strong>não pode ser zero ou negativa</strong>. O sistema bloqueia o envio se algum produto selecionado tiver quantidade menor ou igual a 0. A quantidade deve ser um número inteiro.",
      },
      {
        pergunta: "Preciso preencher CPF e RG obrigatoriamente?",
        resposta: "O CPF é fortemente recomendado (e será validado se preenchido), mas o RG é opcional. Se preencher o CPF, o sistema verificará se é válido pelo algoritmo oficial — se inválido, bloqueia o envio.",
      },
      {
        pergunta: "Quais dados são obrigatórios do Representante Legal?",
        resposta: "Se você marcar 'Tem Representante Legal', todos estes campos ficam obrigatórios: <strong>Nome, CPF, Celular e Data de Nascimento</strong>. RG e E-mail são opcionais.",
      },
      {
        pergunta: "Quais dados são obrigatórios do Novo Médico Prescritor?",
        resposta: "Se você marcar 'Tem novo médico prescritor', todos estes campos ficam obrigatórios: <strong>Nome, CRM, UF do CRM, Celular, E-mail e Especialidade</strong>.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     ANEXOS E LIMITE DE ARQUIVO
  ══════════════════════════════════════════════ */
  {
    categoria: "Anexos e Limite de Arquivo",
    itens: [
      {
        pergunta: "Quantos arquivos posso anexar em um formulário?",
        resposta: "Você pode anexar no máximo <strong>5 arquivos</strong> por formulário. Quando atingir esse limite, o botão de upload será desativado. Se precisar de mais arquivos, remova alguns antes de adicionar outros.",
      },
      {
        pergunta: "Quais tipos de documento devo anexar?",
        resposta: "Os documentos recomendados são: <strong>Receita (prescrição médica), Documento de Identidade do Paciente (CPF ou RG), Comprovante de Endereço, Autorização da Anvisa, Documento de Identidade do Representante Legal</strong>. O sistema aceita qualquer tipo de arquivo.",
      },
      {
        pergunta: "O que significa a opção 'Documentos Completos?'",
        resposta: "Após fazer upload dos arquivos, marque a caixa <strong>'Documentos Completos?'</strong> se todos os documentos necessários foram anexados. Isso sinaliza ao back-office que o processo pode seguir sem falta de documentação.",
      },
      {
        pergunta: "Posso remover um arquivo que anexei por engano?",
        resposta: "Sim! Cada arquivo listado tem um botão 'X' vermelho ao lado. Clique nele para remover. Você pode adicionar e remover arquivos quantas vezes quiser antes de enviar.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     PRODUTOS E QUANTIDADE
  ══════════════════════════════════════════════ */
  {
    categoria: "Produtos e Quantidade",
    itens: [
      {
        pergunta: "Como adiciono mais de um produto no mesmo formulário?",
        resposta: "Na seção de Produtos, preencha o primeiro item com o nome e a quantidade. Depois clique no botão verde <strong>'+ Adicionar Produto'</strong>. Uma nova linha aparecerá. Para remover um produto extra, clique no botão vermelho 'Remover' ao lado dele.",
      },
      {
        pergunta: "O que fazer se os produtos não carregam na lista?",
        resposta: "Na primeira vez que você acessa um formulário, o sistema busca todos os produtos disponíveis no Zoho. Se a lista não aparecer imediatamente, aguarde alguns segundos. Se o problema persistir, recarregue a página (F5).",
      },
      {
        pergunta: "Posso enviar o formulário sem selecionar nenhum produto?",
        resposta: "Não. O sistema exige que você selecione <strong>pelo menos um produto</strong> com quantidade válida (mínimo 1). O primeiro produto já vem pré-adicionado — preencha-o antes de enviar.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     FORMAS DE PAGAMENTO E OBSERVAÇÕES
  ══════════════════════════════════════════════ */
  {
    categoria: "Formas de Pagamento e Observações",
    itens: [
      {
        pergunta: "Quais formas de pagamento estão disponíveis?",
        resposta: "<strong>Boleto, Cartão de Crédito, Depósito, Conta Internacional, PIX e TED (Transferência Bancária)</strong>. Selecione a forma acordada com o cliente.",
      },
      {
        pergunta: "O campo 'Termos e condições de pagamento' é obrigatório?",
        resposta: "Não é estritamente obrigatório, mas é <strong>fortemente recomendado</strong> descrever as condições específicas — parcelamento, percentual de entrada, prazos de vencimento etc. Isso evita confusões posteriores.",
      },
      {
        pergunta: "Posso deixar a Observação em branco?",
        resposta: "Sim, a Observação é opcional. Mas é muito útil para registrar informações importantes que não cabem em outros campos, como contratos especiais, demandas urgentes ou pedidos de casos complexos.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     MENU E NAVEGAÇÃO
  ══════════════════════════════════════════════ */
  {
    categoria: "Menu e Navegação",
    itens: [
      {
        pergunta: "Como funciona o menu do portal?",
        resposta: "No <strong>computador</strong>, o menu fica fixo na <strong>barra lateral esquerda</strong>, sempre visível. Os itens estão organizados em três grupos: <strong>Principal</strong> (Home e Leads Médicos), <strong>Comercial</strong> (Compra, Recompra, Proposta, Central Comercial, Rastreamento) e <strong>Suporte</strong> (Ocorrência, Formulários Salvos, Manual). No <strong>celular</strong>, o menu é acessado pelo ícone de hambúrguer (☰) no canto superior esquerdo — um painel deslizante se abre com a mesma estrutura.",
      },
      {
        pergunta: "Como acesso os diferentes módulos e formulários?",
        resposta: "Na barra lateral (desktop) ou no menu deslizante (mobile), clique no item desejado: <strong>Home, Leads Médicos, Compra, Recompra, Proposta, Ocorrência, Formulários Salvos ou Manual</strong>. O item ativo fica destacado com fundo escuro e uma barra branca à esquerda.",
      },
      {
        pergunta: "O que é a Home e o que ela mostra?",
        resposta: "A Home é o painel principal do portal. Ela exibe uma <strong>saudação personalizada</strong> com seu nome, além de <strong>4 indicadores (KPIs)</strong>: Total de leads na sua carteira, Taxa de conversão, Leads criados este mês e Formulários pendentes. Abaixo dos KPIs, há <strong>atalhos rápidos</strong> para todos os módulos que você tem acesso, facilitando a navegação sem precisar usar o menu lateral.",
      },
      {
        pergunta: "Onde vejo meus formulários salvos?",
        resposta: "Clique em <strong>'Formulários Salvos'</strong> no menu. Lá você verá todos os rascunhos salvos, a data de salvamento, o tipo de formulário e quanto tempo falta para expirar (15 dias).",
      },
      {
        pergunta: "Como volto à Home a qualquer momento?",
        resposta: "Clique em <strong>'Home'</strong> no menu lateral (ícone de grade/dashboard). Você também pode usar os atalhos da própria Home para acessar qualquer módulo rapidamente.",
      },
      {
        pergunta: "Como funciona o ícone de mensagens e notificações?",
        resposta: "No canto superior direito (desktop) ou no cabeçalho móvel, existem dois ícones: <strong>mensagens</strong> e <strong>notificações</strong>. Ao clicar no sino de notificações, abre um painel com atualizações dos envios de Compra, Recompra, Proposta e Ocorrência — mostrando sucessos e alertas de falha. O contador vermelho indica itens não lidos.",
      },
      {
        pergunta: "Como faço logout do portal?",
        resposta: "No <strong>desktop</strong>, clique no ícone de saída (seta para fora) no rodapé da barra lateral esquerda, ao lado do seu nome. No <strong>celular</strong>, abra o menu deslizante e toque no mesmo ícone de logout no rodapé do drawer.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     FORMULÁRIOS SALVOS E OCORRÊNCIAS
  ══════════════════════════════════════════════ */
  {
    categoria: "Formulários Salvos e Ocorrências",
    itens: [
      {
        pergunta: "Como uso os filtros em Formulários Salvos?",
        resposta: "No topo da tela, você pode filtrar por <strong>Todos, Compra, Recompra, Proposta</strong> e <strong>Ocorrência</strong>. Ao clicar em Ocorrência, a lista abre com os subtítulos específicos do atendimento, facilitando a leitura.",
      },
      {
        pergunta: "O que significam os subtítulos de Ocorrência?",
        resposta: "<strong>Não atendidas:</strong> o caso ainda não recebeu um analista. <strong>Em tratamento:</strong> já existe um responsável acompanhando. <strong>Resolvidas:</strong> ocorrências finalizadas.",
      },
      {
        pergunta: "Por que as ocorrências resolvidas continuam aparecendo por alguns dias?",
        resposta: "Quando uma ocorrência é marcada como resolvida no CRM, ela continua visível em Formulários Salvos por <strong>3 dias</strong>. Isso ajuda na conferência e rastreabilidade antes da remoção automática.",
      },
      {
        pergunta: "Como sei se a ocorrência foi realmente criada no CRM?",
        resposta: "O sistema valida a resposta do Zoho e só marca a ocorrência como confirmada quando o CRM retorna sucesso com identificador válido. Se algo falhar, a solicitação não será tratada como concluída.",
      },
    ],
  },

  /* ══════════════════════════════════════════════
     DICAS DE EFICIÊNCIA
  ══════════════════════════════════════════════ */
  {
    categoria: "Dicas de Eficiência",
    itens: [
      {
        pergunta: "Como agilizar o atendimento de um lead médico?",
        resposta: "<strong>1.</strong> Use o <strong>atalho do WhatsApp</strong> ao lado do celular para contatar o médico sem sair do portal. <strong>2.</strong> Use o <strong>atalho de e-mail</strong> para enviar mensagens diretamente. <strong>3.</strong> Confira a <strong>timeline</strong> no topo da página do lead para saber exatamente em qual etapa ele está. <strong>4.</strong> Use os <strong>filtros</strong> para encontrar leads por status ou período sem percorrer a lista inteira. <strong>5.</strong> <strong>Exporte para Excel</strong> para analisar sua carteira offline ou compartilhar com a gerência.",
      },
      {
        pergunta: "Como acelerar o preenchimento de um formulário de compra?",
        resposta: "<strong>1. Use a busca de CEP</strong> em vez de digitar o endereço manualmente. <strong>2. Use a busca de cliente</strong> na Recompra para puxar dados já cadastrados. <strong>3. Na Ocorrência, busque o pedido</strong> para preencher dados automaticamente. <strong>4. Reutilize rascunhos</strong> se estiver fazendo múltiplos pedidos similares.",
      },
      {
        pergunta: "Que cuidados devo tomar com dados de representante legal e médico?",
        resposta: "Sempre verifique os dados duas vezes. Se o médico não estiver cadastrado no CRM, ao marcar 'Novo Médico Prescritor', você cria o cadastro dele no sistema com os dados que preencher — certifique-se que estão corretos.",
      },
      {
        pergunta: "Como garantir que meu formulário será processado sem devoluções?",
        resposta: "<strong>1. Valide CPF e CEP</strong> pelas buscas automáticas. <strong>2. Verifique campos obrigatórios</strong> antes de enviar. <strong>3. Use 'Rever formulário'</strong> para dupla checagem. <strong>4. Anexe todos os documentos</strong> e marque 'Documentos Completos?'. <strong>5. Deixe observações claras</strong> se algo precisar de atenção especial.",
      },
    ],
  },
];

export default function FAQ() {
  const [openItemId, setOpenItemId] = useState("Primeiros Passos-0");
  const [searchTerm, setSearchTerm] = useState("");
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("Ex: ");

  useEffect(() => {
    const examples = ["WhatsApp", "exportar", "tentativa", "evidência", "filtros", "CEP"];
    const prefix = "Ex: ";
    const pauseMs = 1200;
    const typeMs = 85;
    const eraseMs = 45;

    let exampleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const tick = () => {
      const currentExample = examples[exampleIndex];

      if (!isDeleting) {
        charIndex += 1;
        setAnimatedPlaceholder(`${prefix}${currentExample.slice(0, charIndex)}`);

        if (charIndex === currentExample.length) {
          isDeleting = true;
          timeoutId = setTimeout(tick, pauseMs);
          return;
        }

        timeoutId = setTimeout(tick, typeMs);
        return;
      }

      charIndex -= 1;
      setAnimatedPlaceholder(`${prefix}${currentExample.slice(0, Math.max(charIndex, 0))}`);

      if (charIndex <= 0) {
        isDeleting = false;
        exampleIndex = (exampleIndex + 1) % examples.length;
      }

      timeoutId = setTimeout(tick, eraseMs);
    };

    timeoutId = setTimeout(tick, typeMs);

    return () => clearTimeout(timeoutId);
  }, []);

  function handleToggle(itemId) {
    setOpenItemId((currentItemId) => (currentItemId === itemId ? null : itemId));
  }

  // Filtra os dados baseado na busca
  const filteredFaqData = useMemo(() => {
    if (!searchTerm.trim()) return faqData;

    const searchLower = searchTerm.toLowerCase();

    return faqData
      .map((grupo) => ({
        ...grupo,
        itens: grupo.itens.filter(
          (item) =>
            item.pergunta.toLowerCase().includes(searchLower) ||
            item.resposta.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((grupo) => grupo.itens.length > 0);
  }, [searchTerm]);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12">
        <section className="bg-white rounded-2xl border border-tegra-gray-light shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tegra-blue-light/15 text-tegra-blue-dark flex-shrink-0">
              <MdHelpOutline className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-tegra-text-primary">
                FAQ e Ajuda
              </h1>
              <p className="mt-2 text-sm sm:text-base text-tegra-text-secondary max-w-3xl">
                Encontre orientações rápidas para preencher, revisar e enviar os formulários do portal com mais segurança.
              </p>
            </div>
          </div>
        </section>


        {/* Caixa de Busca */}
        <div className="mb-6 rounded-2xl border-2 border-tegra-blue-light/40 bg-white shadow-sm p-4 sm:p-5">
          <label
            htmlFor="faq-search"
            className="block text-sm sm:text-base font-semibold text-tegra-text-primary mb-2"
          >
            Pesquisar na FAQ
          </label>
          <p className="text-xs sm:text-sm text-tegra-text-secondary mb-3">
            Digite uma palavra-chave para filtrar as perguntas em tempo real.
          </p>
          <div className="relative">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-tegra-blue-dark" />
            <input
              id="faq-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={animatedPlaceholder}
              className="w-full pl-12 pr-12 sm:pr-14 py-3 sm:py-4 rounded-xl border-2 border-tegra-blue-light/60 bg-tegra-bg-accent text-tegra-text-primary placeholder-tegra-text-secondary focus:outline-none focus:border-tegra-blue focus:ring-2 focus:ring-tegra-blue-light/30 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 text-tegra-text-secondary hover:text-tegra-text-primary transition-colors"
                aria-label="Limpar busca"
              >
                <MdClose className="text-xl" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-tegra-text-secondary">
              Encontrados <strong>{filteredFaqData.reduce((acc, g) => acc + g.itens.length, 0)}</strong> resultado(s)
            </p>
          )}
        </div>

        {/* Resultado vazio */}
        {searchTerm && filteredFaqData.length === 0 && (
          <div className="bg-tegra-bg-accent rounded-2xl border-2 border-dashed border-tegra-blue-light p-8 text-center">
            <MdSearch className="text-4xl text-tegra-blue-light/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-tegra-text-primary mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-tegra-text-secondary max-w-md mx-auto">
              Não encontramos respostas para "<strong>{searchTerm}</strong>". Tente usar outras palavras-chave ou navegue pelas categorias abaixo.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {filteredFaqData.map((grupo) => (
            <section key={grupo.categoria} className="bg-white rounded-2xl border border-tegra-gray-light shadow-sm p-4 sm:p-6">
              <div className="mb-4 sm:mb-5">
                <h2 className="text-lg sm:text-xl font-semibold text-tegra-text-primary">
                  {grupo.categoria}
                </h2>
              </div>

              <div className="space-y-3">
                {grupo.itens.map((item, index) => {
                  const itemId = `${grupo.categoria}-${index}`;
                  const isOpen = openItemId === itemId;

                  return (
                    <article
                      key={itemId}
                      className="rounded-xl border border-tegra-gray-light bg-white overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggle(itemId)}
                        className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm sm:text-base font-medium text-tegra-text-primary">
                          {item.pergunta}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tegra-blue-light/10 text-tegra-blue-dark flex-shrink-0">
                          {isOpen ? <MdRemove className="text-xl" /> : <MdAdd className="text-xl" />}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                          <div className="h-px bg-tegra-gray-light mb-4" />
                          <div
                            className="text-sm sm:text-base leading-7 text-tegra-text-secondary"
                            dangerouslySetInnerHTML={{ __html: item.resposta }}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}