#!/bin/bash

# Script de Deploy para VPS Hostinger
# Server: 212.85.21.122

echo "=== Deploy ZohoMiddleware ==="
echo ""

# Variáveis
SERVER="root@212.85.21.122"
REMOTE_DIR="/root/ZohoMiddleware"
LOCAL_DIR="."

echo "1. Criando diretórios no servidor..."
ssh $SERVER "mkdir -p $REMOTE_DIR/backend $REMOTE_DIR/admin"

echo "2. Copiando arquivos do backend..."
scp -r backend/src $SERVER:$REMOTE_DIR/backend/
scp backend/package.json $SERVER:$REMOTE_DIR/backend/
scp backend/Dockerfile $SERVER:$REMOTE_DIR/backend/

echo "3. Copiando arquivos do admin..."
scp -r admin/src $SERVER:$REMOTE_DIR/admin/
scp -r admin/public $SERVER:$REMOTE_DIR/admin/
scp admin/package.json $SERVER:$REMOTE_DIR/admin/
scp admin/Dockerfile $SERVER:$REMOTE_DIR/admin/
scp admin/nginx.conf $SERVER:$REMOTE_DIR/admin/
scp admin/index.html $SERVER:$REMOTE_DIR/admin/
scp admin/vite.config.js $SERVER:$REMOTE_DIR/admin/
scp admin/tailwind.config.js $SERVER:$REMOTE_DIR/admin/
scp admin/eslint.config.js $SERVER:$REMOTE_DIR/admin/

echo "4. Copiando arquivos raiz..."
scp docker-compose.yml $SERVER:$REMOTE_DIR/
scp .dockerignore $SERVER:$REMOTE_DIR/
scp .env.example $SERVER:$REMOTE_DIR/

echo "5. Configurando variáveis de ambiente..."
ssh $SERVER "cd $REMOTE_DIR && cat > .env << 'EOL'
JWT_SECRET=$(openssl rand -base64 32)
ZOHO_CLIENT_ID=SEU_CLIENT_ID
ZOHO_CLIENT_SECRET=SEU_CLIENT_SECRET
ZOHO_REDIRECT_URI=http://seu-dominio.com/auth/callback
ZOHO_REFRESH_TOKEN=SEU_REFRESH_TOKEN
FRONTEND_URL=http://seu-dominio.com
PORT=3000
NODE_ENV=production
EOL"

echo ""
echo "6. Criando diretórios necessários..."
ssh $SERVER "cd $REMOTE_DIR && mkdir -p backend/uploads backend/logs"

echo ""
echo "7. Fazendo build das imagens Docker..."
ssh $SERVER "cd $REMOTE_DIR && docker-compose build"

echo ""
echo "8. Subindo os containers..."
ssh $SERVER "cd $REMOTE_DIR && docker-compose up -d"

echo ""
echo "=== Deploy Concluído! ==="
echo ""
echo "Serviços disponíveis em:"
echo "  - Backend: http://212.85.21.122:3004"
echo "  - Frontend: http://212.85.21.122:8081"
echo ""
echo "Para ver os logs:"
echo "  ssh $SERVER 'cd $REMOTE_DIR && docker-compose logs -f'"
echo ""
echo "Para parar os containers:"
echo "  ssh $SERVER 'cd $REMOTE_DIR && docker-compose down'"
