# ZohoMiddleware — TegraPharma Portal

## Stack
- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4 (admin/)
- **Backend**: Node.js ESM + Express (backend/)
- **Infra**: Docker Compose → EC2 Ubuntu (`3.136.76.164`) + Cloudflare
- **Database**: AWS DynamoDB (`us-east-2`)

## Deploy
```bash
# No VPS (SSH em 3.136.76.164):
cd /root/ZohoMiddleware
git pull origin Version4.0

# Só frontend:
docker compose up -d --build zoho-admin

# Só backend:
docker compose restart zoho-backend

# Logs em tempo real:
docker compose logs -f zoho-backend
```

## Paleta de Cores (Tailwind v4 — colors.css)
| Token | Hex | Uso |
|---|---|---|
| `tegra-blue` | `#8FA9C1` | Azul-acinzentado, acento principal |
| `tegra-teal` | `#E5989B` | Rosa-mauve, acento complementar |
| `tegra-blue-dark` | `#1a2f5b` | Navy escuro — sidebar, títulos |
| `tegra-blue-light` | `#4d6fa9` | Azul médio |

> ⚠️ `tailwind.config.js` define cores diferentes mas **`colors.css` vence** no Tailwind v4 (lido via `@theme`).

## Design System

### Identidade visual
- Marca: TegraPharma — saúde integrativa, consultores comerciais BR
- Tom: Profissional-médico + calor brasileiro
- **Assinatura visual**: margem lateral gradiente azul→rosa nas seções de formulário
- **Elemento distintivo**: cards glassmorphic sobre background image desfocada

### Padrão de card de formulário
```jsx
<div className="bg-tegra-bg-primary rounded-lg shadow-md p-4 sm:p-5 md:p-6">
  <h2 className="text-base sm:text-lg font-semibold text-tegra-text-primary mb-3 sm:mb-4">
    Nome da Seção
  </h2>
  {/* conteúdo */}
</div>
```
`.bg-tegra-bg-primary` é **override em `index.css`** → glassmorphic com `backdrop-filter: blur`.

### Tipografia
- Fonte: **Inter** (Google Fonts, adicionada no `index.html`)
- Títulos de seção: `uppercase`, `letter-spacing: 0.08em`, com margem lateral gradiente via CSS

### Páginas de formulário (Compra / Recompra)
- Background: imagem `/painel_consultor_compra.png` desfocada + overlay branco semitransparente
- Cards flutuam com glass effect sobre o fundo

## Componentes Chave
| Componente | Arquivo |
|---|---|
| DocumentUpload | `admin/src/components/ui/DocumentUpload.jsx` |
| Nomenclatura de arquivos | `admin/src/utils/fileNaming.js` |
| SLA distribuição leads | `backend/src/services/slaOffers.js` |
| Layout principal | `admin/src/components/layout/MainLayout.jsx` |
| Sidebar | `admin/src/components/layout/Sidebar.jsx` |

## Regras de Negócio Importantes
- Rejeição/48h: lead não passa para próximo consultor (intencional)
- Lead `regiao: null` + coords → distribuição por proximidade geográfica (todos consultores, não-Gestão)
- Lead `regiao: null` sem coords → direto para Gestão

## Frontend-Design — Direção
Aplicar o skill `frontend-design` (disponível em `.claude/plugins/`):
- O portal deve refletir **precisão clínica + calor profissional brasileiro**
- Não usar padrões genéricos de SaaS enterprise
- O **elemento distintivo** é a margem lateral gradiente `#8FA9C1 → #E5989B` nas seções
- Tipografia: pequena + uppercase + bold para labels, legível para corpo
- Glass cards com background image criam profundidade sem distração
