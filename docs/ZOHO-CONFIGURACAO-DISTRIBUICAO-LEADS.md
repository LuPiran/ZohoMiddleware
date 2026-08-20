> ## ⚠️ DOCUMENTO SUPERADO — não implemente
>
> A decisão mudou: **o roteamento (região, round-robin, SLA de check-in) passou a ser feito no Portal**, não no Zoho. No Zoho ficou só o e-mail avisando o consultor.
>
> **Para implementar, use:** [`ZOHO-EMAIL-AVISO-CONSULTOR.md`](./ZOHO-EMAIL-AVISO-CONSULTOR.md)
>
> Este arquivo fica como referência do que foi avaliado e do porquê de cada escolha. Continua útil se um dia a distribuição voltar para o CRM, e a tabela DDD→UF da seção 5.2 (67 códigos, conferida contra a lista oficial) serve para o Portal também.

---

# Distribuição Regional de Leads — Configuração no Zoho CRM

Tudo que segue é feito **dentro do Zoho CRM**. Nada aqui depende do middleware ou do Portal do Consultor.

O fluxo: formulário → identificação geográfica → fila regional → round-robin → SLA de check-in de 10 min → repasse ao próximo da mesma região.

---

## 0. Antes de começar: confira a edição

**Setup → Subscription** (ou canto superior direito → *Subscription*).

Isso muda o desenho, então confira antes:

| Recurso | Professional | Enterprise | Ultimate |
|---|---|---|---|
| Blueprints ativos | 3 | 50 | 100 |
| Transições por Blueprint | 10 | 100 | 300 |
| **SLA por estado com ação customizada** | ❌ | ✅ | ✅ |
| Funções Deluge (custom functions) | ✅ | ✅ | ✅ |
| Assignment Rules | ✅ | ✅ | ✅ |

A linha que importa é a do SLA: **ações customizadas no SLA só existem da Enterprise para cima**. As seções 1 a 5 valem para qualquer edição. A seção 6 tem o caminho Enterprise e o plano B para Professional.

> **Regra de ouro deste projeto:** faça tudo primeiro no **Sandbox** (*Setup → Data Administration → Sandbox*). Blueprint publicado começa a capturar registros na hora.

---

## 1. Estrutura de dados

A ideia central: **a configuração das regiões vira dado no CRM, não código**. O gestor troca consultor, muda faixa de CEP ou ajusta SLA pela tela do Zoho, sem chamar ninguém de TI.

São dois módulos novos e alguns campos no Leads.

### 1.1 Módulo `Filas Regionais`

**Setup → Customization → Modules and Fields → + New Module.** Nome: `Filas Regionais` (API: `Filas_Regionais`).

| Rótulo do campo | API Name | Tipo | Observação |
|---|---|---|---|
| Nome da Fila | `Name` | Single Line | Campo primário. Ex: "SP Capital" |
| Código da Fila | `Codigo_Fila` | Single Line | Ex: `SP_CAPITAL`. Use `PLANTAO` na fila de transbordo |
| Região | `Regiao` | Picklist | Sudeste, Sul, Nordeste, Centro-Oeste, Norte, Nacional |
| UFs | `UFs` | Multi-Line | Separado por vírgula: `SP,RJ,MG,ES` |
| DDDs | `DDDs` | Multi-Line | Separado por vírgula: `11,12,13` |
| Cidades | `Cidades` | Multi-Line | Separado por **ponto e vírgula**: `São Paulo;Guarulhos` |
| Faixas de CEP | `Faixas_CEP` | Multi-Line | `01000000-05999999;08000000-08499999` |
| Prioridade | `Prioridade` | Number | Desempate. Maior vence |
| Ativa | `Ativa` | Checkbox | Marcada por padrão |
| SLA Check-in (min) | `SLA_Checkin_Min` | Number | Ex: 10 |
| Último Índice do Rodízio | `Ultimo_Indice` | Number | Ponteiro. Deixe -1 ao criar |
| Gestor Regional | `Gestor` | User Lookup | Recebe o lead quando a fila esgota |
| Fila de Transbordo | `Fila_Transbordo` | Lookup → Filas Regionais | Para onde vai se não houver gestor |

