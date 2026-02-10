# 🚀 Deploy Rápido - ZohoMiddleware

## Status: ✅ Arquivos Preparados

Todos os arquivos Docker foram criados e a maioria foi copiada para o servidor.

## 📋 Próximos Passos

### 1️⃣ Copie os Arquivos Restantes

Abra o **PowerShell** e execute:

```powershell
cd "c:\Users\samue\Downloads\sla\ZohoMiddleware"

# Copie os arquivos principais
scp docker-compose.yml root@212.85.21.122:/root/ZohoMiddleware/
scp .env.example root@212.85.21.122:/root/ZohoMiddleware/
scp .dockerignore root@212.85.21.122:/root/ZohoMiddleware/
scp setup-server.sh root@212.85.21.122:/root/ZohoMiddleware/
```

### 2️⃣ Conecte ao Servidor

```powershell
ssh root@212.85.21.122
```

### 3️⃣ Execute o Script de Setup

```bash
cd /root/ZohoMiddleware
chmod +x setup-server.sh
./setup-server.sh
```

O script irá:
- ✅ Criar diretórios necessários
- ✅ Configurar variáveis de ambiente (.env)
- ✅ Verificar Docker e portas
- ✅ Fazer build das imagens
- ✅ Subir os containers
- ✅ Testar conectividade

### 4️⃣ Configure suas Credenciais

Quando o script pedir, edite o arquivo `.env`:

```env
JWT_SECRET=cole_um_valor_aleatorio_com_32_caracteres_aqui
ZOHO_CLIENT_ID=seu_client_id_do_zoho
ZOHO_CLIENT_SECRET=seu_client_secret_do_zoho
ZOHO_REDIRECT_URI=http://212.85.21.122:3004/auth/callback
ZOHO_REFRESH_TOKEN=seu_refresh_token_do_zoho
FRONTEND_URL=http://212.85.21.122:8081
```

**Para gerar JWT_SECRET:**
```bash
openssl rand -base64 32
```

### 5️⃣ Aguarde o Deploy

O build pode levar **5-10 minutos**. Aguarde até ver a mensagem de sucesso!

---

## 🌐 Acessar a Aplicação

Após o deploy:

- **Frontend**: http://212.85.21.122:8081
- **Backend**: http://212.85.21.122:3004
- **Health Check**: http://212.85.21.122:3004/health

---

## 🔧 Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Ver status
docker-compose ps

# Restart
docker-compose restart

# Parar
docker-compose down

# Ver recursos
docker stats
```

---

## 📚 Documentação Completa

- **[DEPLOY-GUIDE.md](DEPLOY-GUIDE.md)** - Guia completo de deploy
- **[README-DOCKER.md](README-DOCKER.md)** - Documentação Docker
- **setup-server.sh** - Script automatizado de setup

---

## ⚠️ Troubleshooting

### Porta ocupada?

```bash
# Ver o que está usando a porta
netstat -tulpn | grep -E '3004|8081'

# Mudar a porta no docker-compose.yml
nano docker-compose.yml
```

### Container não sobe?

```bash
# Ver logs detalhados
docker-compose logs zoho-backend
docker-compose logs zoho-admin

# Rebuild forçado
docker-compose down
docker-compose up -d --build --force-recreate
```

### Erro de permissão?

```bash
chmod -R 755 backend/uploads
chmod -R 755 backend/logs
```

---

## 🎯 Checklist Final

- [ ] Arquivos copiados para `/root/ZohoMiddleware`
- [ ] Arquivo `.env` configurado com credenciais reais
- [ ] Script `setup-server.sh` executado com sucesso
- [ ] Containers rodando: `docker-compose ps`
- [ ] Frontend acessível: http://212.85.21.122:8081
- [ ] Backend respondendo: http://212.85.21.122:3004/health

---

## 📞 Precisa de Ajuda?

1. Verifique os logs: `docker-compose logs -f`
2. Verifique o status: `docker-compose ps`
3. Consulte: [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md)

**Boa sorte! 🚀**
