# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The canonical package manager is **pnpm 10** (`pnpm-lock.yaml` is committed); `npm >= 10` is also accepted. Either works for the commands below.

```bash
# Development
npm run dev              # Start Vite dev server on port 5173
npm run build            # Production build (tsc type-check + vite build)
npm run build:analyze    # Build with rollup-plugin-visualizer (emits dist/stats.html)
npm run preview          # Preview production build locally
npm run benchmark        # Run scripts/benchmark.mjs

# Code Quality
npm run lint             # ESLint check (eslint src --max-warnings 999)
npm run lint:fix         # ESLint auto-fix
npm run type-check       # TypeScript type check (tsc --noEmit)
npm run format           # Prettier write on src/**/*.{ts,tsx}
npm run format:check     # Prettier check (CI gate)

# Testing
npm test                 # Unit tests (Vitest)
npm run test:ui          # Vitest UI mode
npm run test:coverage    # Coverage report (thresholds: lines 65 / fn 64 / branches 59 / stmt 62)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:headed  # Playwright headed mode
npm run test:e2e:debug   # Playwright debug mode
npm run test:e2e:report  # Show Playwright HTML report
npm run test:lighthouse  # Lighthouse CI (expects dev server on :5173)
npm run e2e:install      # Install Playwright browsers
npm run e2e:report       # Generate consolidated E2E report (scripts/generate-e2e-report.js)

# Documentation
npm run docs             # Generate documentation (scripts/generate-docs.cjs)
npm run docs:check       # Check documentation quality
npm run docs:test        # Test documentation (scripts/test-docs.cjs)
```

## Project Architecture

**MermaidStudio** is a React 19 + TypeScript Vite application for editing Mermaid diagrams. It runs **entirely client-side** — there is no backend. Diagrams, settings, and AI keys persist to IndexedDB / localStorage in the browser, and AI inference runs in-browser via WebGPU. Features include a code editor (CodeMirror 6), live preview (Mermaid.js), visual editor, and an AI assistant.

### Directory Structure

```
src/
├── components/          # React components organized by feature
│   ├── ai/             # AI panel, system prompt
│   ├── editor/         # CodeMirror editor, tabs, workspace
│   ├── modals/         # Modal dialogs (diagram, settings, tools)
│   ├── preview/        # Diagram preview and style panels
│   ├── visual/         # Drag-and-drop visual editor
│   ├── sidebar/        # File browser sidebar
│   └── shared/         # Reusable UI (Modal, Toast, ContextMenu)
├── lib/mermaid/        # Mermaid.js integration layer
├── services/
│   ├── ai/             # AI provider implementation (WebGPU/MLC only)
│   └── storage/        # IndexedDB database wrapper
├── hooks/
│   ├── ai/             # AI-specific hooks (useAIChat, useAISend, useAISettings)
│   └── app/            # App state hooks (useAppState, useModalState)
├── i18n/               # i18next translations (en, fr)
├── constants/          # Themes, templates, theme derivation
├── types/              # TypeScript type definitions
└── utils/              # Utility functions (logger, encryption, sanitization, validation)
```

### Path Aliases (tsconfig.app.json)

Use these imports instead of relative paths:
- `@/components/*` → `src/components/*`
- `@/lib/*` → `src/lib/*`
- `@/services/*` → `src/services/*`
- `@/types` → `src/types`
- `@/hooks` → `src/hooks`
- `@/constants` → `src/constants`
- `@/utils` → `src/utils`
- Feature shortcuts: `@/ai`, `@/editor`, `@/preview`, `@/sidebar`, `@/visual`

### Component Organization

Components are organized by **feature domain**, not by type. Each feature directory may contain:
- The main component file
- `__tests__/` directory for co-located tests
- Sub-components when appropriate

**Example**: `src/components/preview/PreviewPanel.tsx` has tests in `src/components/preview/__tests__/PreviewPanel.test.tsx`

### State Management Pattern

The app uses **custom hooks for state**, not a state library. State is composed in `App.tsx` and threaded down through `AppLayout` and `ModalProvider` via props. Key hooks:

