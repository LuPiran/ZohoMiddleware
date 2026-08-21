# Leads Médicos — Novos status, campos e sessão no Zoho CRM

**Contexto:** o Portal já está pronto para sincronizar tudo isso — falta só criar os campos/status **dentro do Zoho** (Setup → Customization → Modules and Fields → módulo **Leads Médicos**, API name `Leads_M_dicos`). Sem isso, os PUTs do Portal vão falhar silenciosamente ou ser ignorados nesses campos específicos (o resto do sync continua funcionando normalmente).

> **Antes de mexer em produção:** se você tiver Sandbox (Setup → Data Administration → Sandbox), faça tudo lá primeiro e confira que o Portal (apontando pro Sandbox) sincroniza certo antes de replicar em produção.

> **Cuidado com o Auto Api Name:** esta org já tem o hábito de gerar API Names estranhos quando o rótulo tem acento — é por isso que "Leads Médicos" virou `Leads_M_dicos` e "Data Lead Qualificação" virou `Data_Lead_qualifica_o`. Ao criar cada campo abaixo, **confira o campo "API Name" na tela de criação antes de salvar** e ajuste manualmente para o nome exato da tabela (ou, se preferir deixar o Zoho gerar o nome dele, me avise o nome final que eu troco a variável de ambiente correspondente no backend — todos esses nomes são configuráveis via `.env`, não estão hardcoded).

---

## 1. Dois novos valores no picklist `Status`

Campo existente, só adicionar 2 valores novos:

**Setup → Customization → Modules and Fields → Leads Médicos → campo `Status` → Edit Properties → Picklist Values → + Add**

| Valor novo | Quando aparece |
|---|---|
| `Lead Rejeitado` | Consultor recusou a oferta, ou não aceitou em 48h |
| `Lead Sem Tratativa` | 3ª tentativa venceu sem pedir a 4ª, ou a 4ª venceu sem tratamento |

Sugestão de cor (opcional, só estética — é a mesma cor usada no Portal): `Lead Rejeitado` em cinza, `Lead Sem Tratativa` em vermelho escuro.

---

## 2. Dois campos de data novos

Podem ficar no layout principal, perto de `Data Lead Sem Contato`/`Data Lead Sem Interesse`.

| Rótulo sugerido | API Name (obrigatório bater com o `.env`) | Tipo | Quando é preenchido |
|---|---|---|---|
| Data Lead Rejeitado | `Data_Lead_Rejeitado` | Date | No momento da recusa ou do estouro de 48h |
| Data Lead Sem Tratativa | `Data_Lead_Sem_Tratativa` | Date | No momento em que a 3ª (sem pedido de 4ª) ou a 4ª tentativa vencem sem ação |

---

## 3. Nova sessão "4ª Tentativas de Contato"

**Setup → Customization → Modules and Fields → Leads Médicos → Layout → arraste um "Section" novo** → renomeie para `4ª Tentativas de Contato` → adicione os 5 campos abaixo dentro dela.

| Rótulo | API Name | Tipo | Observação |
|---|---|---|---|
| 4ª Tentativa | `Tentativa_4` | Multi-Line (texto longo) | Observação do contato — igual aos campos `Tentativa_1/2/3` já existentes |
| Status 4ª Tentativa | `Status_4_Tentativa` | Picklist | **Mesmos 2 valores** já usados em `Status_1/2/3_Tentativa`: `Tratado Pelo Consultor` e `Sem Retorno`. Mais fácil duplicar um dos campos existentes (clique direito → Duplicate/Clone, se a sua edição tiver essa opção) do que recriar os valores na mão |
| Data 4ª Tentativa | `Data_4_Tentativa` | Date | Funciona em 2 momentos: quando o consultor **pede** a 4ª tentativa, recebe a data-alvo que ele escolheu; quando a rodada é **tratada ou vence**, o Portal grava a data real por cima |
| Adicionar 4ª Tentativa | `Adicionar_4_Tentativa` | Checkbox (booleano) | Vira `true` assim que o consultor solicita a 4ª tentativa — igual ao padrão de `Adicionar_2_Tentativa`/`Adicionar_3_Tentativa` |
| Motivo 4ª Tentativa | `Motivo_4_Tentativa` | Multi-Line (texto longo) | **Este eu acrescentei além da sua lista original** — é o "campo de por que ele está solicitando essa tentativa" que você pediu no fluxo de solicitação |

