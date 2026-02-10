#!/bin/bash

# Script para finalizar o deploy no servidor VPS
# Execute este script no servidor após copiar os arquivos

echo "=================================="
echo "  ZohoMiddleware - Setup Final"
echo "=================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Erro: docker-compose.yml não encontrado!${NC}"
    echo "Execute este script dentro do diretório /root/ZohoMiddleware"
    exit 1
fi

echo -e "${YELLOW}1. Criando diretórios necessários...${NC}"
mkdir -p backend/uploads backend/logs
chmod 755 backend/uploads backend/logs
echo -e "${GREEN}✓ Diretórios criados${NC}"
echo ""

echo -e "${YELLOW}2. Verificando arquivo .env...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Arquivo .env não encontrado. Criando a partir do .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${RED}⚠ IMPORTANTE: Você precisa editar o arquivo .env com suas credenciais!${NC}"
        echo -e "${YELLOW}Execute: nano .env${NC}"
        echo ""
        read -p "Pressione Enter para editar o .env agora, ou Ctrl+C para sair e editar depois..."
        nano .env
    else
        echo -e "${RED}Erro: .env.example não encontrado!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Arquivo .env já existe${NC}"
    echo -e "${YELLOW}Deseja editar o .env? (s/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([sS][iI][mM]|[sS])$ ]]; then
        nano .env
    fi
fi
echo ""

echo -e "${YELLOW}3. Verificando variáveis de ambiente obrigatórias...${NC}"
source .env
missing_vars=0

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "seu_jwt_secret_aqui_minimo_32_caracteres" ]; then
    echo -e "${RED}✗ JWT_SECRET não configurado${NC}"
    missing_vars=1
fi

if [ -z "$ZOHO_CLIENT_ID" ] || [ "$ZOHO_CLIENT_ID" = "SEU_CLIENT_ID" ]; then
    echo -e "${RED}✗ ZOHO_CLIENT_ID não configurado${NC}"
    missing_vars=1
fi

if [ -z "$ZOHO_CLIENT_SECRET" ] || [ "$ZOHO_CLIENT_SECRET" = "SEU_CLIENT_SECRET" ]; then
    echo -e "${RED}✗ ZOHO_CLIENT_SECRET não configurado${NC}"
    missing_vars=1
fi

if [ $missing_vars -eq 1 ]; then
    echo ""
    echo -e "${RED}⚠ Variáveis de ambiente obrigatórias estão faltando!${NC}"
    echo -e "${YELLOW}Por favor, edite o arquivo .env antes de continuar.${NC}"
    echo -e "${YELLOW}Execute: nano .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Variáveis de ambiente configuradas${NC}"
echo ""

echo -e "${YELLOW}4. Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker não está instalado!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose não está instalado!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker: $(docker --version)${NC}"
echo -e "${GREEN}✓ Docker Compose: $(docker-compose --version)${NC}"
echo ""

echo -e "${YELLOW}5. Verificando portas disponíveis...${NC}"
if netstat -tulpn | grep -q ":3004 "; then
    echo -e "${RED}✗ Porta 3004 já está em uso!${NC}"
    netstat -tulpn | grep ":3004 "
    exit 1
fi

if netstat -tulpn | grep -q ":8081 "; then
    echo -e "${RED}✗ Porta 8081 já está em uso!${NC}"
    netstat -tulpn | grep ":8081 "
    exit 1
fi

echo -e "${GREEN}✓ Portas 3004 e 8081 estão disponíveis${NC}"
echo ""

echo -e "${YELLOW}6. Fazendo build das imagens Docker...${NC}"
echo -e "${YELLOW}   Isso pode levar alguns minutos (5-10 min)...${NC}"
if docker-compose build; then
    echo -e "${GREEN}✓ Build concluído com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro no build das imagens${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}7. Subindo os containers...${NC}"
if docker-compose up -d; then
    echo -e "${GREEN}✓ Containers iniciados com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro ao iniciar os containers${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}8. Aguardando containers ficarem saudáveis...${NC}"
sleep 5

echo ""
echo -e "${YELLOW}Status dos containers:${NC}"
docker-compose ps
echo ""

echo -e "${YELLOW}9. Testando conectividade...${NC}"
sleep 3

# Testar backend
if curl -s http://localhost:3004/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend respondendo na porta 3004${NC}"
else
    echo -e "${YELLOW}⚠ Backend ainda não está respondendo (pode levar alguns segundos)${NC}"
fi

# Testar frontend
if curl -s http://localhost:8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend respondendo na porta 8081${NC}"
else
    echo -e "${YELLOW}⚠ Frontend ainda não está respondendo (pode levar alguns segundos)${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}  Deploy Concluído!${NC}"
echo "=================================="
echo ""
echo -e "${GREEN}Serviços disponíveis em:${NC}"
echo -e "  📱 Frontend: ${YELLOW}http://212.85.21.122:8081${NC}"
echo -e "  🔧 Backend:  ${YELLOW}http://212.85.21.122:3004${NC}"
echo -e "  💚 Health:   ${YELLOW}http://212.85.21.122:3004/health${NC}"
echo ""
echo -e "${YELLOW}Comandos úteis:${NC}"
echo "  Ver logs:         docker-compose logs -f"
echo "  Ver status:       docker-compose ps"
echo "  Restart:          docker-compose restart"
echo "  Parar:            docker-compose down"
echo "  Rebuild:          docker-compose up -d --build"
echo ""
echo -e "${YELLOW}Para ver os logs em tempo real:${NC}"
echo "  docker-compose logs -f"
echo ""
echo -e "${GREEN}Próximos passos:${NC}"
echo "  1. Configure um domínio apontando para este servidor"
echo "  2. Configure o Nginx como proxy reverso (ver DEPLOY-GUIDE.md)"
echo "  3. Instale SSL com Certbot"
echo ""
