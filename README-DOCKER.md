# ZohoMiddleware - Docker Setup

Sistema de middleware para integração com Zoho CRM, containerizado com Docker.

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌──────────────────┐
│   Nginx :80     │────▶│  zoho-admin :80  │
│  (Proxy)        │     │   (React + Vite)  │
└─────────────────┘     └──────────────────┘
         │
         │              ┌──────────────────┐
         └─────────────▶│ zoho-backend     │
                        │ :3000 (Node.js)  │
                        └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   Zoho CRM API   │
                        └──────────────────┘
```

## 🚀 Quick Start

### Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (para desenvolvimento local)

### Desenvolvimento Local

```bash
# Clone o repositório
git clone <seu-repo>
cd ZohoMiddleware

# Configure as variáveis de ambiente
cp .env.example .env
nano .env  # Configure suas credenciais

# Suba os containers
docker-compose up -d

# Veja os logs
docker-compose logs -f
```

Acesse:
- Frontend: http://localhost:8081
- Backend: http://localhost:3004

### Produção

Veja o arquivo [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md) para instruções completas de deploy em produção.

## 📦 Containers

### zoho-backend
- **Imagem**: node:20-alpine
- **Porta**: 3004:3000
- **Volumes**: 
  - `./backend/uploads` - Arquivos enviados
  - `./backend/logs` - Logs da aplicação

### zoho-admin
- **Build**: Multi-stage (node:20-alpine + nginx:alpine)
- **Porta**: 8081:80
- **Nginx**: Servindo build estático do React

## 🔧 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# JWT
JWT_SECRET=        # Chave secreta para tokens JWT (32+ caracteres)

# Zoho API
ZOHO_CLIENT_ID=    # Client ID do Zoho
ZOHO_CLIENT_SECRET=# Client Secret do Zoho
ZOHO_REDIRECT_URI= # URI de redirect
ZOHO_REFRESH_TOKEN=# Token de refresh do Zoho

# URL do Frontend
FRONTEND_URL=      # URL do frontend (ex: http://localhost:8081)

# Server
PORT=3000          # Porta interna do backend
NODE_ENV=production# Ambiente (development/production)
```

## 🛠️ Comandos Docker

### Gerenciamento Básico

```bash
# Iniciar containers
docker-compose up -d

# Parar containers
docker-compose down

# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f zoho-backend

# Restart
docker-compose restart

# Ver status
docker-compose ps

# Ver recursos utilizados
docker stats
```

### Build e Deploy

```bash
# Rebuild das imagens
docker-compose build

# Rebuild sem cache
docker-compose build --no-cache

# Up com rebuild
docker-compose up -d --build

# Forçar recreação dos containers
docker-compose up -d --force-recreate
```

### Debugging

```bash
# Acessar shell do backend
docker exec -it zoho-backend sh

# Acessar shell do frontend/nginx
docker exec -it zoho-admin sh

# Ver logs do nginx
docker exec zoho-admin cat /var/log/nginx/error.log

# Testar configuração do nginx
docker exec zoho-admin nginx -t
```

### Limpeza

```bash
# Remover containers e redes
docker-compose down

# Remover containers, redes e volumes
docker-compose down -v

# Limpar sistema Docker
docker system prune -a --volumes
```

## 📁 Estrutura de Arquivos Docker

```
ZohoMiddleware/
├── docker-compose.yml          # Orquestração dos containers
├── .dockerignore              # Arquivos ignorados no build
├── .env.example               # Template de variáveis
├── backend/
│   ├── Dockerfile            # Imagem do backend
│   ├── package.json
│   └── src/
├── admin/
│   ├── Dockerfile            # Imagem multi-stage do frontend
│   ├── nginx.conf            # Configuração do Nginx
│   ├── package.json
│   └── src/
└── DEPLOY-GUIDE.md           # Guia completo de deploy
```

## 🔍 Health Checks

Os containers incluem health checks automáticos:

### Backend
```bash
curl http://localhost:3004/health
```

### Frontend
```bash
curl http://localhost:8081
```

## 📊 Monitoramento

### Ver uso de recursos:
```bash
docker stats
```

### Ver logs em tempo real:
```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f zoho-backend

# Apenas frontend
docker-compose logs -f zoho-admin

# Últimas 100 linhas
docker-compose logs --tail=100
```

## 🔐 Segurança

### Boas Práticas Implementadas:

✅ Multi-stage builds (reduz tamanho da imagem)  
✅ Non-root user nos containers  
✅ Health checks automáticos  
✅ .dockerignore para excluir arquivos sensíveis  
✅ Variáveis de ambiente para configuração  
✅ Volumes para persistência de dados  
✅ Rate limiting no backend  
✅ CORS configurado  
✅ Security headers no Nginx  

### Melhorias Recomendadas:

- [ ] Adicionar scanner de vulnerabilidades (Trivy, Snyk)
- [ ] Implementar backup automático dos volumes
- [ ] Configurar logging centralizado (ELK, Loki)
- [ ] Adicionar monitoring (Prometheus + Grafana)
- [ ] Implementar CI/CD pipeline

## 🌐 Deploy em Produção

### VPS/Cloud

Veja [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md) para instruções detalhadas.

### Resumo:

1. Configure o servidor (Ubuntu 24.04 recomendado)
2. Instale Docker e Docker Compose
3. Clone/copie o projeto
4. Configure `.env` com credenciais de produção
5. Execute `docker-compose up -d`
6. Configure Nginx como proxy reverso
7. Configure SSL com Certbot

### Portas Recomendadas:

- **Desenvolvimento**: Backend 3001, Frontend 8081
- **Produção**: Backend 3004, Frontend 8081 (atrás do Nginx :80/443)

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs zoho-backend

# Verificar configuração
docker-compose config

# Verificar portas em uso
netstat -tulpn | grep -E '3004|8081'
```

### Erro de build

```bash
# Rebuild sem cache
docker-compose build --no-cache

# Verificar .dockerignore
cat .dockerignore
```

### Erro de permissão

```bash
# Ajustar permissões dos volumes
chmod -R 755 backend/uploads
chmod -R 755 backend/logs
```

### Container reiniciando constantemente

```bash
# Ver logs para identificar erro
docker-compose logs --tail=50 zoho-backend

# Verificar health check
docker inspect zoho-backend | grep -A 10 Health
```

## 📚 Recursos

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📝 Changelog

### v1.0.0 (2026-02-10)
- ✨ Configuração inicial do Docker
- ✨ Multi-stage build para frontend
- ✨ Health checks automáticos
- ✨ Scripts de deploy
- 📝 Documentação completa

---

**Desenvolvido com 💙 usando Docker**
