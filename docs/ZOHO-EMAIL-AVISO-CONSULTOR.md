# Zoho CRM — E-mail avisando o consultor sobre lead recebido

**Escopo:** o roteamento (região, round-robin, SLA) roda no **Portal**. No Zoho fica só uma coisa: quando o Portal atribuir um lead a um consultor, disparar um e-mail avisando.

**Premissas fechadas:**

- O Portal troca o `Owner` do lead via API (`PUT /crm/v8/Leads/{id}`).
- O e-mail dispara na **primeira atribuição e em todo repasse**.

---

## ⚠️ Leia isto antes de configurar qualquer coisa

Duas armadilhas derrubam exatamente este cenário. As duas são silenciosas — nada dá erro, o e-mail simplesmente não chega.

### 1. O parâmetro `trigger` da API

Por padrão a API dispara os workflows. Mas se o Portal mandar `"trigger": []` (array vazio) no corpo do PUT, **o Zoho suprime todas as automações** e o e-mail nunca sai.

```jsonc
// ❌ NÃO faça isso — mata o workflow
{ "data": [{ "Owner": { "id": "5000000123456" } }], "trigger": [] }

// ✅ Qualquer um dos dois funciona
{ "data": [{ "Owner": { "id": "5000000123456" } }], "trigger": ["workflow"] }
{ "data": [{ "Owner": { "id": "5000000123456" } }] }   // omitir também vale
```

Passe isso para quem está construindo o Portal **antes** dele escrever a chamada. É meia hora de debug economizada.

> Há uma exceção documentada que não afeta vocês, mas vale saber: se o update vier de uma **função Deluge disparada por workflow no mesmo registro**, o workflow não roda de novo, independente do `trigger`. Como o update de vocês vem de fora (Portal), isso não se aplica.

### 2. "Record Owner" como destinatário só existe da Enterprise para cima

No **Professional**, a opção *Record Owner* nem aparece na lista de destinatários da notificação. Aí o caminho é uma função Deluge curta.

Confira em **Setup → Subscription** e siga a seção 3 (Enterprise) **ou** a 4 (Professional). Todo o resto é igual.

---

## 1. O que o Portal precisa gravar

Além do `Owner`, peça para o Portal carimbar **um campo de controle na mesma chamada**. É ele que vai disparar a regra de forma confiável — explico o porquê na seção 2.

Crie em **Setup → Customization → Modules and Fields → Leads → Layout**:

| Rótulo | API Name | Tipo | Para quê |
|---|---|---|---|
| Data da Distribuição | `Data_Distribuicao` | Date/Time | Carimbo de cada atribuição — é o gatilho da regra |
| Qtd. de Repasses | `Qtd_Repasses` | Number | 0 na primeira, 1, 2, 3... nos repasses |
| Origem Geográfica | `Origem_Geografica` | Single Line | Opcional. Ex: `São Paulo/SP - DDD 11`. Vai no corpo do e-mail |

Chamada que o Portal deve fazer a cada atribuição:

```http
PUT https://www.zohoapis.com/crm/v8/Leads/5000000987654
Authorization: Zoho-oauthtoken {access_token}
Content-Type: application/json

{
  "data": [
    {
      "Owner": { "id": "5000000123456" },
      "Data_Distribuicao": "2026-08-14T14:00:02-03:00",
      "Qtd_Repasses": 0,
      "Origem_Geografica": "São Paulo/SP - DDD 11"
    }
  ],
  "trigger": ["workflow"]
}
```

O `Data_Distribuicao` tem que ser **sempre um valor novo** a cada atribuição (o horário do momento). Se repetir o mesmo valor, o Zoho entende que o campo não mudou e a regra não dispara.

---

## 2. A regra de workflow

**Setup → Automation → Workflow Rules → + Create Rule**

- **Módulo:** Leads
- **Nome:** `Aviso de lead atribuído ao consultor`
- **Execute this workflow rule based on** → **A Record Action** → **Field Update** → campo **`Data da Distribuição`**
- **Which leads?** → **All Leads** (ou `Owner is not empty`, se quiser uma trava extra)

### Por que disparar pelo carimbo e não pelo Owner

O gatilho *Field Update* apontado para o `Owner` parece o caminho óbvio, e em algumas contas ele aparece na lista de campos. Mas `Owner` é campo de sistema e **nem sempre está disponível** como gatilho — depende da edição e do layout.

Disparar por um campo que o **Portal controla** resolve isso de vez: funciona em qualquer edição, e como o Portal carimba um horário novo a cada atribuição, **o repasse dispara igual à primeira vez**. Era exatamente o requisito.

