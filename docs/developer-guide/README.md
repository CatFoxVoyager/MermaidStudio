# Developer Guide

This guide provides comprehensive information for developers who want to contribute to MermaidStudio, set up the development environment, or understand the codebase.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [AI Integration](#ai-integration)
7. [Testing](#testing)
8. [Building and Deployment](#building-and-deployment)
9. [Code Standards](#code-standards)
10. [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 24 (engines: `^24.22.2`)
- pnpm 10 (canonical; npm >= 10.9.9 also works)
- Git
- Modern web browser (for testing)

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/CatFoxVoyager/MermaidStudio.git
cd MermaidStudio
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

4. **Install Git hooks**
```bash
npm run prepare
```

5. **Start development server**
```bash
npm run dev
```

Navigate to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
mermaid-studio/
├── src/                           # Source code
│   ├── components/                # React components
│   │   ├── ai/                   # AI-related components
│   │   │   ├── AIPanel.tsx       # Main AI panel
│   │   │   └── AISettingsModal.tsx # AI settings
│   │   ├── editor/               # Editor components
│   │   │   ├── CodeEditor.tsx    # CodeMirror editor
│   │   │   ├── WorkspacePanel.tsx # Editor container
│   │   │   ├── StatusBar.tsx     # Status bar
│   │   │   └── TabBar.tsx        # Tab navigation
│   │   ├── modals/               # Modal components
│   │   │   ├── diagram/          # Diagram-related modals
│   │   │   ├── settings/        # Settings modals
│   │   │   └── tools/            # Tool modals
│   │   ├── preview/              # Preview components
│   │   ├── shared/               # Shared UI components
│   │   ├── visual/               # Visual editor components
│   │   └── sidebar/             # Sidebar components
│   ├── lib/                      # Core utilities
│   │   └── mermaid/              # Mermaid integration
│   │       ├── core.ts           # Mermaid initialization
│   │       ├── language.ts       # Language extensions
│   │       ├── codeUtils.ts      # Code utilities
│   │       └── autocomplete.ts   # Autocomplete
│   ├── services/                 # Business logic services
│   │   ├── ai/                   # AI services
│   │   │   └── providers.ts      # AI entrypoint (in-browser WebGPU/MLC)
│   │   └── storage/              # Storage services
│   │       └── database.ts       # IndexedDB database wrapper
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── i18n/                     # Internationalization
│   └── constants/                # Constants and configuration
├── docs/                         # Documentation
├── public/                       # Static assets
├── scripts/                      # Build and deployment scripts
├── .github/                      # GitHub workflows
├── .husky/                       # Git hooks
├── .planning/                    # Project planning docs
├── docker/                       # Docker configuration
└── tests/                        # Test files
```

## Development Workflow

### Common Commands

```bash
# Development
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run OxLint (oxlint src)
npm run lint:fix     # Fix auto-fixable issues
npm run type-check   # Run TypeScript type checking
npm run format       # Format code with Prettier

# Testing
npm test             # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report

# Git
npm run prepare      # Install Git hooks
```

### Pre-commit Hooks

The project uses Husky for Git hooks:

1. **Pre-commit**: Runs OxLint and TypeScript check (the full unit suite runs in CI, not in the hook)
2. **Commit-msg**: Enforces conventional commits

### Workflow Steps

1. **Create a new branch**
```bash
git checkout -b feature/diagram-improvements
```

2. **Make changes and test locally**

3. **Run quality checks**
```bash
npm run lint
npm run type-check
npm test
```

4. **Commit with conventional format**
```bash
git commit -m "feat: add new diagram type support"
```

5. **Push and create PR**

## Component Architecture

### Component Organization

Components are organized by feature:

- **AI Components**: Handle AI integration
- **Editor Components**: Code editing functionality
- **Modal Components**: Overlay dialogs
- **Preview Components**: Diagram rendering
- **Visual Components**: Drag-and-drop editor
- **Shared Components**: Reusable UI elements

### Component Patterns

#### Functional Components with TypeScript

```typescript
interface ComponentProps {
  title: string;
  content: string;
  onSave: (content: string) => void;
  className?: string;
}

export function CodeEditor({
  title,
  content,
  onSave,
  className = ''
}: ComponentProps) {
  // Component logic

  return (
    <div className={className}>
      <h2>{title}</h2>
      <Editor
        value={content}
        onChange={handleContentChange}
        onMount={handleEditorMount}
      />
      <button onClick={() => onSave(content)}>
        Save
      </button>
    </div>
  );
}
```

#### Component Composition

```typescript
// Parent component
export function WorkspacePanel() {
  return (
    <div className="workspace">
      <TabBar />
      <SplitView>
        <CodeEditor />
        <PreviewPanel />
      </SplitView>
    </div>
  );
}
```

### State Management

The application uses React hooks for state management:

#### useTheme Hook

```typescript
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }, [theme]);

  return { theme, toggleTheme };
}
```

#### useTabs Hook

```typescript
export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openDiagram = useCallback((content: string) => {
    const newTab: Tab = {
      id: generateId(),
      title: 'Untitled Diagram',
      content,
      type: detectDiagramType(content),
      saved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  return { tabs, activeTabId, openDiagram /* ... other methods */ };
}
```

## AI Integration

### AI Service Architecture

The only active AI backend is **in-browser WebGPU/MLC** — no cloud calls, no
API keys. `src/services/ai/providers.ts` is a provider-agnostic entrypoint that
re-exports the WebGPU MLC path (`src/services/ai/WebGPUMLCProvider.ts`, which
dynamically imports the vendored `@mlc-ai/web-llm` tarball):

```typescript
// src/services/ai/providers.ts
export interface MachineOption {
  /* machine size: 'low' | 'high' */
}

export function getMachineOptions(): MachineOption[];          // selectable model sizes

export async function callAI(
  machineSize: 'low' | 'high',
  messages: ChatMessage[],
  onProgress?: (progress: string) => void
): Promise<AsyncIterable<string>>;                             // streaming inference

export async function testConnection(machineSize: 'low' | 'high'): Promise<boolean>;
```

Inference runs on the user's GPU via WebGPU, which requires cross-origin
isolation (`COOP`/`COEP` headers are set by `vite.config.ts` and
`vercel.json`).

### Adding AI Capabilities

All AI features (generate, fix, improve) go through `callAI` with a shared
system prompt (`src/components/ai/mermaidSystemPrompt.ts`) and the
RAG-style retrieval helper `src/services/ai/MermaidRAGService.ts`. Do not add
per-provider `generateDiagram`/`fixDiagram` methods — older docs describing an
`AIProvider` interface with OpenAI/Anthropic/Google providers are historical;
those SDKs are not wired into the current code.

### Using AI in Components

`src/components/ai/AIPanel.tsx` hosts the chat UI and drives `callAI` with the
selected machine size (`low`/`high` configured in `AISettingsModal.tsx`),
streaming tokens into the message list and applying suggestions to the active
diagram tab.

## Testing

### Testing Setup

- **Vitest** - Modern testing framework
- **jsdom** - DOM environment for testing
- **React Testing Library** - Testing utilities

### Writing Tests

#### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CodeEditor } from './CodeEditor';

describe('CodeEditor', () => {
  it('renders editor with initial content', () => {
    const mockContent = 'flowchart TD\n    A --> B';

    render(
      <CodeEditor
        content={mockContent}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox')).toHaveValue(mockContent);
  });

  it('calls onChange when content changes', () => {
    const mockOnChange = vi.fn();
    const mockContent = 'flowchart TD\n    A --> B';

    render(
      <CodeEditor
        content={mockContent}
        onChange={mockOnChange}
      />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'new content' }
    });

    expect(mockOnChange).toHaveBeenCalledWith('new content');
  });
});
```

#### Hook Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  it('toggles theme correctly', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });
});
```

#### Service Test Example

```typescript
import { saveDiagram, getDiagrams } from './database';
import { Diagram } from '../types';

describe('Storage Service', () => {
  beforeEach(() => {
    // Storage tests run against fake-indexeddb; reset persisted state
    localStorage.clear();
  });

  it('saves diagram to IndexedDB', async () => {
    const mockDiagram: Diagram = {
      id: 'test-id',
      title: 'Test Diagram',
      content: 'flowchart TD\n    A --> B',
      type: 'flowchart',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await saveDiagram(mockDiagram);

    expect(result).toBe(true);
  });

  it('retrieves saved diagrams', async () => {
    // Save a diagram first
    const mockDiagram: Diagram = {
      id: 'test-id',
      title: 'Test Diagram',
      content: 'flowchart TD\n    A --> B',
      type: 'flowchart',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await saveDiagram(mockDiagram);

    const diagrams = await getDiagrams();

    expect(diagrams).toHaveLength(1);
    expect(diagrams[0].title).toBe('Test Diagram');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- CodeEditor.test.ts

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Building and Deployment

### Production Build

```bash
# Build the application
npm run build

# The build output is in:
# - dist/ - Production assets
# - dist/assets - Static files
```

### Environment Variables

The app needs **no API keys** (AI runs in-browser via WebGPU). Optional settings
in `.env.local`:

```env
# Configuration (optional)
VITE_DEFAULT_THEME=dark
VITE_DEFAULT_LANGUAGE=en

# Development
VITE_DEV_SERVER_PORT=5173
```

### Deployment Options

#### Vercel (Primary)

1. Connect GitHub repository
2. Deploy on push to main

The committed `vercel.json` sets `cleanUrls`, apex→www redirects, cache-control
headers, and the `COOP`/`COEP` cross-origin-isolation headers required by
WebGPU.

#### Docker

```dockerfile
# Multi-stage build (docker/Dockerfile)
FROM node:24.22.2-alpine AS builder
# ... build steps (pnpm) ...

FROM nginx:alpine
# serves the built dist/ via docker/nginx.conf
```

The CI pipeline builds and pushes this image to GitHub Container Registry
(ghcr.io) for linux/amd64 + linux/arm64 on every push to main.

#### GitHub Pages

The `docs` job in `.github/workflows/ci.yml` uploads `docs/` and deploys it to
GitHub Pages on push to main (no manual deploy script).

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Define types for all function parameters and return values
- Use interface for object shapes, type for unions
- Enable noImplicitAny and strictNullChecks

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// Avoid
function getUser(id) {
  // Implementation
}
```

### React Patterns

- Use functional components with hooks
- Prefer useCallback for functions passed to props
- Use useMemo for expensive calculations
- Follow the Rules of Hooks

```typescript
// Good
export function MyComponent({ data }: { data: DataType[] }) {
  const processedData = useMemo(() => {
    return data.map(item => transformItem(item));
  }, [data]);

  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
}

// Avoid
export function MyComponent({ data }) {
  const processedData = data.map(item => transformItem(item));
  const handleClick = () => {
    // Handle click with no dependencies
  };

  return <div onClick={handleClick}>{processedData}</div>;
}
```

### CSS/Style Guidelines

- Use Tailwind CSS classes
- No CSS modules or styled-components
- Utility-first approach
- Responsive design with mobile-first

```tsx
// Good
<div className="p-4 bg-gray-100 rounded-lg">
  <h2 className="text-xl font-semibold mb-2">Title</h2>
  <p className="text-gray-700">Content</p>
</div>

// Avoid
<div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Title</h2>
  <p style={{ color: '#374151' }}>Content</p>
</div>
```

### Naming Conventions

- Components: PascalCase (e.g., `CodeEditor`)
- Hooks: camelCase with 'use' prefix (e.g., `useTheme`)
- Files: PascalCase for components (e.g., `CodeEditor.tsx`), camelCase for utilities and hooks
- Interfaces: PascalCase (e.g., `ComponentProps`)
- Types: PascalCase (e.g., `DiagramType`)

### Error Handling

```typescript
// Good
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  showToast('Operation failed', 'error');
  throw error;
}

// Avoid
try {
  const result = await riskyOperation();
} catch (error) {
  // Silent failure
}
```

## Contributing

### Development Guidelines

1. **Follow the code style** (OxLint + Prettier enforced)
2. **Write tests** for new features
3. **Update documentation** when adding features
4. **Use conventional commits**:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation
   - `style`: Code style
   - `refactor`: Code refactoring
   - `test`: Test changes
   - `chore`: Build process or auxiliary tool changes

### Pull Request Process

1. Create feature branch from `main`
2. Make changes and commit with conventional format
3. Run all quality checks
4. Create pull request with clear description
5. Address any feedback
6. Merge after CI passes

### Issue Reporting

When reporting issues:

1. Use the issue template
2. Provide reproduction steps
3. Include browser version
4. Attach screenshots if helpful
5. Check for existing issues first

### Feature Requests

For feature requests:

1. Check existing feature requests
2. Create new issue with clear description
3. Include use case examples
4. Note any edge cases
5. Willing to implement (optional)

## Performance Considerations

### Optimization Techniques

1. **Memoization**: Use useMemo and useCallback
2. **Code Splitting**: Dynamic imports for large components
3. **Virtual Scrolling**: For large lists
4. **Debouncing**: For expensive operations (e.g., rendering)
5. **Lazy Loading**: Images and components

### Monitoring

- Track render performance in DevTools
- Monitor bundle size
- Check memory usage
- Profile loading times

## Security

### XSS Protection

```typescript
// All SVG output is sanitized
import DOMPurify from 'dompurify';

const svg = DOMPurify.sanitize(rawSvg, {
  ALLOWED_TAGS: ['svg', 'g', 'text', 'path', 'rect', ...],
  ALLOWED_ATTR: ['id', 'class', 'd', 'fill', ...]
});
```

### Input Validation

```typescript
function validateDiagramContent(content: string): ValidationResult {
  if (!content || content.trim() === '') {
    return { valid: false, error: 'Content cannot be empty' };
  }

  // Additional validation
  if (content.length > 1000000) {
    return { valid: false, error: 'Content too large' };
  }

  return { valid: true };
}
```

### API Key Security

The current AI stack needs no API keys (in-browser WebGPU only). If you ever
re-introduce key-based providers:

- Store keys in localStorage (user-controlled)
- Never commit API keys to repository
- Clear storage on logout

## Debugging

### Common Issues

#### TypeScript Errors
- Check for missing type definitions
- Verify interface implementations
- Use `any` sparingly with proper justification

#### React Issues
- Check prop types and missing dependencies
- Verify hooks are called correctly
- Look for re-renders and performance issues

#### Mermaid Issues
- Check syntax compatibility
- Verify theme configuration
- Test with different diagram types

### Debug Tools

```bash
# Debug builds
npm run build -- --mode development

# Debug specific file
npx vite build --filter src/components/CodeEditor.tsx
```

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Mermaid Documentation](https://mermaid.js.org/)
- [Testing Library Documentation](https://testing-library.com/)

---

Happy coding! 🚀

*Updated: 2026-11-03*