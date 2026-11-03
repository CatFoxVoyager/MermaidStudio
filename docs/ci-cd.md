# CI/CD Setup Documentation

## Overview

This project has a comprehensive CI/CD pipeline set up using GitHub Actions that automates testing, building, and deployment processes. All pipeline jobs run on **self-hosted Linux (X64) runners** and use **pnpm** (the canonical package manager; `pnpm install --frozen-lockfile` everywhere).

## Pipeline Stages

### 1. Lint & Type Check
- **Triggered on**: Push/PR to main or develop
- **Actions**:
  - Run OxLint to catch code style issues (`pnpm run lint` → `oxlint src`)
  - Run TypeScript type checking (`tsc --noEmit` on both `tsconfig.app.json` and `tsconfig.node.json`)
- **Purpose**: Ensure code quality before proceeding

### 2. Testing
- **Triggered on**: Push/PR to main or develop
- **Actions**:
  - Run the unit suite across a Node.js matrix: **22.12 and 24**
  - Generate coverage reports (`vitest run --coverage`, blocking)
  - Upload coverage to Codecov (advisory)
- **Purpose**: Ensure application functionality across different environments

### 3. Security Scan
- **Advisory** (job-level `continue-on-error`; not a required check)
- **Actions**:
  - Run `pnpm audit --audit-level=moderate`
  - Run Snyk security scan (if `SNYK_TOKEN` configured)
- **Purpose**: Identify security vulnerabilities

### 4. Build
- **Triggered on**: After linting, testing, security, and docs pass
- **Actions**:
  - Build the application
  - Run the post-build guards: `check:elk` (ELK stays lazy), `check:ai-lazy` (AI chunks stay lazy), `check:editor-lazy` (editor chunk boundaries), `check:cdn-embed` (CDN version/SRI constants), `check:version-tag` (package.json matches latest `v*` tag), `check:readme-app-section` + its self-test
  - Upload build artifacts
- **Purpose**: Create production-ready build

### 5. Docker Build and Push
- **Triggered on**: Push to main branch
- **Actions**:
  - Build Docker image (`docker/Dockerfile`) for **linux/amd64 and linux/arm64**
  - Push to GitHub Container Registry (ghcr.io), tagged `latest` on the default branch
- **Purpose**: Containerize application for deployment

### 6. Documentation
- **Triggered on**: Push to main branch
- **Actions**:
  - Upload `docs/` and deploy it to **GitHub Pages**

### 7. Deployment
#### Staging Deployment
- **Triggered on**: Push to develop branch
- **Environment**: Staging
- **Actions**: Deploy build to staging environment

#### Production Deployment
- **Triggered on**: Push to main branch
- **Environment**: Production
- **Actions**: Deploy build to production environment

> Releases are versioned by **release-please** (manifest mode, `release.yml`): a push to main opens/updates the Release PR, and merging it tags `vX.Y.Z` and publishes the GitHub Release.

### 8. Smoke Test
- **Triggered after**: Staging deployment
- **Purpose**: Basic verification that deployment works

## Configuration

### GitHub Secrets
Configure the following secrets in your GitHub repository:

1. `SNYK_TOKEN` - For Snyk security scanning (optional; the scan is advisory without it)

### Branch Strategy

- **main**: Production branch
  - Full CI pipeline runs
  - Deploys to production
- **develop**: Development branch
  - Full CI pipeline runs
  - Deploys to staging

### Quality Gates

The pipeline enforces the following quality gates:
- No OxLint errors
- No TypeScript errors
- Coverage thresholds enforced by `vitest run --coverage` (lines 60 / functions 58 / branches 53 / statements 57 — see `vitest.config.ts`); this job is blocking and gates Renovate auto-merge
- Post-build guards must pass: ELK lazy, AI chunks lazy, editor chunk boundaries, CDN embed constants, package.json/tag agreement, README app section (plus its self-test)

## Local Development Setup

### Pre-commit Hooks
The project uses Husky for pre-commit hooks that automatically run:
- OxLint (`pnpm run lint`)
- TypeScript type checking (`pnpm run type-check`)

The full unit suite intentionally runs in CI (the `test:coverage` job), not in the hook — see `.husky/pre-commit`.

To set up:
```bash
npm install
```

### Code Quality Tools

#### OxLint
```bash
npm run lint        # Check for issues (oxlint src)
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
1. Check the deployment logs in the Actions tab
2. Rollback using your deployment tool's rollback feature
3. Investigate and fix issues

## Monitoring and Notifications

### Notifications
- No chat notifications are wired; failures surface in the GitHub Actions UI
- The dependency-audit workflow opens an issue for critical/high vulnerabilities
- The documentation-maintenance workflow opens a "Documentation Update Required" issue when docs go stale

### Monitoring
- Application health checks
- Deployment status tracking
- Test coverage trends (Codecov, advisory)
- Security vulnerability alerts (`pnpm audit` + Snyk, advisory)

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep PRs small** to make debugging easier
3. **Monitor pipeline performance** and optimize if needed
4. **Review deployment logs** after each deployment
5. **Update dependencies regularly** to get security patches (Renovate automates weekly non-major updates)

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

*Updated: 2026-11-03*