Se preferir tentar pelo `Owner` primeiro, tudo bem — só valide que ele aparece na lista de campos e que o segundo consultor também recebe o e-mail.

> **Atenção ao "repetir":** se você optar pelo gatilho **Edit** ou **Create or Edit** em vez de *Field Update*, marque **"Repeat this workflow every time a record is edited"**. Sem isso a regra dispara **uma única vez por registro** e nenhum repasse é avisado.

---

## 3. Caminho Enterprise / Ultimate — sem código

### 3.1 Modelo de e-mail

**Setup → Customization → Templates → Email Templates → + New Template** (módulo **Leads**).

Assunto:

```
[Novo Lead] ${Leads.Last Name} — ${Leads.City}/${Leads.State}
```

Corpo (os `${...}` são merge fields — use o seletor *Available Merge Fields* para inserir, não digite na mão):

```html
<p>Olá ${Leads.Lead Owner},</p>

<p>Um novo lead acabou de ser atribuído a você.</p>

<table cellpadding="6">
  <tr><td><b>Nome</b></td><td>${Leads.Last Name}</td></tr>
  <tr><td><b>Telefone</b></td><td>${Leads.Phone}</td></tr>
  <tr><td><b>E-mail</b></td><td>${Leads.Email}</td></tr>
  <tr><td><b>Cidade/UF</b></td><td>${Leads.City}/${Leads.State}</td></tr>
  <tr><td><b>Origem</b></td><td>${Leads.Origem Geografica}</td></tr>
</table>

<p><b>Faça o check-in no Portal do Consultor para iniciar o atendimento.</b><br>
Se o check-in não for feito no prazo, o lead será repassado para outro consultor.</p>

<p><a href="https://portaldoconsultor.tegrapharma.com/leads/${Leads.Lead Id}">Abrir no Portal</a></p>
```

Confirme com seu parceiro qual é a rota real do lead no Portal antes de fixar essa URL.

### 3.2 Notificação

**Setup → Automation → Actions → Email Notifications → + New**

- **Template:** o que você acabou de criar
- **Recipients:** **Record Owner**
- Salve

### 3.3 Amarrar na regra

Volte na workflow rule da seção 2 → **Instant Actions** → **Email Notification** → selecione a notificação → **Save**.

Pronto. Sem uma linha de código.

---

## 4. Caminho Professional — função Deluge

Sem *Record Owner* na lista de destinatários, a saída é montar o e-mail em código.

**Setup → Developer Hub → Functions → + New Function → Standalone**
Nome: `tegra_avisa_consultor` · Argumento: `leadId` (String)

```javascript
/* ============================================================
   tegra_avisa_consultor
   Avisa por e-mail o consultor que recebeu o lead.
   Trigger: Workflow Rule → Leads → Field Update (Data_Distribuicao)
   ============================================================ */

lead = zoho.crm.getRecordById("Leads", leadId.toLong());
dono = lead.get("Owner");

if(dono == null)
{
    info "Lead " + leadId + " sem dono — e-mail não enviado.";
    return "SEM_DONO";
}

emailConsultor = ifnull(dono.get("email"), "").toString();
nomeConsultor  = ifnull(dono.get("name"), "consultor").toString();

if(emailConsultor.trim() == "")
{
    info "Consultor " + nomeConsultor + " sem e-mail cadastrado.";
    return "SEM_EMAIL";
}

/* ---- dados do lead ---- */
nomeLead = ifnull(lead.get("Last_Name"), "(sem nome)").toString();
fone     = ifnull(lead.get("Phone"), ifnull(lead.get("Mobile"), "—")).toString();
mail     = ifnull(lead.get("Email"), "—").toString();
cidade   = ifnull(lead.get("City"), "—").toString();
uf       = ifnull(lead.get("State"), "").toString();
origem   = ifnull(lead.get("Origem_Geografica"), "—").toString();
repasses = ifnull(lead.get("Qtd_Repasses"), 0).toLong();

/* primeira atribuição ou repasse — muda só o tom da mensagem */
chamada = "Um novo lead acabou de ser atribuído a você.";
prefixo = "[Novo Lead]";
if(repasses > 0)
{
    chamada = "Um lead foi repassado para você (repasse nº " + repasses +
              "). O consultor anterior não fez o check-in no prazo.";
    prefixo = "[Lead Repassado]";
}

linkPortal = "https://portaldoconsultor.tegrapharma.com/leads/" + leadId;

corpo = "<p>Olá " + nomeConsultor + ",</p>" +
    "<p>" + chamada + "</p>" +
    "<table cellpadding='6'>" +
    "<tr><td><b>Nome</b></td><td>" + nomeLead + "</td></tr>" +
    "<tr><td><b>Telefone</b></td><td>" + fone + "</td></tr>" +
    "<tr><td><b>E-mail</b></td><td>" + mail + "</td></tr>" +
    "<tr><td><b>Cidade/UF</b></td><td>" + cidade + "/" + uf + "</td></tr>" +
    "<tr><td><b>Origem</b></td><td>" + origem + "</td></tr>" +
    "</table>" +
    "<p><b>Faça o check-in no Portal do Consultor para iniciar o atendimento.</b><br>" +
    "Se o check-in não for feito no prazo, o lead será repassado.</p>" +
    "<p><a href='" + linkPortal + "'>Abrir no Portal</a></p>";

sendmail
[
    from    : zoho.adminuserid
    to      : emailConsultor
    subject : prefixo + " " + nomeLead + " — " + cidade + "/" + uf
    message : corpo
]

info "E-mail enviado para " + emailConsultor;
return "OK";
```

