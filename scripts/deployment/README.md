# Deployment Scripts

This directory contains scripts for deploying the Mermaid Studio application to different environments.

## Scripts

### 1. `deploy-staging.sh`
Deploys the application to the staging environment.

**Features:**
- Creates backup of current staging environment
- Syncs files via rsync
- Installs dependencies
- Builds application
- Restarts service
- Runs smoke tests

**Usage:**
```bash
./deploy-staging.sh
```

### 2. `deploy-production.sh`
Deploys the application to the production environment with safety measures.

**Features:**
- Interactive confirmation before deployment
- Creates backup of current production environment
- Prepares rollback directory
- Blue-green deployment strategy
- Comprehensive health checks
- Automatic rollback on failure
- Cleanup after successful deployment

**Usage:**
```bash
./deploy-production.sh
```

### 3. `rollback.sh`
Rolls back the production environment to a specific backup.

**Features:**
- Verifies backup existence
- Creates backup before rollback
- Stops service
- Performs rollback
- Restarts service
- Verifies deployment

**Usage:**
```bash
./rollback.sh <backup-date-time>
```
Example:
```bash
./rollback.sh 20240323-143000
```

## Prerequisites

### SSH Configuration
Ensure you have SSH access configured to the deployment servers:

```bash
# Generate SSH key if needed
ssh-keygen -t ed25519 -C "deploy@example.com"

# Add public key to deployment servers
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@staging.yourapp.com
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@prod.yourapp.com
```

### Server Setup
The deployment servers should have:
- Node.js 18+ installed
- NPM or Yarn
- `mermaid-staging` and `mermaid-prod` systemd services
- The deployment path created with proper permissions

### Environment Variables
Set up environment variables on the servers:
```bash
# Staging
export NODE_ENV=staging
export API_URL=https://api-staging.yourapp.com

# Production
export NODE_ENV=production
export API_URL=https://api.yourapp.com
```

## Configuration

Before using these scripts, update the configuration variables in each script:

- `DEPLOY_USER`: SSH username for deployment
- `DEPLOY_HOST`: Server hostname or IP
- `DEPLOY_PATH`: Deployment path on server
- `SSH_KEY`: Path to SSH private key
- `BACKUP_DIR`: Backup directory path

## Systemd Services

Create systemd service files for automatic restart:

### `/etc/systemd/system/mermaid-staging.service`
```ini
[Unit]
Description=Mermaid Studio Staging
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/mermaid-staging
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=staging
Environment=API_URL=https://api-staging.yourapp.com

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/mermaid-prod.service`
```ini
[Unit]
Description=Mermaid Studio Production
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/mermaid-prod
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=API_URL=https://api.yourapp.com

[Install]
WantedBy=multi-user.target
```

Enable and start the services:
```bash
sudo systemctl enable mermaid-staging
sudo systemctl start mermaid-staging
sudo systemctl enable mermaid-prod
sudo systemctl start mermaid-prod
```

## Monitoring

### Service Status
Check service status:
```bash
sudo systemctl status mermaid-staging
sudo systemctl status mermaid-prod
```

### Logs
View logs:
```bash
sudo journalctl -u mermaid-staging -f
sudo journalctl -u mermaid-prod -f
```

## Best Practices

1. **Always test in staging first**
2. **Keep backups before deployments**
3. **Monitor deployment logs**
4. **Have rollback plan ready**
5. **Update scripts as deployment process evolves**
6. **Test rollback procedure regularly**