- `useTabs` (`hooks/useTabs.ts`) - Multi-tab diagram management with active tab tracking
- `useTheme` (`hooks/useTheme.ts`) - Dark/light theme with persistence
- `useToast` (`hooks/useToast.ts`) - Toast notifications via Radix UI
- `useKeyboardShortcuts` (`hooks/useKeyboardShortcuts.ts`) - Global keyboard shortcuts
- `useModalManager` (`hooks/useModalManager.ts`) - Modal open/close state (mutual exclusion)
- `useAIChat` (`hooks/ai/useAIChat.ts`) - AI chat history and responses

App-level orchestration hooks live in `hooks/app/` (`useAppState`, `useModalState`, etc.). For complex state, prefer colocating new state in a focused hook under `src/hooks/` rather than expanding the `AppLayout`/`ModalProvider` prop lists.

### Mermaid Integration

The `src/lib/mermaid/` directory wraps Mermaid.js:
- **core.ts** - Mermaid initialization (`initMermaid`), render function (`renderDiagram`), theme application, diagram type detection (`detectDiagramType`). Module-level singletons (`currentTheme`, `currentMermaidTheme`, `defaultTheme`, `diagramTheme`) hold theme state.
- **language.ts** - Language extensions for custom diagram syntax
- **codeUtils.ts** - Diagram type detection, code extraction helpers
- **autocomplete.ts** - CodeMirror autocomplete for Mermaid syntax

**Important**: All SVG output is sanitized via DOMPurify (`src/utils/sanitization.ts`: `sanitizeMermaidSVG` / `sanitizeSVG`) before rendering to prevent XSS. Note: there is a known `foreignObject` sanitization-bypass edge case tracked in `.planning/codebase/CONCERNS.md`.

### AI Provider Architecture

**The only active AI provider is in-browser WebGPU/MLC** (`src/services/ai/WebGPUMLCProvider.ts`), which dynamically imports `@mlc-ai/web-llm` and runs LLM inference locally on the user's GPU. There is no server-side AI and no cloud/local API calls in current code.

- `providers.ts` - Provider-agnostic entrypoint; re-exports only the WebGPU MLC path. Exposes `callAI(machineSize, messages, onProgress)`, `testConnection(machineSize)`, and `getMachineOptions()`. Machine sizes are `low` / `high`.
- `WebGPUMLCProvider.ts` - WebGPU support detection, model load/unload, streaming `generate()`.
- `MermaidRAGService.ts` - RAG-style retrieval assistance for diagram generation.
- System prompt: `src/components/ai/mermaidSystemPrompt.ts`.

> **Drift note:** `.env.example` and the legacy `VITE_OPENAI_*` / `VITE_ANTHROPIC_*` / `VITE_GOOGLE_AI_*` / `VITE_XAI_*` / `VITE_OLLAMA_*` / `VITE_LMSTUDIO_*` keys document cloud and local OpenAI-compatible providers, but **those providers are not wired into the current code**. Treat them as historical/aspirational, not active. `providers.ts` does not implement `generateDiagram`/`fixDiagram`/`improveDiagram` per-provider methods despite some older docs implying so — all AI goes through `callAI`.

WebGPU requires cross-origin isolation; `vite.config.ts` sets `COOP`/`COEP` headers and `@mlc-ai/web-llm` is pinned to a vendored tarball (`file:vendor/mlc-ai-web-llm-0.2.83.tgz`).

### Storage Layer

`src/services/storage/database.ts` is a hand-rolled **IndexedDB** wrapper (database `MermaidStudio`, single object store `data`). A single `DBData` record holds all collections (`folders`, `diagrams`, `versions`, `tags`, `diagramTags`, `settings`, `userTemplates`), mirrored in an in-memory `dataCache`. On every mutation the full record is re-serialized and written back.

- On first load, data is **migrated from localStorage** (key `mermaid_studio_v1`) into IndexedDB, plus a couple of legacy field migrations (e.g. `ai_provider` → `ai_machine_size`, plaintext API key re-encryption). This is NOT an indexed/versioned schema-migration system.
- Sensitive fields (e.g. AI keys) are obfuscated with AES-GCM via `src/utils/encryption.ts`. The encryption key is bundled in the client, so this is **obfuscation, not real protection**.
- Tests: `src/services/storage/__tests__/database.migration.test.ts` and `database.test.ts`. Storage tests use `fake-indexeddb` and should reset state in `beforeEach`.

