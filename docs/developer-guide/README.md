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

- Node.js 18.0 or higher
- npm 8.0 or higher
- Git
- Modern web browser (for testing)

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/mermaid-studio.git
cd mermaid-studio
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
│   │   │   └── providers.ts      # AI provider implementations
│   │   └── storage/              # Storage services
│   │       └── database.ts       # LocalStorage management
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
npm run lint         # Run ESLint
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

1. **Pre-commit**: Runs ESLint, TypeScript check, and tests
2. **Pre-push**: Full test suite
3. **Commit-msg**: Enforces conventional commits

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

```typescript
// src/services/ai/providers.ts
interface AIProvider {
  name: string;
  generateDiagram: (prompt: string) => Promise<string>;
  fixDiagram: (code: string, error: string) => Promise<string>;
  improveDiagram: (code: string, instructions: string) => Promise<string>;
}

interface AIProviderConfig {
  provider: string;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}
```

### Creating AI Providers

```typescript
// OpenAI Provider
export class OpenAIProvider implements AIProvider {
  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
  }

  async generateDiagram(prompt: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: this.config.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7
    });

    return response.choices[0].message.content;
  }

  private getSystemPrompt(): string {
    return `
You are a diagram expert specializing in Mermaid syntax.

Given a description, generate clean, valid Mermaid diagram code.

Rules:
1. Use modern Mermaid syntax
2. Follow the specified diagram type
3. Include appropriate styling
4. Add comments for complex sections
5. Ensure all brackets are properly closed
`;
  }
}
```

### Using AI in Components

```typescript
export function AIPanel() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagram, setDiagram] = useState('');

  const generateDiagram = async () => {
    setLoading(true);
    try {
      const aiProvider = createAIProvider(getAIConfig());
      const result = await aiProvider.generateDiagram(prompt);
      setDiagram(result);
    } catch (error) {
      showToast('Failed to generate diagram', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your diagram..."
      />
      <button onClick={generateDiagram} disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
}
```

## Testing

### Testing Setup

- **Vitest** - Modern testing framework
- **jsdom** - DOM environment for testing
- **React Testing Library** - Testing utilities

### Writing Tests

#### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeEditor } from './CodeEditor';

describe('CodeEditor', () => {
  it('renders editor with initial content', () => {
    const mockContent = 'flowchart TD\n    A --> B';

    render(
      <CodeEditor
        content={mockContent}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByRole('textbox')).toHaveValue(mockContent);
  });

  it('calls onChange when content changes', () => {
    const mockOnChange = jest.fn();
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
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('saves diagram to localStorage', async () => {
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
    expect(localStorage.getItem('diagrams')).toBeDefined();
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

Create `.env.local` for development:

```env
# AI Configuration
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_AI_API_KEY=your_key_here

# Development
VITE_DEV_SERVER_PORT=5173

# Analytics (optional)
VITE_GOOGLE_ANALYTICS_ID=your_ga_id
```

### Deployment Options

#### Vercel (Recommended)

1. Connect GitHub repository
2. Set environment variables
3. Deploy on push to main

```json
// vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ]
}
```

#### Docker

```dockerfile
# Multi-stage build
FROM node:18-alpine AS deps
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

#### Static Hosting

```bash
# Build for static hosting
npm run build

# Deploy to GitHub Pages
npm run deploy:gh-pages
```

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
- Files: kebab-case (e.g., `code-editor.tsx`)
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

1. **Follow the code style** (ESLint + Prettier enforced)
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

- Store keys in localStorage (user-controlled)
- Never commit API keys to repository
- Use environment variables in production
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