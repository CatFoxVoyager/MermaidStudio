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
ROLLBACK_DIR="/var/www/mermaid-prod-rollback"

if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Please specify the backup to rollback to.${NC}"
    echo "Usage: $0 <backup-date-time>"
    echo "Example: $0 20240323-143000"
    exit 1
fi

BACKUP_TIME=$1
BACKUP_PATH="$BACKUP_DIR/backup-$BACKUP_TIME"

echo -e "${GREEN}🔄 Starting rollback...${NC}"

# Check if backup exists
echo -e "${YELLOW}🔍 Checking backup existence...${NC}"
if ! ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "ls -la $BACKUP_PATH" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backup $BACKUP_TIME not found.${NC}"
    exit 1
fi

# Stop service
echo -e "${YELLOW}⏹️  Stopping service...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl stop mermaid-prod"

# Create current backup before rollback
echo -e "${YELLOW}📦 Creating current state backup...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p $BACKUP_DIR && cp -r $DEPLOY_PATH $BACKUP_DIR/rollback-$(date +%Y%m%d-%H%M%S)"

# Perform rollback
echo -e "${YELLOW}🔄 Performing rollback...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo rm -rf $DEPLOY_PATH && sudo cp -r $BACKUP_PATH $DEPLOY_PATH"

# Restart service
echo -e "${YELLOW}🚀 Starting service...${NC}"
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl start mermaid-prod"

# Wait for service to start
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 15

# Verify rollback
echo -e "${YELLOW}🔍 Verifying rollback...${NC}"
if curl -f "http://$DEPLOY_HOST:3000/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Rollback completed successfully!${NC}"
else
    echo -e "${RED}❌ Rollback verification failed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Rollback completed at $(date)${NC}"