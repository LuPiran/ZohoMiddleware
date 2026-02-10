#!/bin/bash

# Script para configurar Nginx como proxy reverso para ZohoMiddleware
# Execute este script DEPOIS de subir os containers Docker

echo "=================================="
echo "  Nginx Proxy Reverso - Setup"
echo "=================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se o Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx não está instalado. Instalando...${NC}"
    apt update
    apt install -y nginx
    echo -e "${GREEN}✓ Nginx instalado${NC}"
else
    echo -e "${GREEN}✓ Nginx já está instalado${NC}"
fi
echo ""

# Solicitar o domínio
echo -e "${YELLOW}Digite seu domínio (ex: meudominio.com):${NC}"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Erro: Domínio não pode ser vazio!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Configurando Nginx para o domínio: ${GREEN}$DOMAIN${NC}"
echo ""

# Criar configuração do Nginx
CONFIG_FILE="/etc/nginx/sites-available/zoho"

cat > $CONFIG_FILE << EOF
server {
    listen 80;
    listen [::]:80;
    
    server_name $DOMAIN www.$DOMAIN;

    access_log /var/log/nginx/zoho-access.log;
    error_log /var/log/nginx/zoho-error.log;

    client_max_body_size 50M;

    # Frontend
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3004;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    server_tokens off;
}
EOF

echo -e "${GREEN}✓ Configuração criada em: $CONFIG_FILE${NC}"

# Criar link simbólico
if [ -L "/etc/nginx/sites-enabled/zoho" ]; then
    echo -e "${YELLOW}Link simbólico já existe, removendo...${NC}"
    rm /etc/nginx/sites-enabled/zoho
fi

ln -s $CONFIG_FILE /etc/nginx/sites-enabled/zoho
echo -e "${GREEN}✓ Link simbólico criado${NC}"
echo ""

# Testar configuração do Nginx
echo -e "${YELLOW}Testando configuração do Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Configuração do Nginx está correta${NC}"
else
    echo -e "${RED}✗ Erro na configuração do Nginx${NC}"
    exit 1
fi
echo ""

# Recarregar Nginx
echo -e "${YELLOW}Recarregando Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx recarregado${NC}"
echo ""

echo "=================================="
echo -e "${GREEN}  Nginx Configurado!${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo ""
echo "1. Verifique se seu domínio aponta para este servidor:"
echo -e "   ${YELLOW}http://$DOMAIN${NC}"
echo ""
echo "2. Instale SSL com Certbot para habilitar HTTPS:"
echo -e "   ${GREEN}apt install certbot python3-certbot-nginx -y${NC}"
echo -e "   ${GREEN}certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
echo ""
echo "3. Configure o firewall (se necessário):"
echo -e "   ${GREEN}ufw allow 80/tcp${NC}"
echo -e "   ${GREEN}ufw allow 443/tcp${NC}"
echo ""
echo -e "${YELLOW}URLs de acesso:${NC}"
echo -e "  HTTP:  ${GREEN}http://$DOMAIN${NC}"
echo -e "  HTTPS: ${GREEN}https://$DOMAIN${NC} (após instalar SSL)"
echo ""

# Perguntar se deseja instalar SSL
echo -e "${YELLOW}Deseja instalar SSL agora? (s/N)${NC}"
read -r response

if [[ "$response" =~ ^([sS][iI][mM]|[sS])$ ]]; then
    echo ""
    echo -e "${YELLOW}Instalando Certbot...${NC}"
    apt install -y certbot python3-certbot-nginx
    
    echo ""
    echo -e "${YELLOW}Digite seu email para renovação de certificados:${NC}"
    read -r EMAIL
    
    if [ -z "$EMAIL" ]; then
        echo -e "${RED}Email não fornecido. Instalando SSL sem email...${NC}"
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --register-unsafely-without-email --agree-tos
    else
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ SSL instalado com sucesso!${NC}"
        echo -e "${GREEN}Acesse: https://$DOMAIN${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠ Certbot encontrou um problema. Verifique se:${NC}"
        echo "  1. Seu domínio aponta para este servidor"
        echo "  2. As portas 80 e 443 estão abertas no firewall"
        echo "  3. Você tem acesso à internet"
    fi
else
    echo ""
    echo -e "${YELLOW}Você pode instalar SSL depois executando:${NC}"
    echo -e "  ${GREEN}apt install certbot python3-certbot-nginx -y${NC}"
    echo -e "  ${GREEN}certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
fi

echo ""
echo -e "${GREEN}Configuração concluída!${NC}"
