# Documentation Automation Guide

This guide provides an overview of the documentation automation system implemented in MermaidStudio.

## Overview

The documentation system is fully automated and includes:
- **Code-based documentation generation** from TypeScript source files
- **Quality validation** with link checking and coverage analysis
- **CI/CD integration** for automatic generation and deployment
- **Maintenance workflows** for keeping documentation fresh

## Scripts

### 1. `scripts/generate-docs.cjs` - Main Documentation Generator

**Purpose**: Generates comprehensive documentation from source code.

**Features**:
- Extracts JSDoc comments from TypeScript files
- Generates API documentation for hooks and services
- Creates architecture documentation
- Generates contribution guidelines
- Updates documentation index

**Usage**:
```bash
npm run docs
# or
node scripts/generate-docs.cjs
```

### 2. `scripts/check-doc-quality.cjs` - Quality Checker

**Purpose**: Validates documentation quality and generates reports.

**Features**:
- Checks for broken links in markdown files
- Analyzes documentation coverage across TypeScript files
- Identifies outdated documentation
- Generates comprehensive quality reports

**Usage**:
```bash
npm run docs:check
# or
node scripts/check-doc-quality.cjs
```

### 3. `scripts/test-docs.cjs` - Test Suite

**Purpose**: Runs comprehensive tests of the documentation system.

**Features**:
- Validates documentation structure
- Tests generation and quality checking
- Generates test reports in JSON format

**Usage**:
```bash
npm run docs:test
# or
node scripts/test-docs.cjs
```

## CI/CD Integration

### Main Pipeline (`.github/workflows/ci.yml`)

The main CI pipeline includes:
- **Documentation Generation**: Runs on all branches
- **Quality Checks**: Validates documentation before deployment
- **Deployment**: Automatically deploys to GitHub Pages on main branch

### Documentation Maintenance (`.github/workflows/docs.yml`)

Dedicated workflow for documentation maintenance:
- **Freshness Check**: Monitors documentation age
- **Quality Reports**: Generates periodic quality assessments
- **Stale Issues**: Automatically creates issues for outdated docs
- **Scheduled Reviews**: Monthly review reminders

## Documentation Structure

```
docs/
├── README.md                    # Main documentation index
├── CONTRIBUTING.md             # Contribution guidelines
├── api/                        # API documentation
│   └── README.md              # Generated from hooks and services
├── architecture/               # Architecture documentation
│   └── README.md              # System architecture overview
├── user-guide/                # User documentation (placeholder)
├── developer-guide/           # Developer documentation (placeholder)
└── reports/                   # Quality and test reports
    ├── quality-report.md      # Documentation quality assessment
    └── test-report.json        # Test suite results
```

## Quality Metrics

The system tracks several quality metrics:

1. **Link Health**: Percentage of markdown files without broken links
2. **Documentation Coverage**: Percentage of TypeScript files with JSDoc comments
3. **Freshness**: Whether documentation is up to date (within 30 days)

## Best Practices

### For Developers

1. **Add JSDoc Comments**: Document all public functions and classes
   ```typescript
   /**
    * Handles user login authentication
    * @param email - User email address
    * @param password - User password
    * @returns Promise resolving to user data
    */
   async function login(email: string, password: string): Promise<User>
   ```

2. **Update Documentation**: When modifying features, update relevant documentation

3. **Run Quality Checks**: Before committing, check documentation quality
   ```bash
   npm run docs:check
   ```

### For Maintainers

1. **Monitor Quality Reports**: Check `docs/reports/quality-report.md` regularly
2. **Address Issues**: Fix broken links and improve coverage
3. **Schedule Reviews**: Use scheduled issues to review documentation

## Troubleshooting

### Common Issues

1. **Module Not Found**: Ensure all scripts use `.cjs` extension
2. **Timeout on Link Checks**: Increase timeout in quality check script
3. **Low Coverage**: Add JSDoc comments to undocumented files

### Debug Commands

```bash
# Test documentation generation
node scripts/generate-docs.cjs

# Check specific file
node scripts/check-doc-quality.cjs

# Run tests
node scripts/test-docs.cjs
```

## Future Enhancements

1. **Automated API Documentation**: Integrate with Swagger/OpenAPI
2. **Visual Documentation**: Include component diagrams and flowcharts
3. **Automated Changelog**: Generate changelog from PRs
4. **Interactive Examples**: Add runnable code examples

## Contributing

When contributing to documentation:
1. Follow the existing format and structure
2. Keep examples simple and relevant
3. Update links when moving or renaming files
4. Run quality checks before submitting changes

*Last updated: 2026-03-23*