**Cidades usa `;` e não `,`** de propósito — nome de cidade não tem ponto e vírgula, mas "Mogi das Cruzes, SP" colado de uma planilha quebraria a lista se o separador fosse vírgula.

### 1.2 Módulo `Consultores da Fila`

Módulo de junção: um consultor pode estar em mais de uma fila, e a mesma fila tem vários consultores.

**+ New Module.** Nome: `Consultores da Fila` (API: `Consultores_Fila`).

| Rótulo | API Name | Tipo | Observação |
|---|---|---|---|
| Identificação | `Name` | Single Line | Ex: "SP Capital — João Silva" |
| Fila | `Fila` | Lookup → Filas Regionais | |
| Consultor | `Consultor` | User Lookup | Usuário do CRM |
| Ordem | `Ordem` | Number | **Única dentro da fila.** 1, 2, 3... |
| Ativo | `Ativo` | Checkbox | Desmarque em férias — não perde o histórico |

A `Ordem` precisa ser única por fila. Se dois registros tiverem `Ordem = 2`, o rodízio pula um deles.

### 1.3 Campos novos no módulo `Leads`

**Setup → Customization → Modules and Fields → Leads → Layout.**

| Rótulo | API Name | Tipo | Valores |
|---|---|---|---|
| Fila Atribuída | `Fila_Atribuida` | Lookup → Filas Regionais | |
| Região de Atendimento | `Regiao_Atendimento` | Picklist | mesmas da fila |
| Critério de Roteamento | `Criterio_Roteamento` | Picklist | Faixa de CEP, Cidade/Polo, DDD, UF, Transbordo |
| Origem Geográfica | `Origem_Geografica` | Single Line | `São Paulo/SP - DDD 11 - CEP 01310-100` |
| Data da Distribuição | `Data_Distribuicao` | Date/Time | |
| **Status do Check-in** | `Status_Checkin` | **Picklist** | Aguardando Check-in, Em Repasse, Em Atendimento, Sem Consultor |
| Data do Check-in | `Data_Checkin` | Date/Time | |
| Qtd. de Repasses | `Qtd_Repasses` | Number | |
| Consultores Tentados | `Consultores_Tentados` | Multi-Line | Trilha de auditoria |

**`Status_Checkin` é o campo que governa o Blueprint** — por isso tem que ser picklist, e os valores têm que bater exatamente com os nomes dos estados que você vai desenhar na seção 6.

---

## 2. Conexão para a API

As funções precisam de uma conexão autenticada.

1. **Setup → Developer Hub → Connections → Create Connection**
2. Escolha **Zoho CRM** em *Default Services*
3. Nome da conexão: `tegra_crm` — anote, vai no código
4. Escopo: `ZohoCRM.modules.ALL` e `ZohoCRM.settings.ALL`
5. **Create and Connect → Connect → Accept**

---

## 3. Preencher as filas

**Aba Filas Regionais → + New.** Exemplo de configuração inicial:

| Nome | Código | Região | UFs | DDDs | Faixas de CEP | Prior. | SLA | Últ. Índice |
|---|---|---|---|---|---|---|---|---|
| SP Capital | `SP_CAPITAL` | Sudeste | *(vazio)* | 11 | `01000000-05999999;08000000-08499999` | 20 | 10 | -1 |
| Sudeste | `SUDESTE` | Sudeste | SP,RJ,MG,ES | | | 10 | 10 | -1 |
| Sul | `SUL` | Sul | PR,SC,RS | | | 10 | 10 | -1 |
| Nordeste | `NORDESTE` | Nordeste | BA,SE,AL,PE,PB,RN,CE,PI,MA | | | 10 | 10 | -1 |
| Centro-Oeste e Norte | `CO_NORTE` | Centro-Oeste | DF,GO,MT,MS,AC,AP,AM,PA,RO,RR,TO | | | 10 | 15 | -1 |
| Plantão Geral | `PLANTAO` | Nacional | *(vazio)* | | | 0 | 15 | -1 |

Repare que **SP Capital não lista UF nenhuma**. Ela só captura por faixa de CEP e DDD. Quem pega o resto de SP é a fila Sudeste. Se você colocasse `SP` nas UFs da SP Capital, um lead de Campinas cairia lá também.

