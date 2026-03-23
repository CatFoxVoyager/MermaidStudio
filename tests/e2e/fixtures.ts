import { defineConfig } from '@playwright/test';

/**
 * Test fixtures for E2E tests
 */

// Sample diagram data for testing
export const SAMPLE_DIAGRAMS = {
  simpleFlow: {
    id: 'test-diagram-1',
    name: 'Simple Flowchart',
    content: `graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]
    C --> D`,
    type: 'flowchart',
    theme: 'default',
  },
  sequenceDiagram: {
    id: 'test-diagram-2',
    name: 'User Registration',
    content: `sequenceDiagram
    participant User
    participant Server
    User->>Server: Register Request
    Server-->>User: 200 OK
    User->>Server: Login Request
    Server-->>User: 200 OK`,
    type: 'sequence',
    theme: 'default',
  },
  classDiagram: {
    id: 'test-diagram-3',
    name: 'Class Example',
    content: `classDiagram
    class Animal {
      +String name
      +void makeSound()
    }
    class Dog {
      +void bark()
    }
    Animal <|-- Dog`,
    type: 'class',
    theme: 'default',
  },
};

// Test users
export const TEST_USERS = {
  validUser: {
    email: 'test@example.com',
    password: 'testpass123',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpass',
  },
};

// Common selectors used across tests
export const SELECTORS = {
  // Layout elements
  appRoot: '#root',
  sidebar: '[data-testid="sidebar"]',
  workspace: '[data-testid="workspace"]',

  // Editor elements
  codeEditor: '[data-testid="code-editor"]',
  previewPanel: '[data-testid="preview-panel"]',

  // Toolbar elements
  newDiagramButton: '[data-testid="new-diagram"]',
  saveButton: '[data-testid="save-button"]',
  exportButton: '[data-testid="export-button"]',
  aiButton: '[data-testid="ai-button"]',

  // Modal elements
  modal: '[role="dialog"]',
  modalTitle: '[data-testid="modal-title"]',
  modalClose: '[data-testid="modal-close"]',

  // Tabs
  tabBar: '[data-testid="tab-bar"]',
  tab: '[data-testid="tab"]',

  // Theme toggle
  themeToggle: '[data-testid="theme-toggle"]',

  // Toast notifications
  toast: '[data-testid="toast"]',

  // Command palette
  commandPalette: '[data-testid="command-palette"]',
};