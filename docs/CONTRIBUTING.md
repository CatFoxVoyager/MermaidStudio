# Contributing to MermaidStudio

Thank you for your interest in contributing to MermaidStudio! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/mermaid-studio.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/amazing-feature`
5. Make your changes
6. Run tests: `npm test`
7. Run linting: `npm run lint`
8. Commit your changes: `git commit -m 'feat: add amazing feature'`
9. Push to your fork: `git push origin feature/amazing-feature`
10. Create a pull request

## Code Style

We follow strict code style guidelines:

### TypeScript
- Use strict TypeScript configuration
- Define types for all function parameters
- Enable noImplicitAny and strictNullChecks

### React
- Use functional components with hooks
- Prefer useCallback for functions passed to props
- Use useMemo for expensive calculations

### CSS
- Use Tailwind CSS classes only
- No CSS modules or styled-components
- Mobile-first responsive design

## Testing

We use Vitest for testing:

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- Write unit tests for all components
- Test all error scenarios
- Use Jest mocks for external dependencies

## Git Workflow

### Branch Naming
- Features: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Tests: `test/description`

### Commit Messages
Use conventional commits:

```text
<type>[optional scope]: <description>

[body]
[footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or tooling changes

## Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if needed
3. Add test cases for new features
4. Create a pull request with a clear title
5. Fill out the pull request template
6. Wait for review
7. Address feedback
8. Get approval and merge

## Reporting Bugs

When reporting bugs, please include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser version
- Screenshots if helpful

*Last updated: 2026-03-23*
