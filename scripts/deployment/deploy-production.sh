#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="deploy"
DEPLOY_HOST="prod.yourapp.com"
DEPLOY_PATH="/var/www/mermaid-prod"
SSH_KEY="$HOME/.ssh/deploy_key"
BACKUP_DIR="/backups/production"
ROLLBACK_DIR="/var/www/mermaid-prod-rollback"

echo -e "${GREEN}🚀 Starting production deployment...${NC}"

# Verify this is a production deployment
read -p "This is a PRODUCTION deployment. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Aborting deployment.${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating production backup...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $BACKUP_DIR && cp -r $DEPLOY_PATH $BACKUP_DIR/backup-\$(date +%Y%m%d-%H%M%S)"

# Prepare rollback
echo -e "${YELLOW}🔄 Preparing rollback...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl stop mermaid-prod && sudo cp -r $DEPLOY_PATH $ROLLBACK_DIR"

# Sync files with verification
echo -e "${YELLOW}📤 Syncing files...${NC}"
rsync -avz -e "ssh -i $SSH_KEY" --delete dist/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

# Verify critical files
echo -e "${YELLOW}🔍 Verifying critical files...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "ls -la $DEPLOY_PATH/index.html > /dev/null && echo '✅ index.html exists'"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && npm ci --production"

# Build application
echo -e "${YELLOW}🔨 Building application...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && npm run build"

# Health check before deployment
echo -e "${YELLOW}🔍 Running health check...${NC}"
if curl -f "http://$DEPLOY_HOST:3000/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed.${NC}"
else
    echo -e "${RED}❌ Health check failed. Aborting deployment.${NC}"
    exit 1
fi

# Deploy (blue-green strategy)
echo -e "${YELLOW}🚀 Deploying...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl start mermaid-prod"

# Wait for service to start
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 15

# Run smoke tests
echo -e "${YELLOW}🧪 Running smoke tests...${NC}"
if curl -f "http://$DEPLOY_HOST:3000/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Smoke tests passed!${NC}"

    # Clean up old rollback after successful deployment
    echo -e "${YELLOW}🧹 Cleaning up old rollback...${NC}"
    ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo rm -rf $ROLLBACK_DIR"
else
    echo -e "${RED}❌ Smoke tests failed! Initiating rollback...${NC}"

    # Rollback
    ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl stop mermaid-prod && sudo rm -rf $DEPLOY_PATH && sudo cp -r $ROLLBACK_DIR $DEPLOY_PATH && sudo systemctl start mermaid-prod"

    echo -e "${GREEN}✅ Rollback completed.${NC}"
    exit 1
fi

# Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
sleep 5
if curl -f "http://$DEPLOY_HOST:3000/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Production deployment completed successfully!${NC}"
else
    echo -e "${RED}❌ Deployment verification failed.${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 All done!${NC}"