Depois preencha `Gestor` e `Fila de Transbordo` em cada uma (a de transbordo do PLANTAO fica vazia — é o fim da linha).

E em **Consultores da Fila**, um registro por consultor por fila, com `Ordem` 1, 2, 3...

---

## 4. Como a região é decidida

O roteamento não usa "a primeira regra que bater". Ele testa os quatro critérios e fica com o **mais específico**:

```
4. Faixa de CEP    ← mais específico, vence sempre
3. Cidade / Polo
2. DDD
1. UF
0. Nenhum          → fila PLANTAO
```

Empate no mesmo nível é resolvido pelo campo `Prioridade` (maior vence).

É isso que faz um lead de `01310-100` ir para **SP Capital** e não para **Sudeste**, mesmo os dois batendo. E um lead de Campinas (`13000-000`, UF = SP) cair em **Sudeste**, porque nenhuma faixa de CEP o pegou.

Quando o formulário só manda telefone, o DDD é extraído e a **UF é inferida** por uma tabela DDD→UF — então o roteamento por UF continua funcionando mesmo sem CEP.

---

## 5. As funções Deluge

São três funções standalone. **Setup → Developer Hub → Functions → + New Function → Standalone**.

### 5.1 `tegra_atribui_consultor`

O coração do rodízio. É chamada tanto na distribuição inicial quanto em cada repasse — por isso as duas seguem exatamente a mesma regra.

**Argumentos:** `leadId` (String), `filaId` (String), `tentados` (String), `repasses` (Int), `criterio` (String), `origem` (String)

