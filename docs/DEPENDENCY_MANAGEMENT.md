# 📚 Dependency Management Quick Reference

The canonical package manager is **pnpm 10** (`pnpm-lock.yaml` is committed;
`packageManager: pnpm@10.34.9`). Most routine updates are automated by
**Renovate** (see below) — this reference covers what you do by hand.

## Daily Commands

### Check for vulnerabilities
```bash
pnpm audit
```

### Check for outdated packages
```bash
pnpm outdated
```

### Update packages (non-breaking)
```bash
pnpm update
```

### Install security fixes (non-breaking)
```bash
pnpm audit --fix
```

## Weekly Tasks

### Full dependency audit
```bash
# Check everything
pnpm audit --audit-level=moderate
pnpm outdated --long
pnpm exec license-checker
```

### Test updates
```bash
# Create feature branch
git checkout -b deps/update-$(date +%Y%m%d)

# Update packages
pnpm update

# Test everything
npm run type-check
npm run lint
npm test
npm run build

# If successful, commit
git add package.json pnpm-lock.yaml
git commit -m "chore: update dependencies"
git push origin deps/update-$(date +%Y%m%d)
```

## Monthly Tasks

### Major version updates
```bash
# Review outdated packages
pnpm outdated

# Plan major updates (one at a time)
pnpm add package@latest

# Test thoroughly
npm run test:coverage
npm run build
npm run preview
```

### Bundle size analysis
```bash
# Analyze bundle impact
npm run build
npx bundlewatch

# Check for large dependencies
npx bundle-phobia-cli
```

## Security Response

### Immediate action (high/critical vulnerabilities)
```bash
# 1. Stop deployments
# 2. Fix immediately (breaking fixes may need manual edits)
pnpm audit --fix

# 3. Test thoroughly
npm test
npm run build

# 4. Deploy fix
git add .
git commit -m "security: fix critical vulnerabilities"
git push
```

### Planned action (moderate/low vulnerabilities)
```bash
# Add to backlog
# Schedule for next maintenance window
# Create security issue with details
```

## Dependency Update Workflow

1. **Research** - Read changelogs and breaking changes
2. **Branch** - Create feature branch
3. **Update** - Update specific package
4. **Test** - Run all tests
5. **Document** - Update CHANGELOG.md
6. **PR** - Create pull request
7. **Review** - Code review
8. **Merge** - Merge after approval
9. **Deploy** - Monitor production

## Common Scenarios

### Scenario 1: Security Vulnerability Found
```bash
# Check severity
pnpm audit

# Auto-fix if possible
pnpm audit --fix

# If breaking changes are involved
# edit the code manually, then test everything!
```

### Scenario 2: Major Version Update
```bash
# Check current version
pnpm list package-name

# Install latest major
pnpm add package-name@latest

# Read migration guide
# Update code as needed
# Test thoroughly
```

**Mermaid specifically:** the mermaid pin is exact and the CDN embed carries a
matching SRI — for the revert path (known-good pair 11.17.2 + layout-elk 0.2.3
via `git revert bf3658e`) and the fast-follow bump procedure, see
[developer-guide/mermaid-revert-and-tracking.md](./developer-guide/mermaid-revert-and-tracking.md).

### Scenario 3: License Compatibility Issue
```bash
# Check licenses
pnpm exec license-checker

# Find alternative packages
pnpm search alternative-name

# Replace package
pnpm remove bad-package
pnpm add good-package
```

### Scenario 4: Bundle Size Too Large
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Identify large dependencies
# Replace or optimize
# Test and verify
```

## Automated Monitoring

### Renovate
`renovate.json` automates routine updates (schedule: before 7am on Mondays):
- npm non-major updates and GitHub Actions updates are **grouped and auto-merged when CI is green**
- Major updates open **separate PRs for manual review**
- Weekly lockfile maintenance (auto-merge on green)
- Vulnerability alerts are labeled `security`
- A regex manager keeps the Playwright version of the self-hosted runner Dockerfile aligned with the npm dependency

### GitHub Actions
The workflow `.github/workflows/dependency-audit.yml` runs daily to:
- Scan for vulnerabilities
- Check for outdated packages
- Verify license compliance
- Create issues for critical findings

### Pre-commit Hooks
```bash
# .husky/pre-commit runs on every commit (fast, ~10s)
pnpm run lint
pnpm run type-check
```
The full unit suite runs in CI (the `test:coverage` job), not in the hook.

### CI/CD Integration
Already wired into the pipeline:
- `ci.yml` — Security Scan job: `pnpm audit --audit-level=moderate` + Snyk (advisory)
- `dependency-audit.yml` — daily audit, outdated check, license check, critical-issue creation, PR comments

## Best Practices

### ✅ Do
- Keep dependencies updated regularly
- Read changelogs before major updates
- Test in staging before production
- Monitor security advisories
- Use semantic versioning
- Document breaking changes
- Keep lock files committed

### ❌ Don't
- Ignore security warnings
- Update everything at once
- Skip testing after updates
- Use `npm audit fix --force` blindly
- Commit without testing
- Ignore peer dependency warnings
- Use deprecated packages

## Emergency Contacts

- **Security Team:** @security-team
- **Maintainer:** @maintainer
- **Dependency Expert:** @expert

## Resources

- [npm security](https://docs.npmjs.com/security)
- [npm audit](https://docs.npmjs.com/cli/audit)
- [Semantic Versioning](https://semver.org/)
- [Snyk Advisor](https://snyk.io/advisor/)
- [Bundlephobia](https://bundlephobia.com/)

---

*Updated: 2026-11-03*