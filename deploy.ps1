# Script de Deploy para VPS Hostinger - PowerShell
# Server: 212.85.21.122

Write-Host "=== Deploy ZohoMiddleware ===" -ForegroundColor Green
Write-Host ""

# Variáveis
$SERVER = "root@212.85.21.122"
$REMOTE_DIR = "/root/ZohoMiddleware"

Write-Host "1. Criando diretórios no servidor..." -ForegroundColor Yellow
ssh $SERVER "mkdir -p $REMOTE_DIR/backend/src $REMOTE_DIR/admin/src $REMOTE_DIR/admin/public"

Write-Host "2. Copiando arquivos do backend..." -ForegroundColor Yellow
scp -r backend/src "${SERVER}:${REMOTE_DIR}/backend/"
scp backend/package.json "${SERVER}:${REMOTE_DIR}/backend/"
scp backend/Dockerfile "${SERVER}:${REMOTE_DIR}/backend/"

Write-Host "3. Copiando arquivos do admin..." -ForegroundColor Yellow
scp -r admin/src "${SERVER}:${REMOTE_DIR}/admin/"
scp -r admin/public "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/package.json "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/Dockerfile "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/nginx.conf "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/index.html "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/vite.config.js "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/tailwind.config.js "${SERVER}:${REMOTE_DIR}/admin/"
scp admin/eslint.config.js "${SERVER}:${REMOTE_DIR}/admin/"

Write-Host "4. Copiando arquivos raiz..." -ForegroundColor Yellow
scp docker-compose.yml "${SERVER}:${REMOTE_DIR}/"
scp .dockerignore "${SERVER}:${REMOTE_DIR}/"
scp .env.example "${SERVER}:${REMOTE_DIR}/"

Write-Host "5. Criando diretórios necessários..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR && mkdir -p backend/uploads backend/logs"

Write-Host ""
Write-Host "=== Arquivos copiados com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Agora você precisa:" -ForegroundColor Cyan
Write-Host "  1. Conectar ao servidor: ssh $SERVER"
Write-Host "  2. Editar o arquivo .env: cd $REMOTE_DIR && nano .env"
Write-Host "  3. Adicionar suas credenciais do Zoho"
Write-Host "  4. Fazer build: docker-compose build"
Write-Host "  5. Subir os containers: docker-compose up -d"
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Yellow
Write-Host "  Ver logs: ssh $SERVER 'cd $REMOTE_DIR && docker-compose logs -f'"
Write-Host "  Parar: ssh $SERVER 'cd $REMOTE_DIR && docker-compose down'"
Write-Host "  Restart: ssh $SERVER 'cd $REMOTE_DIR && docker-compose restart'"