```javascript
/* ============================================================
   tegra_atribui_consultor
   Escolhe o próximo consultor da fila (round-robin), grava no
   lead e registra a nota de auditoria.
   `tentados` = IDs de usuário já tentados, separados por vírgula.
   ============================================================ */

fila = zoho.crm.getRecordById("Filas_Regionais", filaId.toLong());
listaTentados = ifnull(tentados, "").toString().toList(",");

/* ---------- consultores ativos, na ordem configurada ---------- */
membros = zoho.crm.searchRecords("Consultores_Fila",
    "((Fila:equals:" + filaId + ")and(Ativo:equals:true))");

ordens = List();
porOrdem = Map();
for each membro in membros
{
    o = ifnull(membro.get("Ordem"), 0).toLong();
    ordens.add(o);
    porOrdem.put(o, membro);
}
ordens.sort(true);

total = ordens.size();
ultimo = ifnull(fila.get("Ultimo_Indice"), -1).toLong();

escolhido = null;
indiceEscolhido = -1;

/* ---------- round-robin, pulando quem já foi tentado ---------- */
passo = 1;
while(passo <= total)
{
    i = (ultimo + passo) % total;
    candidato = porOrdem.get(ordens.get(i));
    candidatoId = candidato.get("Consultor").get("id").toString();

    if(!listaTentados.contains(candidatoId))
    {
        escolhido = candidato;
        indiceEscolhido = i;
        passo = total + 1;          // encerra o laço
    }
    else
    {
        passo = passo + 1;
    }
}

agora = zoho.currenttime.toString("yyyy-MM-dd'T'HH:mm:ss") + "-03:00";

if(escolhido != null)
{
    consultorId = escolhido.get("Consultor").get("id").toString();
    consultorNome = escolhido.get("Consultor").get("name").toString();
    listaTentados.add(consultorId);

    upd = Map();
    upd.put("Owner", consultorId);
    upd.put("Fila_Atribuida", filaId);
    upd.put("Regiao_Atendimento", ifnull(fila.get("Regiao"), ""));
    upd.put("Criterio_Roteamento", criterio);
    upd.put("Origem_Geografica", origem);
    upd.put("Data_Distribuicao", agora);
    upd.put("Qtd_Repasses", repasses);
    upd.put("Consultores_Tentados", listaTentados.toString(", "));
    upd.put("Status_Checkin", "Aguardando Check-in");
    zoho.crm.updateRecord("Leads", leadId.toLong(), upd);

    // avança o ponteiro do rodízio
    zoho.crm.updateRecord("Filas_Regionais", filaId.toLong(),
        {"Ultimo_Indice": indiceEscolhido});

    // auditoria
    verbo = if(repasses > 0, "Repassado", "Distribuído");
    nota = Map();
    nota.put("Note_Title", "[Distribuição] " + verbo);
    nota.put("Note_Content", verbo + " para " + consultorNome +
        " (Round-Robin " + fila.get("Name") + ") — critério: " + criterio +
        " | origem: " + origem + " | repasse nº " + repasses);
    nota.put("Parent_Id", leadId);
    nota.put("se_module", "Leads");
    zoho.crm.createRecord("Notes", nota);

    info "Lead " + leadId + " -> " + consultorNome;
    return "OK";
}

/* ================= fila esgotada: escalonamento ================= */

gestor = fila.get("Gestor");

if(gestor != null && !listaTentados.contains(gestor.get("id").toString()))
{
    gestorId = gestor.get("id").toString();
    listaTentados.add(gestorId);

    upd = Map();
    upd.put("Owner", gestorId);
    upd.put("Fila_Atribuida", filaId);
    upd.put("Criterio_Roteamento", criterio);
    upd.put("Origem_Geografica", origem);
    upd.put("Data_Distribuicao", agora);
    upd.put("Qtd_Repasses", repasses);
    upd.put("Consultores_Tentados", listaTentados.toString(", "));
    upd.put("Status_Checkin", "Aguardando Check-in");
    zoho.crm.updateRecord("Leads", leadId.toLong(), upd);

    nota = Map();
    nota.put("Note_Title", "[Distribuição] Escalado ao gestor");
    nota.put("Note_Content", "Todos os consultores da fila " + fila.get("Name") +
        " ficaram indisponíveis — lead escalado ao gestor regional.");
    nota.put("Parent_Id", leadId);
    nota.put("se_module", "Leads");
    zoho.crm.createRecord("Notes", nota);

    return "GESTOR";
}

transbordo = fila.get("Fila_Transbordo");

if(transbordo != null)
{
    return standalone.tegra_atribui_consultor(leadId,
        transbordo.get("id").toString(), listaTentados.toString(","),
        repasses, criterio + " (transbordo)", origem);
}

/* ============ ninguém disponível em lugar nenhum ============ */

upd = Map();
upd.put("Status_Checkin", "Sem Consultor");
upd.put("Qtd_Repasses", repasses);
upd.put("Consultores_Tentados", listaTentados.toString(", "));
zoho.crm.updateRecord("Leads", leadId.toLong(), upd);

nota = Map();
nota.put("Note_Title", "[ALERTA] Sem consultor disponível");
nota.put("Note_Content", "Nenhum consultor disponível em nenhuma fila. " +
    "Lead aguardando tratamento manual. Tentados: " + listaTentados.toString(", "));
nota.put("Parent_Id", leadId);
nota.put("se_module", "Leads");
zoho.crm.createRecord("Notes", nota);

return "SEM_CONSULTOR";
```

O lead **nunca some**: se acabarem os consultores, ele fica marcado como `Sem Consultor` com uma nota de alerta, em vez de ficar órfão sem ninguém perceber.

### 5.2 `tegra_roteia_e_distribui`

Identificação geográfica + chamada da anterior.

**Argumento:** `leadId` (String)

