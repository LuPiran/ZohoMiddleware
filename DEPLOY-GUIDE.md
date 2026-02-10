# 🚀 Guia de Deploy - ZohoMiddleware na VPS Hostinger

## ✅ Arquivos Criados e Preparados

Os seguintes arquivos Docker foram criados no seu projeto:

- ✅ `backend/Dockerfile` - Container do backend Node.js
- ✅ `admin/Dockerfile` - Container do frontend React com Nginx
- ✅ `admin/nginx.conf` - Configuração do Nginx
- ✅ `docker-compose.yml` - Orquestração dos containers
- ✅ `.dockerignore` - Exclusão de arquivos desnecessários
- ✅ `.env.example` - Template de variáveis de ambiente
- ✅ `deploy.ps1` e `deploy.sh` - Scripts de deploy

## 📦 Arquivos Parcialmente Copiados

A maioria dos arquivos foi copiada com sucesso para o servidor. Agora você precisa completar o processo manualmente devido às senhas SSH.

## 🔧 Passos para Completar o Deploy

### 1. Conecte-se ao Servidor

```powershell
ssh root@212.85.21.122
```

### 2. Verifique os Arquivos Copiados

```bash
cd /root/ZohoMiddleware
ls -la
```

### 3. Copie os Arquivos Restantes (se necessário)

```powershell
# No seu computador (PowerShell)
cd "c:\Users\samue\Downloads\sla\ZohoMiddleware"
scp docker-compose.yml root@212.85.21.122:/root/ZohoMiddleware/
scp .env.example root@212.85.21.122:/root/ZohoMiddleware/
scp .dockerignore root@212.85.21.122:/root/ZohoMiddleware/
```

### 4. Configure as Variáveis de Ambiente

```bash
# No servidor SSH
cd /root/ZohoMiddleware
cp .env.example .env
nano .env
```

**Edite o arquivo .env com suas credenciais:**

```env
# JWT Configuration
JWT_SECRET=seu_jwt_secret_aqui_minimo_32_caracteres_aleatorios

# Zoho API Configuration
ZOHO_CLIENT_ID=seu_client_id_zoho
ZOHO_CLIENT_SECRET=seu_client_secret_zoho
ZOHO_REDIRECT_URI=http://212.85.21.122:3004/auth/callback
ZOHO_REFRESH_TOKEN=seu_refresh_token_zoho

# Frontend URL
FRONTEND_URL=http://212.85.21.122:8081

# Server Configuration
PORT=3000
NODE_ENV=production
```

**Dica:** Para gerar um JWT_SECRET seguro:
```bash
openssl rand -base64 32
```

Salve o arquivo com `Ctrl+O`, depois `Enter`, e saia com `Ctrl+X`.

### 5. Crie os Diretórios Necessários

```bash
mkdir -p backend/uploads backend/logs
chmod 755 backend/uploads backend/logs
```

### 6. Faça o Build das Imagens Docker

```bash
docker-compose build
```

Isso pode levar alguns minutos (5-10 min).

### 7. Suba os Containers

```bash
docker-compose up -d
```

### 8. Verifique se os Containers Estão Rodando

```bash
docker-compose ps
```

Você deve ver 2 containers rodando:
- `zoho-backend` na porta 3004
- `zoho-admin` na porta 8081

### 9. Veja os Logs

```bash
# Logs de todos os containers
docker-compose logs -f

# Apenas backend
docker-compose logs -f zoho-backend

# Apenas frontend
docker-compose logs -f zoho-admin
```

Para sair dos logs, pressione `Ctrl+C`.

## 🌐 Acessar a Aplicação

Após os containers subirem:

- **Frontend**: http://212.85.21.122:8081
- **Backend API**: http://212.85.21.122:3004
- **Health Check**: http://212.85.21.122:3004/health

## 🔧 Configurar Nginx como Proxy Reverso (Opcional mas Recomendado)

Para usar um domínio e SSL, configure o Nginx:

```bash
nano /etc/nginx/sites-available/zoho
```

Cole esta configuração:

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative o site:

```bash
ln -s /etc/nginx/sites-available/zoho /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Instalar SSL com Certbot:

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

## 📝 Comandos Úteis

### Gerenciar Containers:

```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Restart
docker-compose restart

# Parar
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Rebuild e restart
docker-compose up -d --build

# Ver uso de recursos
docker stats
```

### Acessar Container:

```bash
# Backend
docker exec -it zoho-backend sh

# Frontend
docker exec -it zoho-admin sh
```

### Atualizar Código:

```bash
# 1. Pare os containers
docker-compose down

# 2. Copie os novos arquivos do seu PC
# (use scp como mostrado no passo 3)

# 3. Rebuild e suba novamente
docker-compose up -d --build
```

## 🔍 Troubleshooting

### Containers não sobem:

```bash
# Verifique os logs
docker-compose logs

# Verifique portas em uso
netstat -tulpn | grep -E '3004|8081'

# Remova containers antigos
docker-compose down
docker system prune -a
```

### Sem espaço em disco:

```bash
# Limpar imagens não usadas
docker system prune -a --volumes

# Ver uso de disco
df -h
docker system df
```

### Erro de permissão nos uploads:

```bash
cd /root/ZohoMiddleware
chmod -R 755 backend/uploads
chown -R 1000:1000 backend/uploads
```

## 📊 Status Atual do Servidor

- **IP**: 212.85.21.122
- **OS**: Ubuntu 24.04 LTS
- **RAM**: 3.8GB (2.5GB disponível)
- **Disco**: 48GB (36GB livre)
- **Docker**: ✅ Instalado (v28.2.2)
- **Containers rodando**: 5 (waha + barbearia-bot)
- **Portas disponíveis para ZohoMiddleware**: 
  - Backend: 3004 ✅
  - Frontend: 8081 ✅

## 🔐 Segurança

### Firewall (Opcional mas Recomendado):

```bash
# Instalar UFW
apt install ufw

# Permitir SSH
ufw allow 22

# Permitir HTTP/HTTPS
ufw allow 80
ufw allow 443

# Permitir portas da aplicação (se não usar Nginx proxy)
ufw allow 3004
ufw allow 8081

# Ativar firewall
ufw enable
```

## 📞 Suporte

Se algo não funcionar:

1. Verifique os logs: `docker-compose logs -f`
2. Verifique se os containers estão rodando: `docker-compose ps`
3. Teste a conectividade: `curl http://localhost:3004/health`
4. Verifique o uso de recursos: `docker stats`

---

**Boa sorte com o deploy! 🚀**
