# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Consultores e equipe comercial TegraPharma que operam o Portal do Consultor após autenticação (Zoho ou Microsoft Entra).

## Product Purpose

Portal do Consultor TegraPharma: autenticação, formulários comerciais (compra, recompra, proposta, ocorrência), gestão de usuários (admin) e acompanhamento de leads médicos.

## Positioning

Middleware entre identidade TegraPharma / Entra e CRM Zoho, com fluxos comerciais e agora gestão operacional de leads médicos no mesmo shell autenticado.

## Capabilities

- Login Zoho e Microsoft Entra (PKCE)
- Home com atalhos
- Formulários opcionais por permissão CRM
- Admin de usuários
- Leads Médicos: dashboard (leads/mês, pizza por status, conversão), tabela paginada (10/página), busca e filtros em sidebar à direita, ações Visualizar e Importar

## Constraints

- Identidade visual TegraPharma existente (tokens `tegra-*`, MainLayout Header + Navbar)
- Home (`/dashboard`) permanece; Leads Médicos é rota/menu separado
- Sem API de leads no backend ainda — UI com dados sintéticos rotulados até o endpoint existir
- Acessibilidade e português BR

## Terminology

- Leads Médicos: médicos/prospects acompanhados no portal
- Data de criação / data de entrada: campos distintos na listagem
- Importar / Visualizar: ações por linha na tabela

## Brand Commitments

- Cores e componentes TegraPharma já usados no admin
- Tom profissional, operacional (modo Operate)

## Open Decisions

- Endpoint real de leads e regras de importação (assumido: mock até integração)
- Filtros do sidebar: status + intervalo de datas (criação e entrada) — alinhado ao brief de colunas/KPIs