```javascript
/* ============================================================
   tegra_roteia_e_distribui
   Trigger: Workflow Rule → Leads → Ao criar
   ============================================================ */

lead = zoho.crm.getRecordById("Leads", leadId.toLong());

/* ---------------- 1) normaliza a entrada ---------------- */
cepBruto = ifnull(lead.get("Zip_Code"), "").toString();
cep = cepBruto.remove("-").remove(".").remove(" ").remove("/").trim();

cidadeOriginal = ifnull(lead.get("City"), "").toString().trim();
cidade = cidadeOriginal.toLowerCase();
uf = ifnull(lead.get("State"), "").toString().trim().toUpperCase();

foneBruto = ifnull(lead.get("Phone"), "").toString();
if(foneBruto.trim() == "")
{
    foneBruto = ifnull(lead.get("Mobile"), "").toString();
}
fone = foneBruto.remove("(").remove(")").remove("-").remove(" ").remove("+").remove(".");
if(fone.startsWith("55") && fone.length() > 11)
{
    fone = fone.subString(2);
}
ddd = "";
if(fone.length() >= 10)
{
    ddd = fone.subString(0, 2);
}

/* UF inferida pelo DDD quando o formulário não trouxe estado */
mapaDdd = {"11":"SP","12":"SP","13":"SP","14":"SP","15":"SP","16":"SP","17":"SP",
"18":"SP","19":"SP","21":"RJ","22":"RJ","24":"RJ","27":"ES","28":"ES","31":"MG",
"32":"MG","33":"MG","34":"MG","35":"MG","37":"MG","38":"MG","41":"PR","42":"PR",
"43":"PR","44":"PR","45":"PR","46":"PR","47":"SC","48":"SC","49":"SC","51":"RS",
"53":"RS","54":"RS","55":"RS","61":"DF","62":"GO","63":"TO","64":"GO","65":"MT",
"66":"MT","67":"MS","68":"AC","69":"RO","71":"BA","73":"BA","74":"BA","75":"BA",
"77":"BA","79":"SE","81":"PE","82":"AL","83":"PB","84":"RN","85":"CE","86":"PI",
"87":"PE","88":"CE","89":"PI","91":"PA","92":"AM","93":"PA","94":"PA","95":"RR",
"96":"AP","97":"AM","98":"MA","99":"MA"};

if(uf == "" && ddd != "")
{
    uf = ifnull(mapaDdd.get(ddd), "");
}

/* ---------- 2) escolhe a fila mais específica ---------- */
filas = zoho.crm.searchRecords("Filas_Regionais", "(Ativa:equals:true)");

melhorFila = null;
melhorEsp = 0;
melhorPrio = -1;

for each fila in filas
{
    esp = 0;

    // 4 — faixa de CEP
    faixas = ifnull(fila.get("Faixas_CEP"), "").toString();
    if(cep.length() == 8 && faixas.trim() != "")
    {
        for each faixa in faixas.toList(";")
        {
            partes = faixa.trim().toList("-");
            if(partes.size() == 2)
            {
                ini = partes.get(0).trim();
                fim = partes.get(1).trim();
                if(ini != "" && fim != "")
                {
                    if(cep.toLong() >= ini.toLong() && cep.toLong() <= fim.toLong())
                    {
                        esp = 4;
                    }
                }
            }
        }
    }

    // 3 — cidade / polo
    if(esp == 0 && cidade != "")
    {
        for each c in ifnull(fila.get("Cidades"), "").toString().toList(";")
        {
            if(c.trim().toLowerCase() == cidade)
            {
                esp = 3;
            }
        }
    }

    // 2 — DDD
    if(esp == 0 && ddd != "")
    {
        for each d in ifnull(fila.get("DDDs"), "").toString().toList(",")
        {
            if(d.trim() == ddd)
            {
                esp = 2;
            }
        }
    }

    // 1 — UF
    if(esp == 0 && uf != "")
    {
        for each u in ifnull(fila.get("UFs"), "").toString().toList(",")
        {
            if(u.trim().toUpperCase() == uf)
            {
                esp = 1;
            }
        }
    }

    prio = ifnull(fila.get("Prioridade"), 0).toLong();

    if(esp > 0)
    {
        if(esp > melhorEsp || (esp == melhorEsp && prio > melhorPrio))
        {
            melhorFila = fila;
            melhorEsp = esp;
            melhorPrio = prio;
        }
    }
}

/* ---------- 3) transbordo se nada bateu ---------- */
if(melhorFila == null)
{
    plantao = zoho.crm.searchRecords("Filas_Regionais", "(Codigo_Fila:equals:PLANTAO)");
    if(plantao.size() > 0)
    {
        melhorFila = plantao.get(0);
        melhorEsp = 0;
    }
    else
    {
        info "ERRO: nenhuma fila bateu e a fila PLANTAO não existe.";
        return "SEM_FILA";
    }
}

/* ---------- 4) rótulos para a auditoria ---------- */
criterio = "Transbordo";
if(melhorEsp == 4) { criterio = "Faixa de CEP"; }
else if(melhorEsp == 3) { criterio = "Cidade/Polo"; }
else if(melhorEsp == 2) { criterio = "DDD"; }
else if(melhorEsp == 1) { criterio = "UF"; }

origem = "";
if(cidadeOriginal != "" && uf != "") { origem = cidadeOriginal + "/" + uf; }
else if(uf != "") { origem = uf; }
else if(cidadeOriginal != "") { origem = cidadeOriginal; }
if(ddd != "") { origem = origem + " - DDD " + ddd; }
if(cep.length() == 8)
{
    origem = origem + " - CEP " + cep.subString(0, 5) + "-" + cep.subString(5);
}
if(origem.trim() == "") { origem = "Origem não identificada"; }

/* ---------- 5) registra a validação geográfica ---------- */
nota = Map();
nota.put("Note_Title", "[Distribuição] Validação Geográfica");
nota.put("Note_Content", "Lead cadastrado informando " + origem +
    ". Identificada " + ifnull(melhorFila.get("Regiao"), "região") +
    " — Fila " + melhorFila.get("Name") + " (critério: " + criterio + ").");
nota.put("Parent_Id", leadId);
nota.put("se_module", "Leads");
zoho.crm.createRecord("Notes", nota);

/* ---------- 6) distribui ---------- */
return standalone.tegra_atribui_consultor(leadId,
    melhorFila.get("id").toString(), "", 0, criterio, origem);
```

