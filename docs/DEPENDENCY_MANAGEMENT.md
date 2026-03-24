# 📚 Dependency Management Quick Reference

## Daily Commands

### Check for vulnerabilities
```bash
npm audit
```

### Check for outdated packages
```bash
npm outdated
```

### Update packages (non-breaking)
```bash
npm update
```

### Install security fixes (non-breaking)
```bash
npm audit fix
```

## Weekly Tasks

### Full dependency audit
```bash
# Check everything
npm audit --audit-level=moderate
npm outdated --long
npx license-checker

# Generate report
npx audit-ci --moderate
```

### Test updates
```bash
# Create feature branch
git checkout -b deps/update-$(date +%Y%m%d)

# Update packages
npm update

# Test everything
npm run type-check
npm run lint
npm test
npm run build

# If successful, commit
git add package.json package-lock.json
git commit -m "chore: update dependencies"
git push origin deps/update-$(date +%Y%m%d)
```

## Monthly Tasks

### Major version updates
```bash
# Review outdated packages
npm outdated | grep "Major"

# Plan major updates (one at a time)
npm install package@latest

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
# 2. Fix immediately
npm audit fix --force

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
npm audit

# Auto-fix if possible
npm audit fix

# If force required
npm audit fix --force
# Then test everything!
```

### Scenario 2: Major Version Update
```bash
# Check current version
npm list package-name

# Install latest major
npm install package-name@latest

# Read migration guide
# Update code as needed
# Test thoroughly
```

### Scenario 3: License Compatibility Issue
```bash
# Check licenses
npx license-checker

# Find alternative packages
npm search alternative-name

# Replace package
npm uninstall bad-package
npm install good-package
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

### GitHub Actions
The workflow `.github/workflows/dependency-audit.yml` runs daily to:
- Scan for vulnerabilities
- Check for outdated packages
- Verify license compliance
- Create issues for critical findings

### Pre-commit Hooks
```bash
# Run on every commit
npm audit --audit-level=high
npm outdated
```

### CI/CD Integration
Add to your pipeline:
```yaml
- name: Dependency Check
  run: |
    npm audit --audit-level=moderate
    npm outdated
```

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

*Last updated: 2026-03-23*