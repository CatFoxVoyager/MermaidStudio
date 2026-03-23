# CI/CD Setup Documentation

## Overview

This project has a comprehensive CI/CD pipeline set up using GitHub Actions that automates testing, building, and deployment processes.

## Pipeline Stages

### 1. Lint & Type Check
- **Triggered on**: Push to any branch, PR to main/develop
- **Actions**:
  - Run ESLint to catch code style issues
  - Run TypeScript type checking
- **Purpose**: Ensure code quality before proceeding

### 2. Testing
- **Triggered on**: Push to any branch, PR to main/develop
- **Actions**:
  - Run tests across Node.js 16, 18, and 20
  - Generate coverage reports
  - Upload coverage to Codecov
- **Purpose**: Ensure application functionality across different environments

### 3. Security Scan
- **Triggered on**: Push to main and develop branches
- **Actions**:
  - Run npm audit to check for vulnerabilities
  - Run Snyk security scan (if token configured)
- **Purpose**: Identify security vulnerabilities

### 4. Build
- **Triggered on**: After linting, testing, and security pass
- **Actions**:
  - Build the application
  - Upload build artifacts
- **Purpose**: Create production-ready build

### 5. Docker Build and Push
- **Triggered on**: Push to main branch
- **Actions**:
  - Build Docker image
  - Push to GitHub Container Registry
- **Purpose**: Containerize application for deployment

### 6. Deployment
#### Staging Deployment
- **Triggered on**: Push to develop branch
- **Environment**: Staging
- **Actions**: Deploy build to staging environment

#### Production Deployment
- **Triggered on**: Push to main branch
- **Environment**: Production
- **Actions**: Deploy build to production environment

### 7. Smoke Test
- **Triggered after**: Staging deployment
- **Purpose**: Basic verification that deployment works

## Configuration

### GitHub Secrets
Configure the following secrets in your GitHub repository:

1. `SNYK_TOKEN` - For Snyk security scanning
2. `SLACK_WEBHOOK` - For Slack notifications
3. `DEPLOY_KEY` - For deployment (if needed)

### Branch Strategy

- **main**: Production branch
  - Full CI pipeline runs
  - Deploys to production
- **develop**: Development branch
  - Full CI pipeline runs
  - Deploys to staging

### Quality Gates

The pipeline enforces the following quality gates:
- No linting errors
- No TypeScript errors
- Test coverage ≥ 75% (lines, functions, branches, statements)
- No critical security vulnerabilities

## Local Development Setup

### Pre-commit Hooks
The project uses Husky for pre-commit hooks that automatically run:
- ESLint
- TypeScript type checking
- Tests

To set up:
```bash
npm install
```

### Code Quality Tools

#### ESLint
```bash
npm run lint        # Check for issues
npm run lint:fix    # Fix auto-fixable issues
```

#### TypeScript
```bash
npm run type-check  # Run type checking
```

#### Tests
```bash
npm test            # Run tests
npm run test:coverage  # Run tests with coverage
```

#### Formatting
```bash
npm run format      # Format code with Prettier
npm run format:check  # Check formatting without changing files
```

## Deployment Process

### Manual Deployment
To trigger a manual deployment:

1. Create a new branch
2. Make your changes
3. Push the branch
4. Create a pull request to main or develop
5. Wait for CI to complete
6. Merge to trigger deployment

### Rollback Strategy

If a deployment fails:
1. The pipeline will notify via Slack
2. Check the deployment logs
3. Rollback using your deployment tool's rollback feature
4. Investigate and fix issues

## Monitoring and Notifications

### Notifications
- Slack notifications for:
  - Deployment start/completion
  - Pipeline failures
  - Security alerts

### Monitoring
- Application health checks
- Deployment status tracking
- Test coverage trends
- Security vulnerability alerts

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep PRs small** to make debugging easier
3. **Monitor pipeline performance** and optimize if needed
4. **Review deployment logs** after each deployment
5. **Update dependencies regularly** to get security patches

## Troubleshooting

### Common Issues

1. **Tests failing on CI but not locally**
   - Check Node.js version matrix
   - Verify test environment dependencies
   - Check for platform-specific issues

2. **Build errors**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for circular dependencies

3. **Deployment failures**
   - Verify deployment credentials
   - Check server availability
   - Review deployment scripts

### Debugging Pipeline Steps

To debug a specific step:
1. Go to the Actions tab in GitHub
2. Click on the failed workflow run
3. Check the logs for the specific job
4. Look for error messages and stack traces

## Future Enhancements

1. **Performance Testing**: Add load testing to the pipeline
2. **Canary Deployments**: Implement blue-green deployment strategy
3. **Database Migration Automation**: Automate database schema changes
4. **Environment-specific Configs**: Manage configs per environment
5. **Infrastructure as Code**: Use Terraform for infrastructure provisioning