### 5.3 `tegra_repassa_lead`

Chamada pela escalação do SLA.

**Argumento:** `leadId` (String)

```javascript
/* ============================================================
   tegra_repassa_lead
   Trigger: escalação do SLA do Blueprint (ver seção 6)
   ============================================================ */

MAX_REPASSES = 3;

lead = zoho.crm.getRecordById("Leads", leadId.toLong());

/* já fez check-in ou já saiu do fluxo: não faz nada */
status = ifnull(lead.get("Status_Checkin"), "").toString();
if(status != "Aguardando Check-in")
{
    info "Lead " + leadId + " não está aguardando check-in (" + status + ") — ignorado.";
    return "IGNORADO";
}

fila = lead.get("Fila_Atribuida");
if(fila == null)
{
    info "Lead " + leadId + " sem fila atribuída.";
    return "SEM_FILA";
}

filaId = fila.get("id").toString();
tentados = ifnull(lead.get("Consultores_Tentados"), "").toString().replaceAll(" ", "");
repasses = ifnull(lead.get("Qtd_Repasses"), 0).toLong() + 1;
dono = ifnull(lead.get("Owner"), Map()).get("name");

/* registra o estouro */
nota = Map();
nota.put("Note_Title", "[SLA] Check-in não realizado");
nota.put("Note_Content", ifnull(dono, "O consultor") +
    " não fez check-in dentro do prazo. Iniciando repasse nº " + repasses + ".");
nota.put("Parent_Id", leadId);
nota.put("se_module", "Leads");
zoho.crm.createRecord("Notes", nota);

/* teto de repasses: vai direto para o escalonamento */
if(repasses > MAX_REPASSES)
{
    filaRec = zoho.crm.getRecordById("Filas_Regionais", filaId.toLong());
    transbordo = filaRec.get("Fila_Transbordo");
    destino = if(transbordo != null, transbordo.get("id").toString(), filaId);

    return standalone.tegra_atribui_consultor(leadId, destino, tentados,
        repasses, "Limite de repasses atingido",
        ifnull(lead.get("Origem_Geografica"), "").toString());
}

return standalone.tegra_atribui_consultor(leadId, filaId, tentados, repasses,
    ifnull(lead.get("Criterio_Roteamento"), "").toString(),
    ifnull(lead.get("Origem_Geografica"), "").toString());
```

---

## 6. O temporizador de check-in

### 6.1 Por que Blueprint, e não Workflow ou Schedule

Descartei duas alternativas antes de chegar aqui:

- **Schedules** (*Setup → Automation → Schedules*) rodam em intervalo **diário/semanal/mensal**. Inútil para um SLA de 10 minutos.
- **Assignment Rules** fazem round-robin nativo, mas **só disparam em importação, webform e API — nunca em registro criado por workflow**, e não têm como "repassar ao próximo". Servem no máximo como rede de segurança para definir um dono inicial.

O **SLA de estado do Blueprint** aceita limite em **minutos** e permite ações customizadas na escalação — inclusive chamar função Deluge. É o único mecanismo nativo que atende os 10 minutos.

