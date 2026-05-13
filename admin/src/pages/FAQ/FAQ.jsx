import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdRemove, MdHelpOutline, MdSearch, MdClose } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";

const faqData = [
  {
    categoria: "Primeiros Passos e Rascunhos",
    itens: [
      {
        pergunta: "Posso interromper o preenchimento de um formulário e continuar depois?",
        resposta: "Sim! Em qualquer formulário (Compra, Recompra, Proposta ou Ocorrência), você pode clicar no botão <strong>'Salvar formulário'</strong> (botão cinza secundário). Isso criará um rascunho que será armazenado. Você pode acessá-lo depois no menu <strong>'Formulários Salvos'</strong>. Lá você verá o prazo de expiração (que é de <strong>15 dias</strong>) e poderá clicar em 'Recuperar' para voltar exatamente de onde parou.",
      },
      {
        pergunta: "Como tenho certeza de que não digitei nada errado antes de enviar?",
        resposta: "Todos os formulários possuem um botão <strong>'Rever formulário'</strong> (na seção de botões de ação). Ao clicar nele, um modal se abrirá na tela mostrando um resumo completo de todos os dados que você preencheu: paciente, endereço, produtos, etc. Sempre use essa opção para fazer uma dupla checagem antes de clicar em 'Enviar'.",
      },
      {
        pergunta: "O sistema valida CPF e CNPJ automaticamente?",
        resposta: "Sim! O sistema formata e valida os dígitos do CPF em tempo real conforme você digita. Se o número for inválido, o campo ficará com um alerta visual e o envio do formulário será bloqueado até que um CPF correto seja inserido.",
      },
      {
        pergunta: "Por que meu rascunho expirou?",
        resposta: "Os rascunhos têm validade de 15 dias. Após esse período, o rascunho é automaticamente removido do sistema. Lembre-se de finalizar ou recuperar seus rascunhos periodicamente.",
      },
    ],
  },
  {
    categoria: "Facilidades e Preenchimento Automático",
    itens: [
      {
        pergunta: "Preciso digitar o endereço inteiro do paciente manualmente?",
        resposta: "Não! Basta digitar ou colar o CEP no campo <strong>'Buscar CEP'</strong> e clicar no botão verde 'Buscar'. O sistema preencherá automaticamente a Rua, Bairro, Cidade e Estado. Você só precisará preencher o Número e o Complemento (se houver).",
      },
      {
        pergunta: "Como funciona a busca automática de cliente na Recompra?",
        resposta: "Na tela de <strong>Recompra</strong>, existe uma seção chamada 'Buscar cliente' no topo. Digite o CPF do cliente e clique em 'Buscar'. O sistema localizará o cadastro no CRM e preencherá automaticamente todos os dados pessoais, de contato e o endereço atual dele. Se você editar o endereço depois, o sistema marcará uma flag de 'Atualização via portal' para informar ao back-office que o endereço mudou.",
      },
      {
        pergunta: "Como funciona a busca de pedidos na Ocorrência?",
        resposta: "Na tela de <strong>Ocorrência</strong>, existe um campo de busca no topo onde você digita o número do pedido. O sistema puxará automaticamente os dados do paciente, os produtos que ele comprou (com quantidades corretas), a AWB e as datas, poupando você de digitar tudo manualmente.",
      },
      {
        pergunta: "O que é a busca de cliente por CPF na Compra e Proposta?",
        resposta: "Alguns formulários possuem campos de busca para localizar clientes já cadastrados no CRM pela Recompra. Se o cliente não for encontrado, você ainda consegue preencher os dados manualmente e criar um novo cadastro.",
      },
    ],
  },
  {
    categoria: "Regras de Compra, Recompra e Proposta",
    itens: [
      {
        pergunta: "Qual é a diferença entre a tela de Compra e a de Proposta?",
        resposta: "A tela de <strong>Compra</strong> é focada em<strong> Pessoas Físicas (pacientes)</strong>. Já a tela de <strong>Proposta</strong> possui um seletor no topo chamado 'Tipo de Cliente' onde você pode mudar entre 'Pessoa Física' e <strong>'Pessoa Jurídica'</strong>. Ao selecionar Pessoa Jurídica, o sistema abrirá campos para Razão Social, CNPJ, Telefone, E-mail da Empresa e dados do Representante da Empresa.",
      },
      {
        pergunta: "Por que os campos mudaram quando troquei o Tipo de Cliente na Proposta?",
        resposta: "Quando você muda o 'Tipo de Cliente' na Proposta (de Pessoa Física para Jurídica ou vice-versa), o sistema <strong>limpa automaticamente todos os campos</strong> do formulário anterior para evitar confusão de dados. Você pode preencher o novo tipo de cliente desde o início.",
      },
      {
        pergunta: "O que é a 'Atualização via portal ativa' na Recompra?",
        resposta: "Quando você busca um cliente pelo CPF na Recompra e depois edita manualmente a rua, número, CEP ou outro dado de endereço, o sistema detecta a mudança automaticamente e ativa a flag <strong>'Atualização via portal ativa'</strong>. Isso informa ao back-office que o cliente tem um novo endereço que precisa ser validado.",
      },
      {
        pergunta: "Como eu peço um link de pagamento (Pagar-Me) para o cliente?",
        resposta: "Nos formulários de Compra, Recompra e Proposta, marque a caixa <strong>'Negociação feita pelo consultor?'</strong>. Isso abrirá novos campos onde você deve marcar 'Sim' para <strong>'Solicitar link para pagamento?'</strong> e escolher o tipo de link desejado: <strong>Pagar-Me</strong>.",
      },
      {
        pergunta: "O que é a Campanha Diretoria?",
        resposta: "Na tela de Compra e Recompra, existe um checkbox para <strong>'Campanha Diretoria'</strong>. Marque-o se a compra está relacionada a uma campanha especial da diretoria. Isso deixará o registro sinalizado no sistema para análise posterior.",
      },
    ],
  },
  {
    categoria: "Campos Obrigatórios e Validações",
    itens: [
      {
        pergunta: "Quais são os campos obrigatórios que não posso deixar em branco?",
        resposta: "<strong>Na seção Dados do Paciente:</strong> Nome, Sobrenome e Celular são obrigatórios. <strong>Na seção de Produtos:</strong> você precisa selecionar pelo menos um produto e sua quantidade (que deve ser no mínimo 1). Se marcar 'Representante Legal', todos os campos dele ficam obrigatórios. Igualmente, se marcar 'Novo Médico Prescritor', todos os campos referentes ao médico ficam obrigatórios.",
      },
      {
        pergunta: "Como a quantidade de produto é validada?",
        resposta: "A quantidade de cada produto <strong>não pode ser zero ou negativa</strong>. O sistema bloqueia o envio se algum produto selecionado tiver quantidade menor ou igual a 0. Lembre-se que a quantidade deve ser um número inteiro (sem decimais).",
      },
      {
        pergunta: "Preciso preencher CPF e RG obrigatoriamente?",
        resposta: "O CPF é fortemente recomendado (e será validado se preenchido), mas o RG é opcional. Se você preencher o CPF, o sistema verificará se é um CPF válido de acordo com o algoritmo oficial. Se for inválido, o formulário não será enviado.",
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
  {
    categoria: "Anexos e Limite de Arquivo",
    itens: [
      {
        pergunta: "Quantos arquivos posso anexar em um formulário?",
        resposta: "Você pode anexar uma máximo de <strong>5 arquivos</strong> por formulário. Quando atingir esse limite, o botão de upload será desativado. Se precisar de mais arquivos, remova alguns antes de tentar adicionar outros.",
      },
      {
        pergunta: "Quais tipos de documento devo anexar?",
        resposta: "Os documentos recomendados são: <strong>Receita (prescrição médica), Documento de Identidade do Paciente (CPF ou RG), Comprovante de Endereço, Autorização da Anvisa, Documento de Identidade do Representante Legal</strong>. O sistema aceita qualquer tipo de arquivo, mas é importante enviar os documentos relevantes para o caso.",
      },
      {
        pergunta: "O que significa a opção 'Documentos Completos?'",
        resposta: "Após fazer upload dos arquivos, marque a caixa <strong>'Documentos Completos?'</strong> se todos os documentos necessários para o atendimento foram anexados. Isso sinaliza ao back-office que o processo pode seguir sem falta de documentação.",
      },
      {
        pergunta: "Posso remover um arquivo que anexei por engano?",
        resposta: "Sim! Cada arquivo listado tem um botão 'X' vermelho ao lado. Clique nele para remover o arquivo. Você pode adicionar e remover arquivos quantas vezes quiser antes de enviar o formulário.",
      },
    ],
  },
  {
    categoria: "Produtos e Quantidade",
    itens: [
      {
        pergunta: "Como adiciono mais de um produto no mesmo formulário?",
        resposta: "Na seção de Produtos, preencha o primeiro item com o nome do produto e a quantidade. Depois clique no botão verde <strong>'+ Adicionar Produto'</strong>. Uma nova linha aparecerá onde você pode selecionar outro produto. Você pode adicionar quantos produtos quiser. Para remover um produto extra, clique no botão vermelho 'Remover' ao lado dele.",
      },
      {
        pergunta: "O que mudou se os produtos não carregam na lista?",
        resposta: "Na primeira vez que você acessa um formulário, o sistema faz uma busca por todos os produtos disponíveis no Zoho. Se a lista não aparecer imediatamente, aguarde alguns segundos. Se o problema persistir, recarregue a página (F5) e tente novamente.",
      },
      {
        pergunta: "Posso não selecionar nenhum produto e enviar assim mesmo?",
        resposta: "Não. O sistema exige que você selecione <strong>pelo menos um produto</strong> com quantidade válida (mínimo 1). O primeiro produto já vem pré-adicionado, então você precisa preenchê-lo antes de enviar.",
      },
    ],
  },
  {
    categoria: "Formas de Pagamento e Observações",
    itens: [
      {
        pergunta: "Quais formas de pagamento estão disponíveis?",
        resposta: "<strong>As opções são: Boleto, Cartão de Crédito, Depósito, Conta Internacional, PIX e TED (Transferência Bancária)</strong>. Selecione a forma acordada com o cliente.",
      },
      {
        pergunta: "O campo 'Termos e condições de pagamento' é obrigatório?",
        resposta: "Não é estritamente obrigatório, mas é <strong>fortemente recomendado</strong> descrever as condições específicas, como parcelamento, percentual de entrada, prazos de vencimento, etc. Isso evita confusões posteriores.",
      },
      {
        pergunta: "Posso deixar a Observação em branco?",
        resposta: "Sim, a Observação é opcional. Mas ela é muito útil para deixar informações importantes que não cabem em outros campos, como contratos especiais, demandas urgentes, pedidos de casos complexos, etc.",
      },
    ],
  },
  {
    categoria: "Menu e Navegação",
    itens: [
      {
        pergunta: "Como acesso os diferentes formulários?",
        resposta: "No menu lateral ou superior, você verá estes itens: <strong>Home, Compra, Recompra, Proposta, Ocorrência, Formulários Salvos e FAQ e Ajuda</strong>. Clique no item desejado para acessar o formulário correspondente.",
      },
      {
        pergunta: "Onde vejo meus formulários salvos?",
        resposta: "Clique em <strong>'Formulários Salvos'</strong> no menu. Lá você verá uma lista com todos os rascunhos que você salvou, a data de salvamento, o tipo de formulário e quanto tempo falta para expirar (15 dias).",
      },
      {
        pergunta: "Como volto à Home do Dashboard?",
        resposta: "Clique em <strong>'Home'</strong> no menu lateral ou superior. Na página inicial, você verá atalhos para as principais funcionalidades e um resumo da quantidade de formulários salvos.",
      },
      {
        pergunta: "Posso sair do sistema e fazer login novamente?",
        resposta: "Sim. No menu lateral (em dispositivos móveis), você verá um botão <strong>'Meu Perfil'</strong> no rodapé. Clique nele para acessar opções de perfil e logout.",
      },
    ],
  },
  {
    categoria: "Formulários Salvos e Ocorrências",
    itens: [
      {
        pergunta: "Como uso os filtros em Formulários Salvos?",
        resposta: "No topo da tela, você pode filtrar por <strong>Todos, Compra, Recompra, Proposta</strong> e <strong>Ocorrência</strong>. Ao clicar em Ocorrência, a bandeja abre com os subtítulos específicos do atendimento, para facilitar a leitura e a busca dos casos.",
      },
      {
        pergunta: "O que significam os subtítulos de Ocorrência?",
        resposta: "Os subtítulos organizam as ocorrências por situação no CRM. <strong>Não atendidas</strong> indica que o caso ainda não recebeu um analista, <strong>Em tratamento</strong> mostra que já existe um responsável acompanhando o caso e <strong>Resolvidas</strong> exibe as ocorrências finalizadas.",
      },
      {
        pergunta: "Por que as ocorrências resolvidas continuam aparecendo por alguns dias?",
        resposta: "Quando uma ocorrência é marcada como resolvida no CRM, ela continua visível em Formulários Salvos por <strong>3 dias</strong>. Isso ajuda na conferência e na rastreabilidade antes da remoção automática do card.",
      },
      {
        pergunta: "Como sei se a ocorrência foi realmente criada no CRM?",
        resposta: "O sistema não considera a solicitação como enviada apenas por gerar protocolo. Ele valida a resposta do Zoho e só marca a ocorrência como confirmada quando o CRM retorna sucesso com identificador válido. Se algo falhar, a solicitação não é tratada como concluída.",
      },
    ],
  },
  {
    categoria: "Dicas de Eficiência",
    itens: [
      {
        pergunta: "Como acelerar o preenchimento de um formulário?",
        resposta: "<strong>1. Use a busca de CEP</strong> em vez de digitar endereço manual. <strong>2. Use a busca de cliente</strong> na Recompra para puxar dados já cadastrados. <strong>3. Na Ocorrência, busque o pedido</strong> para preenchat dados do paciente e produtos automaticamente. <strong>4. Reutilize rascunhos</strong> se estiver fazendo múltiplos pedidos similares.",
      },
      {
        pergunta: "Que cuidados devo tomar com dados de representante legal e médico?",
        resposta: "Sempre verifique os dados duas vezes, pois eles também precisam estar corretos e completamente validados. Se o médico não estiver cadastrado no CRM, ao marcar 'Novo Médico Prescritor', você cria seu cadastro no sistema com os dados que preencher.",
      },
      {
        pergunta: "Como garantir que meu formulário será processado sem devoluções?",
        resposta: "<strong>1. Valide CPF e CEP</strong> usando as buscas automáticas. <strong>2. Verifique campos obrigatórios</strong> antes de enviar. <strong>3. Use a função 'Rever formulário'</strong> para dupla checagem. <strong>4. Anexe todos os documentos</strong> e marque 'Documentos Completos?'. <strong>5. Deixe observações claras</strong> se algo precisar de atenção especial.",
      },
    ],
  },
];

export default function FAQ() {
  const [openItemId, setOpenItemId] = useState("Primeiros Passos-0");
  const [searchTerm, setSearchTerm] = useState("");
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("Ex: ");

  useEffect(() => {
    const examples = ["rascunho", "CEP", "documentos", "pagamento"];
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