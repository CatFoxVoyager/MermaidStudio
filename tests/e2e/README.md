# E2E Testing Setup

This document provides information about the End-to-End testing setup for Mermaid Studio using Playwright.

## Overview

The E2E test suite is built using Playwright and covers critical user journeys in the Mermaid Studio application. It includes:

- Basic diagram creation and editing
- Template selection and management
- AI-powered features
- Settings and theme management
- Performance testing
- Cross-browser compatibility

## Test Structure

```
tests/e2e/
├── tests/
│   ├── auth/                 # Authentication flows
│   ├── user-flows/          # Core user journeys
│   │   ├── template-selection.spec.ts
│   │   └── export.spec.ts
│   ├── diagram-features/    # Diagram-specific features
│   │   └── basic-diagram-creation.spec.ts
│   ├── ai-features/         # AI-related features
│   │   └── ai-panel.spec.ts
│   ├── settings/            # Settings and preferences
│   │   ├── theme-settings.spec.ts
│   │   └── language-settings.spec.ts
│   └── performance/         # Performance-related tests
│       └── diagram-performance.spec.ts
├── fixtures/
│   ├── basic-diagrams.ts    # Test diagram templates
│   └── test-users.ts        # Test user data
├── support/
│   ├── page-objects/       # Page Object Models
│   │   ├── AppLayoutPage.ts
│   │   └── ModalPages.ts
│   ├── commands/            # Custom commands and utilities
│   │   ├── expect-diagram.ts
│   │   ├── ai-commands.ts
│   │   └── modal-commands.ts
│   └── utils/
│       └── test-utils.ts    # Test utilities and helpers
└── playwright.config.ts     # Playwright configuration
```

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run specific test file
npx playwright tests/e2e/tests/diagram-features/basic-diagram-creation.spec.ts

# Run tests with UI
npx playwright test --ui

# Run tests with debug mode
npx playwright test --debug
```

### CI/CD Pipeline

The tests are configured to run in GitHub Actions on:
- Push to main/develop branches
- Pull requests targeting main

## Configuration

### Playwright Configuration

The `playwright.config.ts` file includes:

- Multi-browser testing (Chromium, Firefox, WebKit, Mobile)
- Automatic dev server setup
- Performance optimizations
- CI/CD specific settings
- Custom reporters (HTML, JUnit)

### Test Environment

- Base URL: http://localhost:5173 (Vite dev server)
- Default viewport: 1280x720
- Retry configuration: 2 retries on CI
- Video recording: On failure

## Writing Tests

### Page Object Model

Tests use the Page Object Model pattern for better maintainability:

```typescript
// Example: Creating a new diagram
test('should create a new diagram', async ({ page }) => {
  const appLayout = new AppLayoutPage(page);

  // Create new diagram
  await appLayout.newDiagram();

  // Verify tab was created
  const tabCount = await appLayout.tabBar.getTabCount();
  expect(tabCount).toBe(2);
});
```

### Custom Commands

Custom commands are available in `support/commands/`:

```typescript
// AI commands
await aiCommands.openAI(page);
await aiCommands.sendMessage(page, 'Create a flowchart');
await aiCommands.waitForResponse(page);

// Modal commands
await modalCommands.openModal(page, 'templates');
await modalCommands.closeModal(page, 'templates');

// Diagram assertions
await expectDiagram.toRender(page);
await expectDiagram.toHaveNodes(page, 5);
```

### Test Utilities

The `support/utils/test-utils.ts` provides utilities for:

- Waiting for diagram rendering
- Counting rendered nodes/edges
- Getting preview content
- Error handling

```typescript
// Wait for diagram to render
await TestUtils.waitForDiagramRender(page);

// Get number of nodes
const nodeCount = await TestUtils.countRenderedNodes(page);
expect(nodeCount).toBe(5);

// Check for errors
const errors = await TestUtils.getDiagramErrors(page);
expect(errors).toHaveLength(0);
```

## Best Practices

### Test Organization

1. **Group related tests** by feature or user journey
2. **Use descriptive test names** that clearly describe the scenario
3. **Write atomic tests** that test one specific functionality
4. **Arrange-Act-Assert pattern** should be followed consistently

### Page Objects

1. **Encapsulate selectors** and interactions in page objects
2. **Keep page objects simple** and focused on UI interactions
3. **Reuse page objects** across different tests

### Test Data

1. **Use fixtures** for test data and templates
2. **Keep test data realistic** but simple
3. **Avoid hardcoded values** in test files

### Error Handling

1. **Use proper timeouts** based on expected performance
2. **Wait for elements** to be visible before interaction
3. **Handle asynchronous operations** properly
4. **Provide meaningful error messages** in assertions

## Debugging

### Common Issues

1. **Element not found**: Add proper waits and check selectors
2. **Race conditions**: Use proper synchronization
3. **Flaky tests**: Add appropriate retries and waits

### Debugging Tools

```bash
# Run tests with debug mode
npx playwright test --debug

# Run tests with tracing
npx playwright test --trace on

# Open test report
npx playwright show-report
```

### CI/CD Debugging

1. Download artifacts from GitHub Actions
2. Check the HTML report for details
3. Review screenshots and videos for failed tests
4. Check logs for error details

## Performance Considerations

- Tests are optimized to run in parallel
- Headless mode is used in CI for faster execution
- Video recording is only kept on failure
- Screenshots are captured only when needed

## Maintenance

### Updating Selectors

When UI changes:

1. Update selectors in page objects
2. Update any custom commands
3. Run tests to identify affected tests
4. Update tests as needed

### Adding New Tests

1. Create test files in appropriate folders
2. Use existing page objects when possible
3. Follow the existing test patterns
4. Add documentation for new test scenarios

### Browser Updates

Playwright auto-updates browser binaries. If issues occur:

1. Run `npx playwright install --update-channels`
2. Check for compatibility issues
3. Update configuration if needed

## Future Enhancements

- Visual regression testing
- Accessibility testing integration
- Mobile device testing
- Load testing
- API testing integration