## 📦 Dependency Update Summary

### Types of Changes
- [ ] **Security Fix** - Addresses vulnerability(ies)
- [ ] **Bug Fix** - Resolves a reported issue
- [ ] **New Feature** - Adds functionality
- [ ] **Breaking Change** - Changes existing behavior
- [ ] **Documentation** - Updates documentation

### Description
This PR updates project dependencies to address security vulnerabilities and improve performance.

### Security Vulnerabilities Fixed
- [ ] High severity: [List fixed vulnerabilities]
- [ ] Medium severity: [List fixed vulnerabilities]
- [ ] Low severity: [List fixed vulnerabilities]

### Breaking Changes
- [ ] Yes, there are breaking changes (see below)
- [ ] No, this is a non-breaking update

### What Changed

#### Security Fixes
| Package | From | To | Vulnerability Fixed |
|--------|------|----|-------------------|
| jsdom | 16.6.0-22.1.0 | 29.0.1 | GHSA-vpq2-c234-7xj6 |
| esbuild | <=0.24.2 | 8.0.2 | GHSA-67mh-4wv8-2f99 |
| minimatch | 9.0.0-9.0.6 | 9.0.7+ | Multiple ReDoS issues |

#### Major Version Updates
| Package | From | To | Type | Notes |
|--------|------|----|------|-------|
| @typescript-eslint/eslint-plugin | 6.21.0 | 8.57.2 | Major | Breaking changes in rules |
| @typescript-eslint/parser | 6.21.0 | 8.57.2 | Major | New TypeScript features |
| vite | 4.5.14 | 8.0.2 | Major | Performance improvements |
| vitest | 0.34.6 | 4.1.1 | Major | Vite 8 integration |

#### Minor Version Updates
| Package | From | To | Type | Notes |
|--------|------|----|------|-------|
| mermaid | 10.9.5 | 11.13.0 | Minor | Bug fixes, new features |
| tailwindcss | 3.4.19 | 4.2.2 | Major | Performance improvements |
| lucide-react | 0.263.1 | 1.0.1 | Major | New icons, better tree-shaking |

### Performance Impact
- [ ] Bundle size increased: [X] KB
- [ ] Bundle size decreased: [X] KB
- [ ] No significant change
- [ ] Not measured

### Testing Checklist
- [ ] All existing tests pass
- [ ] Security audit passes (`npm audit`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Lint check passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Development server works (`npm run dev`)

### Migration Guide (if applicable)

#### ESLint Configuration Updates
1. Updated `.eslintrc.json` for v8 compatibility
2. New rules may require code adjustments:
   ```javascript
   // Old way
   // eslint-disable-next-line @typescript-eslint/no-explicit-any

   // New way may require specific type annotation
   ```

#### Vite Plugin Changes
1. `@vitejs/plugin-react` API changes
2. New plugin system requires updates

#### TypeScript Compatibility
1. ESLint v8 supports TypeScript 5.x
2. New stricter type checking

### Known Issues
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### Additional Information
- Related to Issue #123 (if applicable)
- Dependencies from npm advisory: [Link]
- Follows [npm security best practices](https://docs.npmjs.com/security)

### Checklist
- [ ] I have read the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] Changes follow the project's coding conventions
- [ ] Tests have been added/updated
- [ ] Documentation has been updated
- [ ] CHANGELOG.md has been updated
- [ ] PR title follows conventional commits format

### Review Request
- @security-team - Please review security implications
- @maintainers - Please review general changes
- @typescript-team - Please review TypeScript updates

---

*This PR was generated using the dependency update automation tool*