A imagem de evidência da solicitação **não precisa de campo novo**: ela já sobe automaticamente como anexo do registro do Lead no Zoho (mesmo mecanismo que já usa pro WorkDrive nas tentativas 1-3).

---

## 4. Confirmar o campo de e-mail do consultor

Hoje, quando um lead é rejeitado, o Portal tenta mandar pro Zoho tanto o **nome** do consultor (campo `Consultor_Tegra`, já existe e funciona) quanto o **e-mail** dele — mas o e-mail só sincroniza se a variável `ZOHO_LEAD_EMAIL_CONSULTOR_FIELD` estiver configurada no backend, e hoje ela está **vazia por padrão** (nunca foi setada). Duas opções:

- Se já existe um campo de e-mail do consultor no Lead (ex. um lookup ou texto), me passa o API Name que eu aponto a variável pra ele.
- Se não existe, posso deixar como está (só o nome sincroniza) ou criar um campo `Email_Consultor` (texto) se você quiser essa informação disponível em relatórios/filtros do Zoho.

---

## 5. Fora do Zoho: ajustar o prazo de 48h em produção

Isso não é uma tela do Zoho, é uma variável de ambiente do backend (`SLA_OFFER_MINUTES`) que hoje só documentei no `.env.example` do repositório — o `.env` real do servidor de produção precisa ser atualizado manualmente por quem tem acesso a ele:

```
SLA_OFFER_MINUTES=2880
```

(2880 minutos = 48 horas)

---

## 6. Roteiro de teste

Faça isso no Sandbox (ou com um lead de teste em produção) depois de criar tudo acima:

| # | Cenário | Ação | Resultado esperado |
|---|---|---|---|
| 1 | Recusa explícita | Consultor recusa a oferta de um lead teste no Portal | `Status` = `Lead Rejeitado`, `Data_Lead_Rejeitado` preenchida, `Consultor_Tegra` mostra quem recusou |
| 2 | Timeout de 48h | Deixe a oferta vencer sem responder (ou baixe `SLA_OFFER_MINUTES` temporariamente pra testar mais rápido) | Mesmo resultado do item 1, só que o histórico no Portal mostra "sistema/sweeper" como autor |
| 3 | Pedido de 4ª tentativa | Na 3ª tentativa aberta, clique "Solicitar 4ª tentativa" e preencha data/motivo/evidência | `Adicionar_4_Tentativa` = true, `Data_4_Tentativa` = data escolhida, `Motivo_4_Tentativa` preenchido, e **`Data_1_Tentativa`/`Tentativa_1`/`Status_1_Tentativa` continuam intocados** (esse é o bug que corrigimos no código — vale conferir mesmo) |
| 4 | Tratar a 4ª tentativa | Registre a tentativa normalmente | `Status_4_Tentativa` = `Tratado Pelo Consultor`, `Status` do lead = `Lead Com Interesse` |
| 5 | 3ª vence sem pedir 4ª | Deixe a 3ª tentativa vencer sem clicar em "Solicitar 4ª tentativa" | `Status_3_Tentativa` = `Sem Retorno`, `Status` do lead = `Lead Sem Tratativa`, `Data_Lead_Sem_Tratativa` preenchida, observação genérica citando o nome do consultor |
| 6 | 4ª vence sem tratar | Peça a 4ª tentativa e deixe vencer sem tratar | Mesmo resultado do item 5, mas nos campos `Status_4_Tentativa`/`Tentativa_4` |

---

## 7. Para depois (você já pediu pra deixar pra próxima rodada)

Notificação por e-mail ao gerente quando um consultor rejeita/não aceita um lead — dá pra fazer com uma Workflow Rule disparando em cima do campo `Data_Lead_Rejeitado` (Field Update), no mesmo padrão de [`ZOHO-EMAIL-AVISO-CONSULTOR.md`](./ZOHO-EMAIL-AVISO-CONSULTOR.md). Quando quiser seguir com isso, me chama que eu monto o passo a passo.