Amarre na regra: **Instant Actions → Function → Existing → `tegra_avisa_consultor`** → **Edit Arguments** → `leadId` = **Leads > Lead Id** → Save.

O `from` tem que ser `zoho.adminuserid` ou um endereço verificado na org — endereço arbitrário o Zoho recusa.

Repare que essa versão ganha algo que a nativa não tem de graça: **assunto e texto diferentes no repasse**. Se você quiser isso na Enterprise, dá para fazer com duas regras (uma com critério `Qtd_Repasses is 0`, outra com `Qtd_Repasses > 0`) e dois templates.

---

## 5. Teste

Faça nesta ordem, com um lead de mentira e um consultor de teste:

| # | Ação | Esperado |
|---|---|---|
| 1 | Portal atribui o lead ao Consultor A | Consultor A recebe o e-mail |
| 2 | Conferir **Setup → Automation → Workflow Rules → a regra → Usage** | Contador de execuções subiu |
| 3 | Portal reatribui ao Consultor B (novo `Data_Distribuicao`) | **Consultor B recebe** — é aqui que se descobre se o repasse funciona |
| 4 | Portal manda o PUT com `"trigger": []` | E-mail **não** sai. Confirma que a armadilha é real |
| 5 | Atribuir a um usuário sem e-mail cadastrado | Nada quebra; no caminho Deluge, aparece o log "sem e-mail" |

O passo **3** é o único que importa de verdade. Uma regra mal configurada passa no teste 1 e falha no 3 — e aí o problema só aparece em produção, no primeiro repasse.

---

## 6. Coisas que podem te morder depois

**Ninguém é avisado se o Portal falhar.** O e-mail depende do Portal fazer o PUT. Se a chamada falhar, não há atribuição, não há e-mail e o lead fica parado sem ninguém perceber. Vale o Portal ter retry e log próprio — o Zoho não tem como saber que deveria ter recebido algo.

**Limite de e-mails.** Notificações para usuários internos consomem a cota de e-mails da org. Em campanha de volume alto, confira em *Setup → Email → Email Deliverability*.

**Sandbox não envia e-mail de verdade.** Dá para configurar e validar que a regra dispara, mas o teste real de entrega precisa ser em produção, com um consultor de teste.

**Fuso.** Se o Portal mandar `Data_Distribuicao` sem offset, o Zoho interpreta no fuso da org. Mande sempre com `-03:00` explícito.

**Merge field vazio.** Se `Origem_Geografica` vier em branco, o e-mail nativo mostra um espaço vazio na linha. Se incomodar, tire do template ou use o caminho Deluge, que já cai para `—`.

---

## Sources

- [Update Records — Zoho CRM API v8](https://www.zoho.com/crm/developer/docs/api/v8/update-records.html)
- [Configuring Workflow Rules — Zoho CRM](https://help.zoho.com/portal/en/kb/crm/automate-business-processes/workflows/articles/configuring-workflow-rules)
- [Email Notifications — Zoho CRM](https://help.zoho.com/portal/en/kb/crm/automate-business-processes/actions/articles/set-email-notifications)
- [Email Templates — Zoho CRM](https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-templates/articles/email-templates)
- [Send mail — Zoho Deluge](https://www.zoho.com/deluge/help/misc-statements/send-mail.html)
