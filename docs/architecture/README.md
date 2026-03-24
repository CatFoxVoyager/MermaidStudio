# Architecture Documentation

This document describes the system architecture, components, and design patterns used in MermaidStudio.

## Component Overview

The application is built with the following main components:


## State Management

The application uses React hooks for state management:

- **useTheme**: Manages dark/light theme
- **useTabs**: Handles multi-tab diagram editing
- **useToast**: Manages toast notifications
- **useKeyboardShortcuts**: Handles keyboard shortcuts

## Data Flow

1. User actions trigger state updates via hooks
2. State changes propagate to child components
3. Components re-render with updated data
4. Diagram rendering is updated via Mermaid integration

## Storage Architecture

The application uses localStorage for persistence:

### Storage Structure
```typescript
interface StorageData {
  diagrams: Diagram[];
  settings: Settings;
  versionHistory: VersionHistory;
}
```

## Security Considerations

All diagram content is sanitized before rendering using DOMPurify to prevent XSS attacks.

### Security Features
- **Input Validation**: All diagram syntax is validated
- **Output Sanitization**: SVG output is sanitized
- **API Key Storage**: API keys are stored in localStorage (user-controlled)
- **CSP Headers**: Content Security Policy for production
*Last updated: 2026-03-23*
