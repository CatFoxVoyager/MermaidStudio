#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="deploy"
DEPLOY_HOST="staging.yourapp.com"
DEPLOY_PATH="/var/www/mermaid-staging"
SSH_KEY="$HOME/.ssh/deploy_key"
BACKUP_DIR="/backups/staging"

echo -e "${GREEN}🚀 Starting staging deployment...${NC}"

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $BACKUP_DIR && cp -r $DEPLOY_PATH $BACKUP_DIR/backup-\$(date +%Y%m%d-%H%M%S)"

# Sync files
echo -e "${YELLOW}📤 Syncing files...${NC}"
rsync -avz -e "ssh -i $SSH_KEY" --delete dist/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && npm ci --production"

# Build if needed
echo -e "${YELLOW}🔨 Building application...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && npm run build"

# Restart service
echo -e "${YELLOW}🔄 Restarting service...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl restart mermaid-staging"

# Run smoke tests
echo -e "${YELLOW}🧪 Running smoke tests...${NC}"
sleep 10
if curl -f "http://$DEPLOY_HOST:3000/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Smoke tests passed!${NC}"
else
    echo -e "${RED}❌ Smoke tests failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Staging deployment completed successfully!${NC}"