### Testing Conventions

- **Unit tests**: Vitest + React Testing Library + jsdom (env config `tests/vitest.setup.ts`, uses `fake-indexeddb`, `vitest-canvas-mock`)
- **E2E tests**: Playwright (chromium + firefox + webkit), entry `tests/e2e/`
- **Lighthouse CI**: `lighthouserc.json`, run via `npm run test:lighthouse`
- Tests are co-located with components in `__tests__/` directories
- Test filenames: `[ComponentName].test.tsx` or `[hookName].test.ts`
- For storage tests, clear localStorage / reset IndexedDB in `beforeEach`

### Editor Configuration

- **CodeMirror 6** for the code editor with custom Mermaid language support
- One Dark theme for editor syntax highlighting
- Custom extensions in `src/lib/mermaid/` for autocomplete and syntax

### Styling

- **Tailwind CSS 4.x** via `@tailwindcss/postcss` (`postcss.config.js`)
- No CSS modules or styled-components
- Use Tailwind utility classes exclusively
- Dark/light themes via CSS variables and Tailwind's `dark:` prefix

### Git Workflow

- Husky pre-commit hooks (`prepare: husky install`) run lint, type-check, and tests
- Commitlint (`commitlint.config.cjs`) enforces conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Lint-staged runs ESLint + Prettier on staged `.ts` and `.tsx` files

### Build & Bundle

- Vite 8.x with manual chunk splitting in `vite.config.ts`
- Chunks: `react-vendor`, `mermaid-core`/`mermaid-elk`/`mermaid-parser`, `codemirror-core`/`codemirror-features`, `ai-transformers`, `ai-webgpu`, `lucide`, `i18n`, `dompurify`, `chart-libs`, `parsing-libs`, `vendor`
- Source maps disabled in production (`sourcemap: false`)
- `lucide-react` and `@huggingface/transformers` excluded from `optimizeDeps`; `ws`/`perf_hooks` stubbed via `ignore-modules` so server-only libs don't break the browser build
- `dist/` is the build output directory
- Optional local HTTPS certs under `.cert/` enable the HTTPS dev server (needed for some WebGPU features)

### Deployment

- **Primary**: Vercel (`vercel.json` cache-control headers, `@vercel/analytics`, `@vercel/speed-insights`)
- **Alternate**: Docker + nginx (`docker/Dockerfile`, `docker/docker-compose.yml`, `docker/nginx.conf`); image published to GHCR from CI on `main`
- **Docs**: GitHub Pages (via `.github/workflows/ci.yml`)
- PWA: service worker `public/sw.js` registered from `src/main.tsx` (prod only)

### ESLint Rules

Notable project-specific rules (`eslint.config.js`, flat config):
- `react-hooks/exhaustive-deps: off` - Dependencies disabled for flexibility
- `@typescript-eslint/no-unused-vars: off` - Unused vars allowed
- `no-console: off` - Console logging allowed (prefer the scoped `logger` from `src/utils/logger.ts`)
- `@typescript-eslint/no-explicit-any: off` - `any` type allowed

### Engine Requirements

- Node.js >= 24.0.0 (`.nvmrc`; CI also tests 20 and 22)
- pnpm 10 (canonical) or npm >= 10.0.0

### Key Dependencies

| Package | Purpose |
|---------|---------|
| React 19.2.5 | UI framework |
| Mermaid ^11.15.0 | Diagram rendering (+ `@mermaid-js/layout-elk`) |
| CodeMirror 6 | Code editor |
| @mlc-ai/web-llm | In-browser LLM via WebGPU (vendored tarball) |
| @huggingface/transformers | ONNX/transformers runtime for AI features |
| Radix UI | Headless UI components (context-menu, toast) |
| Lucide React | Icon library |
| DOMPurify | XSS sanitization of SVG output |
| i18next + react-i18next | Internationalization (en, fr) |
| Vitest 4 | Unit testing |
| Playwright 1.59 | E2E testing |
| Tailwind CSS 4 | Styling |