### 6.2 Desenhar o Blueprint

**Setup → Process Management → Blueprint → + Create Blueprint**

- Módulo: **Leads** · Layout: **Standard** · Campo: **`Status_Checkin`**
- Critério de entrada: deixe em branco (todos os leads)

**Estados** (arraste no editor):

```
   [Start]
      │
      ▼
┌──────────────────────┐   Fazer Check-in    ┌──────────────────┐
│ Aguardando Check-in  │────────────────────▶│  Em Atendimento  │
│      SLA: 10 min     │                     └──────────────────┘
└──────────┬───────────┘
           │ Sem Consultor (comum)
           ▼
    ┌──────────────┐
    │Sem Consultor │
    └──────────────┘
```

**Transição `Fazer Check-in`** (Aguardando Check-in → Em Atendimento):

- *Before* → **Transition Owners**: `Record Owner`. Só o consultor dono faz o próprio check-in.
- *During* → adicione o campo `Data_Checkin` como **Mandatory**, ou um **Message** tipo "Confirme que você iniciou o atendimento deste lead".
- *After* → **Field Update**: `Status_Checkin` já muda sozinho; se quiser carimbar a hora automaticamente, use **Custom Function** com uma linha:
  ```javascript
  zoho.crm.updateRecord("Leads", leadId.toLong(),
      {"Data_Checkin": zoho.currenttime.toString("yyyy-MM-dd'T'HH:mm:ss") + "-03:00"});
  ```

**Estado `Sem Consultor`**: estado de saída, sem SLA. É onde o lead para quando as filas esgotam.

### 6.3 Configurar o SLA (Enterprise+)

No editor, **clique no estado `Aguardando Check-in`**:

1. Tempo máximo no estado: **10 Minutes**
2. *On escalation*: notifique o **Gestor Regional** (e o Record Owner, se quiser)
3. **User-defined SLA actions → Custom Action → Function** → selecione `tegra_repassa_lead`, com argumento `leadId` = *Leads > Lead Id*

### 6.4 O detalhe que você precisa testar no Sandbox

O SLA conta a partir do momento em que o registro **entra** no estado. No repasse, o lead continua em `Aguardando Check-in` — o `tegra_atribui_consultor` só troca o `Owner`. **Isso pode não rearmar o relógio.**

A documentação da Zoho não diz o que acontece nesse caso, então trate como incerto e valide. Se o segundo consultor não estourar o SLA, o relógio não rearmou — aí aplique o **truque do estado transitório**: faça o `tegra_atribui_consultor` passar pelo valor `Em Repasse` antes de voltar. Substitua a linha do update por:

```javascript
// força a saída e a reentrada no estado, rearmando o SLA
zoho.crm.updateRecord("Leads", leadId.toLong(), {"Status_Checkin": "Em Repasse"});
upd.put("Status_Checkin", "Aguardando Check-in");
zoho.crm.updateRecord("Leads", leadId.toLong(), upd);
```

Para isso funcionar, `Em Repasse` precisa existir como estado no Blueprint, ligado de volta a `Aguardando Check-in`.

### 6.5 Plano B para Professional

Sem ações customizadas no SLA, o caminho é a **Transição Automática**:

Crie a transição `Repassar` de `Aguardando Check-in` para `Em Repasse`, marque **Automatic Transition**, defina o *Wait time*, e em *After Transition* chame `tegra_repassa_lead`. Depois uma segunda automática de `Em Repasse` de volta para `Aguardando Check-in` com wait mínimo.

Fica mais engessado e consome 2 das 10 transições do plano — mas funciona sem Enterprise. **Confirme no Sandbox se o *Wait time* aceita minutos na sua edição**; a documentação só exemplifica com dias.

---

## 7. Ligar o gatilho

**Setup → Automation → Workflow Rules → + Create Rule**

- Módulo: **Leads**
- Nome: `Distribuição Regional de Leads`
- *Execute this workflow rule based on*: **Record Action → Create**
- *Which leads*: **All Leads**
- *Instant Actions* → **Function** → **Existing** → `tegra_roteia_e_distribui`
- **Edit Arguments** → `leadId` = **Leads > Lead Id** → Save

### Rede de segurança (opcional)

**Setup → Automation → Assignment** — crie uma regra para o módulo Leads com um **Default User** (o plantão). Se a função falhar por qualquer motivo, o lead já nasce com dono em vez de ficar órfão. Lembre que ela só age em leads vindos de importação, webform ou API.

---

## 8. Roteiro de teste

Faça no Sandbox, nesta ordem:

| # | Cenário | Entrada | Resultado esperado |
|---|---|---|---|
| 1 | CEP vence UF | CEP `01310-100`, cidade São Paulo, UF SP | Fila **SP Capital**, critério **Faixa de CEP** |
| 2 | CEP fora da faixa | CEP `13000-000`, UF SP | Fila **Sudeste**, critério **UF** |
| 3 | Só telefone | Telefone `(41) 99999-8888`, sem CEP/UF | Fila **Sul**, critério **UF** (inferida do DDD 41) |
| 4 | Cidade/polo | Cidade Curitiba, sem CEP | A fila de polo, critério **Cidade/Polo** |
| 5 | Nada identificável | Só nome e e-mail | Fila **Plantão**, critério **Transbordo** |
| 6 | Rodízio | 4 leads seguidos em SP Capital (3 consultores) | João, Pedro, Ana, **João** |
| 7 | Estouro de SLA | Lead em SP Capital, esperar 10 min | Passa para o próximo, `Qtd_Repasses` = 1, nota de estouro |
| 8 | Repasse encadeado | Deixar estourar 3 vezes | Vai ao gestor ou ao plantão, sem repetir consultor |
| 9 | Check-in no prazo | Clicar **Fazer Check-in** | Estado **Em Atendimento**, sem mais repasse |
| 10 | Fila esgotada | Desmarcar `Ativo` de todos | `Sem Consultor` + nota de alerta |

O cenário **6** é o que mais pega gente de surpresa: se der João, João, João, confira se a `Ordem` em Consultores da Fila está preenchida e é única.

---

## 9. Limitações que você precisa conhecer

**Concorrência no ponteiro.** Dois leads chegando no mesmo segundo podem ler o mesmo `Ultimo_Indice` antes de qualquer um gravar, e ir para o mesmo consultor. Funções Deluge não são transacionais. Em volume baixo isso quase nunca aparece; se a Tegra passar a receber leads em rajada, o rodízio vai desbalancear um pouco. Não há solução nativa limpa — a saída seria serializar a distribuição fora do CRM.

**Acentuação na comparação de cidade.** O código compara a cidade em minúsculas, mas **não remove acentos**. Se o formulário mandar "Sao Paulo" e o campo `Cidades` tiver "São Paulo", não casa. Padronize a origem (o ViaCEP devolve com acento) ou cadastre as duas grafias separadas por `;`.

**Fuso horário fixo.** As datas usam `-03:00` fixo. No horário de verão — se voltar — isso fica uma hora deslocado.

**Limites de API.** Cada lead consome aproximadamente 6 a 10 chamadas (busca de filas, busca de membros, updates, notas). Em campanha de alto volume, confira o consumo em *Setup → Developer Hub → APIs → API Usage*.

**Notas como timeline.** As notas são o registro de auditoria e aparecem na aba Notes do lead. A Timeline nativa do Zoho registra em paralelo as mudanças de campo e as transições do Blueprint, então você tem duas visões complementares.

---

## Sources

- [FAQs on Assignment Rules — Zoho CRM](https://help.zoho.com/portal/en/kb/crm/faqs/automation/assignment-rules/articles/faqs-assignment)
- [Designing a Blueprint — Zoho CRM](https://help.zoho.com/portal/en/kb/crm/process-management/blueprint/articles/design-a-blueprint)
- [Most Recent Updates in Blueprints — Zoho CRM](https://help.zoho.com/portal/en/kb/crm-v2-1/process-management/blueprint/articles/blueprint-enhancements)
- [Assign leads in round-robin order — Zoho CRM Solutions](https://www.zoho.com/crm/resources/solutions/assign-leads-in-round-robin-fashion.html)
- [Custom Schedules — Zoho CRM Developer](https://www.zoho.com/crm/developer/docs/serverless-architecture/custom-schedules.html)
