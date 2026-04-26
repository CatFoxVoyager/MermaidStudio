# AI Fix Diagram Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-powered "Fix Diagram" feature that detects and fixes syntax, semantic, and style issues in Mermaid diagrams via the AI Panel.

**Architecture:** Enhanced AI Panel with new "fix mode" that uses a specialized system prompt to perform 3-pass analysis (syntax → semantic → style) and returns fixes with explanations in a chat-based interface.

**Tech Stack:** React 19, TypeScript, existing AI provider infrastructure (OpenAI/Claude/Gemini/Ollama), CodeMirror 6, Vitest, Playwright

---

## Task 1: Add Fix Mode State to AIPanel

**Files:**
- Modify: `src/components/ai/AIPanel.tsx:176-189`
- Test: `src/components/ai/__tests__/AIPanel.fixMode.test.tsx`

**Step 1: Write failing test for fix mode state**

Create `src/components/ai/__tests__/AIPanel.fixMode.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIPanel } from '../AIPanel';

describe('AIPanel Fix Mode', () => {
  const mockProps = {
    currentContent: 'flowchart TD\n  A --> B',
    onApply: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  it('should render fix mode when fixMode prop is true', () => {
    render(<AIPanel {...mockProps} fixMode={true} onEnterFixMode={vi.fn()} />);
    // Should hide suggestions in fix mode
    expect(screen.queryByText(mockProps.currentContent)).not.toBeInTheDocument();
  });

  it('should show loading state with "Analyzing diagram..." when fix mode is active', () => {
    render(<AIPanel {...mockProps} fixMode={true} onEnterFixMode={vi.fn()} />);
    // Loading text should appear
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /d/code/MermaidStudio && npm test -- AIPanel.fixMode.test.tsx
```

Expected: FAIL - "fixMode" prop doesn't exist yet

**Step 3: Add fixMode props and state to AIPanel**

Modify `src/components/ai/AIPanel.tsx` interface (around line 10-16):

```tsx
interface Props {
  currentContent: string;
  onApply: (content: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  settingsKey?: number;
  fixMode?: boolean;           // ADD THIS
  onEnterFixMode?: () => void; // ADD THIS
}
```

**Step 4: Use fix mode to hide suggestions**

In `AIPanel` function body (around line 176), add:

```tsx
export function AIPanel({ currentContent, onApply, onClose, onOpenSettings, settingsKey, fixMode, onEnterFixMode }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  // ... existing hooks ...

  // Hide suggestions when in fix mode
  const shouldShowSuggestions = messages.length === 0 && !fixMode;

  // ... existing code ...
```

**Step 5: Update suggestions rendering**

Find the suggestions rendering section (around line 291-303) and update condition:

```tsx
      {shouldShowSuggestions && (
        <div className="px-3 pb-2 shrink-0 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="px-2.5 py-1 rounded-full text-[11px] border transition-all duration-150"
              style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
              {s}
            </button>
          ))}
        </div>
      )}
```

**Step 6: Run test to verify it passes**

```bash
cd /d/code/MermaidStudio && npm test -- AIPanel.fixMode.test.tsx
```

Expected: PASS

**Step 7: Commit**

```bash
cd /d/code/MermaidStudio && git add src/components/ai/AIPanel.tsx src/components/ai/__tests__/AIPanel.fixMode.test.tsx
git commit -m "feat: add fix mode state to AIPanel

- Add fixMode and onEnterFixMode props
- Hide suggestions when in fix mode
- Add unit tests for fix mode behavior
"
```

---

## Task 2: Create buildFixSystemPrompt Function

**Files:**
- Modify: `src/components/ai/mermaidSystemPrompt.ts:1-143`
- Test: `src/components/ai/__tests__/mermaidSystemPrompt.fix.test.ts`

**Step 1: Write failing test for fix prompt**

Create `src/components/ai/__tests__/mermaidSystemPrompt.fix.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildFixSystemPrompt } from '../mermaidSystemPrompt';

describe('buildFixSystemPrompt', () => {
  it('should include current diagram code in the prompt', () => {
    const context = {
      currentContent: 'flowchart TD\n  A --> B\n  C[missing]',
      hasDiagram: true,
      diagramType: 'flowchart',
    };
    const prompt = buildFixSystemPrompt(context);
    expect(prompt).toContain('flowchart TD');
    expect(prompt).toContain('A --> B');
  });

  it('should include 3-pass analysis instructions', () => {
    const context = {
      currentContent: 'flowchart TD\n  A --> B',
      hasDiagram: true,
      diagramType: 'flowchart',
    };
    const prompt = buildFixSystemPrompt(context);
    expect(prompt).toContain('syntax');
    expect(prompt).toContain('semantic');
    expect(prompt).toContain('style');
  });

  it('should request explanation + code block format', () => {
    const prompt = buildFixSystemPrompt({
      currentContent: 'broken diagram',
      hasDiagram: true,
    });
    expect(prompt).toContain('explanation');
    expect(prompt).toContain('mermaid');
  });

  it('should handle empty diagrams', () => {
    const prompt = buildFixSystemPrompt({
      currentContent: '',
      hasDiagram: false,
    });
    expect(prompt).toContain('create');
    expect(prompt.length).toBeGreaterThan(100);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /d/code/MermaidStudio && npm test -- mermaidSystemPrompt.fix.test.ts
```

Expected: FAIL - `buildFixSystemPrompt` doesn't exist

**Step 3: Implement buildFixSystemPrompt function**

Add to `src/components/ai/mermaidSystemPrompt.ts` (after `buildSystemPrompt` function, around line 143):

```ts
export interface FixDiagramContext {
  currentContent: string;
  hasDiagram: boolean;
  diagramType?: string;
}

export function buildFixSystemPrompt(context: FixDiagramContext): string {
  const { currentContent, hasDiagram, diagramType } = context;

  const basePrompt = `# Mermaid.js Diagram Fixer

You are an expert Mermaid.js diagnostic and repair assistant. Your job is to analyze diagrams for issues and provide corrected versions.

## YOUR TASK - 3-PASS ANALYSIS

When given a diagram, perform these three analysis passes:

### Pass 1: Syntax Analysis
- Check for unclosed brackets, braces, parentheses
- Validate diagram type keywords (flowchart, sequenceDiagram, etc.)
- Check for malformed lines or invalid characters
- Verify quote matching and escaping

### Pass 2: Semantic Analysis
- Identify orphaned nodes (nodes with no connections)
- Find disconnected subgraphs
- Detect invalid edge syntax or references to non-existent nodes
- Check for missing required attributes

### Pass 3: Style Analysis
- Note inconsistent naming conventions (camelCase vs snake_case)
- Identify unclear or missing node labels
- Suggest layout improvements (curved vs straight lines)
- Recommend theming or styling enhancements

## YOUR RESPONSE FORMAT

CRITICAL: Follow this exact format:

1. **First**, provide a clear explanation in plain text of what you found and what you fixed. Be specific:
   - "Found 2 syntax errors: unclosed bracket on line 3, invalid keyword on line 5"
   - "Fixed 1 semantic issue: node C was orphaned, connected to main flow"
   - "Improved style: standardized node labels to TitleCase"

2. **Second**, provide the complete fixed code in a mermaid code block:
\`\`\`mermaid
[ONLY valid Mermaid code here - complete diagram]
\`\`\`

## SPECIAL CASES

**No issues found:**
If the diagram is already valid, respond with:
"This diagram looks great! No syntax, semantic, or style issues detected."

**Critical errors only:**
If you find syntax errors that prevent rendering, focus on those first. Explain: "Found critical syntax errors that must be fixed before semantic/style analysis."

**Partial fixes:**
If you can fix some issues but not all, explain what you fixed and what remains: "Fixed syntax errors, but semantic issue requires user input on..."

## CURRENT DIAGRAM CONTEXT
${hasDiagram ? `The user has this ${diagramType || 'diagram'}:

\`\`\`mermaid
${currentContent}
\`\`\`

Analyze this diagram for syntax, semantic, and style issues. Then provide the fixed version.` : 'No diagram exists yet. The user may be asking for help creating a new diagram from scratch.'}

## Remember
- Be thorough but concise in your explanation
- Always provide complete, working code
- If unsure about an issue, explain your uncertainty
- Prioritize syntax fixes over style suggestions`;

  return basePrompt;
}
```

**Step 4: Run test to verify it passes**

```bash
cd /d/code/MermaidStudio && npm test -- mermaidSystemPrompt.fix.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
cd /d/code/MermaidStudio && git add src/components/ai/mermaidSystemPrompt.ts src/components/ai/__tests__/mermaidSystemPrompt.fix.test.ts
git commit -m "feat: add buildFixSystemPrompt for diagram analysis

- Add 3-pass analysis: syntax, semantic, style
- Structured response format with explanation + code
- Handle special cases: no issues, critical errors, partial fixes
- Add unit tests for prompt generation
"
```

---

## Task 3: Add sendFixRequest to useAISend Hook

**Files:**
- Modify: `src/hooks/ai/useAISend.ts:1-148`
- Test: `src/hooks/ai/__tests__/useAISend.fix.test.ts`

**Step 1: Write failing test for sendFixRequest**

Create `src/hooks/ai/__tests__/useAISend.fix.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAISend } from '../useAISend';

// Mock dependencies
vi.mock('@/services/storage/database', () => ({
  getSettings: vi.fn(() => Promise.resolve({
    ai_provider: 'openai',
    ai_api_key: 'test-key',
    ai_base_url: 'https://api.test.com',
    ai_model: 'gpt-test',
  })),
}));

vi.mock('@/services/ai/providers', () => ({
  callAI: vi.fn(() => Promise.resolve('Fixed explanation\\n\\n```mermaid\\nflowchart TD\\n  A --> B\\n```')),
}));

describe('useAISend - Fix Mode', () => {
  const mockAddMessage = vi.fn();
  const mockMessages = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send fix request with correct system prompt', async () => {
    const { result } = renderHook(() => useAISend({
      currentContent: 'flowchart TD\n  A[broken',
      messages: mockMessages,
      addMessage: mockAddMessage,
      isConfigured: true,
    }));

    // Note: We'll need to export sendFixRequest from useAISend
    // For now, this test structure prepares for that
    expect(result.current.loading).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /d/code/MermaidStudio && npm test -- useAISend.fix.test.ts
```

Expected: FAIL - `sendFixRequest` function doesn't exist

**Step 3: Add sendFixRequest function to useAISend**

Modify `src/hooks/ai/useAISend.ts` - add after the `send` function (around line 147):

```ts
export interface UseAISendResult {
  send: (text: string, t: (key: string, params?: unknown) => string) => Promise<void>;
  sendFixRequest: (t: (key: string, params?: unknown) => string) => Promise<void>; // ADD THIS
  loading: boolean;
}
```

Now add the `sendFixRequest` implementation before the return statement:

```ts
  const sendFixRequest = useCallback(async (t: (key: string, params?: unknown) => string) => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const currentSettings = await getSettings();

      if (isConfigured) {
        const hasDiagram = currentContent.trim().length > 0;
        const diagramType = detectDiagramTypeFromContent(currentContent);

        // Use the fix-specific system prompt
        const { buildFixSystemPrompt } = await import('@/components/ai/mermaidSystemPrompt');
        const systemPrompt = buildFixSystemPrompt({
          currentContent,
          hasDiagram,
          diagramType,
        });

        // Build fix request message
        const allMessages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: 'Please analyze this diagram for syntax, semantic, and style issues. Provide the fixed version.' },
        ];

        log.debug('Sending fix request', {
          provider: currentSettings.ai_provider ?? 'openai',
          model: currentSettings.ai_model ?? 'default',
          hasDiagram,
          diagramType,
        });

        const reply = await callAI({
          provider: currentSettings.ai_provider ?? 'openai',
          apiKey: currentSettings.ai_api_key ?? '',
          baseUrl: currentSettings.ai_base_url ?? '',
          model: currentSettings.ai_model ?? '',
        }, allMessages);

        log.debug('Received fix response', {
          replyLength: reply?.length ?? 0,
          replyPreview: reply?.substring(0, 100),
        });

        // Handle response
        if (!reply || reply.trim().length === 0) {
          log.warn('Empty fix response');
          addMessage('assistant', t('ai.errorPrefix', { msg: 'Empty response from AI provider. Please check your settings.' }));
        } else if (reply.includes('No issues found') || reply.includes('looks great')) {
          // No issues found - positive message
          addMessage('assistant', reply);
        } else if (reply.includes('error') || reply.includes('Error:')) {
          // Error in response
          log.warn('Error in fix response:', reply);
          addMessage('assistant', t('ai.errorPrefix', { msg: reply }));
        } else {
          // Valid response with fixes
          addMessage('assistant', reply);
        }
      } else {
        // Not configured
        addMessage('assistant', `To use the Fix Diagram feature, please configure your AI provider first.\n\n${t('ai.configureProvider')}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log.error('Fix request error:', e);
      const safeMsg = msg.replace(/api[_-]?key[^=]*=\s*\S+/gi, '[REDACTED]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');
      addMessage('assistant', t('ai.errorPrefix', { msg: safeMsg }));
    } finally {
      setLoading(false);
    }
  }, [currentContent, addMessage, isConfigured, loading]);
```

Update the return statement to include `sendFixRequest`:

```ts
  return { send, sendFixRequest, loading };
```

**Step 4: Update UseAISendParams and UseAISendResult interfaces**

Add the return type export (after line 52):

```ts
export interface UseAISendResult {
  send: (text: string, t: (key: string, params?: unknown) => string) => Promise<void>;
  sendFixRequest: (t: (key: string, params?: unknown) => string) => Promise<void>;
  loading: boolean;
}
```

**Step 5: Update test to use sendFixRequest**

Update `src/hooks/ai/__tests__/useAISend.fix.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAISend } from '../useAISend';

// Mock dependencies
const mockCallAI = vi.fn();
vi.mock('@/services/storage/database', () => ({
  getSettings: vi.fn(() => Promise.resolve({
    ai_provider: 'openai',
    ai_api_key: 'test-key',
    ai_base_url: 'https://api.test.com',
    ai_model: 'gpt-test',
  })),
}));

vi.mock('@/services/ai/providers', () => ({
  callAI: vi.fn((...args: unknown[]) => mockCallAI(...args)),
}));

describe('useAISend - Fix Mode', () => {
  const mockAddMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallAI.mockResolvedValue('Found 1 syntax error.\\n\\n```mermaid\\nflowchart TD\\n  A --> B\\n```');
  });

  it('should send fix request and add response', async () => {
    const { result } = renderHook(() => useAISend({
      currentContent: 'flowchart TD\n  A[broken',
      messages: [],
      addMessage: mockAddMessage,
      isConfigured: true,
    }));

    await waitFor(async () => {
      await result.current.sendFixRequest((key) => key);
    });

    expect(mockCallAI).toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('syntax error'));
  });

  it('should handle "no issues found" response', async () => {
    mockCallAI.mockResolvedValue('This diagram looks great! No syntax, semantic, or style issues detected.');

    const { result } = renderHook(() => useAISend({
      currentContent: 'flowchart TD\n  A --> B',
      messages: [],
      addMessage: mockAddMessage,
      isConfigured: true,
    }));

    await waitFor(async () => {
      await result.current.sendFixRequest((key) => key);
    });

    expect(mockAddMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('looks great'));
  });

  it('should handle errors gracefully', async () => {
    mockCallAI.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useAISend({
      currentContent: 'broken',
      messages: [],
      addMessage: mockAddMessage,
      isConfigured: true,
    }));

    await waitFor(async () => {
      await result.current.sendFixRequest((key) => key);
    });

    expect(mockAddMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('errorPrefix'));
  });
});
```

**Step 6: Run test to verify it passes**

```bash
cd /d/code/MermaidStudio && npm test -- useAISend.fix.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
cd /d/code/MermaidStudio && git add src/hooks/ai/useAISend.ts src/hooks/ai/__tests__/useAISend.fix.test.ts
git commit -m "feat: add sendFixRequest to useAISend hook

- Add sendFixRequest function for diagram fixing
- Use buildFixSystemPrompt for 3-pass analysis
- Handle special responses: no issues, errors
- Sanitize error messages for security
- Add unit tests for fix request behavior
"
```

---

## Task 4: Wire Up Fix Diagram Button in EditorToolbar

**Files:**
- Modify: `src/components/editor/EditorToolbar.tsx` (locate exact line numbers with grep)
- Test: `src/components/editor/__tests__/EditorToolbar.fixButton.test.tsx`

**Step 1: Find EditorToolbar location**

```bash
cd /d/code/MermaidStudio && grep -n "export.*EditorToolbar" src/components/editor/*.tsx
```

Expected output shows file path and line number

**Step 2: Write failing test for Fix button**

Create `src/components/editor/__tests__/EditorToolbar.fixButton.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorToolbar } from '../EditorToolbar';

describe('EditorToolbar - Fix Diagram Button', () => {
  const mockProps = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onFormat: vi.fn(),
    onCopy: vi.fn(),
    onOpenAIPanel: vi.fn(),
    canUndo: true,
    canRedo: false,
    theme: 'dark' as const,
  };

  it('should render Fix Diagram button', () => {
    render(<EditorToolbar {...mockProps} />);
    const fixButton = screen.getByTestId('fix-diagram-button');
    expect(fixButton).toBeInTheDocument();
  });

  it('should call onOpenAIPanel with fix mode when clicked', () => {
    render(<EditorToolbar {...mockProps} />);
    const fixButton = screen.getByTestId('fix-diagram-button');
    fixButton.click();
    expect(mockProps.onOpenAIPanel).toHaveBeenCalledWith({ mode: 'fix' });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
cd /d/code/MermaidStudio && npm test -- EditorToolbar.fixButton.test.tsx
```

Expected: FAIL - button doesn't exist

**Step 4: Add Fix Diagram button to EditorToolbar**

Find the toolbar button section in EditorToolbar.tsx (look for existing buttons like Format, Copy). Add the new button:

```tsx
import { Wrench, Sparkles } from 'lucide-react'; // Add to existing imports

// In the toolbar buttons section, add:
<button
  data-testid="fix-diagram-button"
  onClick={() => onOpenAIPanel({ mode: 'fix' })}
  className="p-2 rounded-sm transition-colors hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
  style={{ color: 'var(--text-secondary)' }}
  title="Fix Diagram with AI"
>
  <Wrench size={14} />
  <Sparkles size={10} className="ml-[-2px] mt-[4px]" />
</button>
```

**Step 5: Update onOpenAIPanel prop type**

Update the EditorToolbar Props interface:

```tsx
interface Props {
  onUndo: () => void;
  onRedo: () => void;
  onFormat: () => void;
  onCopy: () => void;
  onOpenAIPanel: (options?: { mode?: 'chat' | 'fix' }) => void; // UPDATE THIS
  canUndo: boolean;
  canRedo: boolean;
  theme: 'light' | 'dark';
}
```

**Step 6: Run test to verify it passes**

```bash
cd /d/code/MermaidStudio && npm test -- EditorToolbar.fixButton.test.tsx
```

Expected: PASS

**Step 7: Commit**

```bash
cd /d/code/MermaidStudio && git add src/components/editor/EditorToolbar.tsx src/components/editor/__tests__/EditorToolbar.fixButton.test.tsx
git commit -m "feat: add Fix Diagram button to EditorToolbar

- Add Wrench+Sparkles icon button
- Call onOpenAIPanel with { mode: 'fix' }
- Update onOpenAIPanel prop type to accept mode option
- Add unit tests for Fix button
"
```

---

## Task 5: Connect Fix Mode to App State

**Files:**
- Modify: `src/App.tsx` (find with grep for AIPanel usage)
- No test changes (integration verified manually)

**Step 1: Find AIPanel usage in App.tsx**

```bash
cd /d/code/MermaidStudio && grep -n "AIPanel" src/App.tsx
```

**Step 2: Add fix mode state to App.tsx**

Find where AI panel state is managed (look for `aiPanelOpen` or similar). Add fix mode state:

```tsx
const [aiFixMode, setAiFixMode] = useState(false);

// Add handler for opening AI panel with mode
const handleOpenAIPanel = useCallback((options?: { mode?: 'chat' | 'fix' }) => {
  setAiPanelOpen(true);
  if (options?.mode === 'fix') {
    setAiFixMode(true);
  } else {
    setAiFixMode(false);
  }
}, []);
```

**Step 3: Update AIPanel props**

Find the AIPanel component in App.tsx and update props:

```tsx
<AIPanel
  currentContent={activeTab?.code ?? ''}
  onApply={handleApplyAICode}
  onClose={handleCloseAIPanel}
  onOpenSettings={() => setSettingsModalOpen(true)}
  settingsKey={settingsKey}
  fixMode={aiFixMode}
  onEnterFixMode={() => setAiFixMode(true)}
/>
```

**Step 4: Update EditorToolbar onOpenAIPanel prop**

Find EditorToolbar in App.tsx and update:

```tsx
<EditorToolbar
  // ... existing props ...
  onOpenAIPanel={handleOpenAIPanel}
/>
```

**Step 5: Reset fix mode when closing panel**

Update `handleCloseAIPanel`:

```tsx
const handleCloseAIPanel = useCallback(() => {
  setAiPanelOpen(false);
  setAiFixMode(false);
}, []);
```

**Step 6: Manual test the flow**

```bash
cd /d/code/MermaidStudio && npm run dev
```

Test:
1. Open app
2. Click Fix Diagram button
3. Verify AIPanel opens in fix mode (no suggestions)
4. Send a fix request
5. Verify response appears

**Step 7: Commit**

```bash
cd /d/code/MermaidStudio && git add src/App.tsx
git commit -m "feat: connect fix mode to app state

- Add aiFixMode state
- Add handleOpenAIPanel with mode option
- Update AIPanel and EditorToolbar props
- Reset fix mode when closing panel
"
```

---

## Task 6: Update AIPanel to Use sendFixRequest

**Files:**
- Modify: `src/components/ai/AIPanel.tsx:176-202`
- Test: `src/components/ai/__tests__/AIPanel.fixMode.test.tsx` (extend)

**Step 1: Extend test for fix request trigger**

Update `src/components/ai/__tests__/AIPanel.fixMode.test.tsx`:

```tsx
it('should trigger fix request when fix mode is active', async () => {
  const mockSendFixRequest = vi.fn();
  // Mock the hook to return our mock function

  render(<AIPanel {...mockProps} fixMode={true} onEnterFixMode={vi.fn()} />);

  // In fix mode, should trigger sendFixRequest on mount
  await waitFor(() => {
    expect(mockSendFixRequest).toHaveBeenCalled();
  });
});
```

**Step 2: Update AIPanel to use sendFixRequest**

In `src/components/ai/AIPanel.tsx`, update the hook usage and add fix request trigger:

```tsx
export function AIPanel({ currentContent, onApply, onClose, onOpenSettings, settingsKey, fixMode, onEnterFixMode }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  // Use extracted hooks for all logic
  const { messages, addMessage, resetChat, bottomRef } = useAIChat();
  const { provider, isConfigured, preset } = useAISettings(settingsKey);
  const { send, sendFixRequest, loading } = useAISend({
    currentContent,
    messages,
    addMessage,
    isConfigured,
  });

  // Trigger fix request when entering fix mode
  useEffect(() => {
    if (fixMode && isConfigured && messages.length === 0) {
      sendFixRequest(t);
    }
  }, [fixMode, isConfigured]);

  const shouldShowSuggestions = messages.length === 0 && !fixMode;

  // ... rest of component ...
```

**Step 3: Update loading message for fix mode**

Find the loading indicator and update for fix mode:

```tsx
{loading && fixMode && (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-floating)' }}>
    <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)' }} />
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Analyzing diagram...</span>
  </div>
)}
{loading && !fixMode && (
  // existing loading dots
)}
```

**Step 4: Run tests**

```bash
cd /d/code/MermaidStudio && npm test -- AIPanel.fixMode.test.tsx
```

Expected: PASS

**Step 5: Manual test**

```bash
cd /d/code/MermaidStudio && npm run dev
```

Test:
1. Click Fix Diagram button
2. Verify "Analyzing diagram..." loading message
3. Wait for AI response
4. Verify explanation + code block appears
5. Click Apply
6. Verify editor content updates

**Step 6: Commit**

```bash
cd /d/code/MermaidStudio && git add src/components/ai/AIPanel.tsx src/components/ai/__tests__/AIPanel.fixMode.test.tsx
git commit -m "feat: integrate sendFixRequest in AIPanel

- Trigger fix request when fix mode is active
- Show \"Analyzing diagram...\" loading message
- Use sendFixRequest from useAISend hook
- Add useEffect to auto-trigger on fix mode enter
"
```

---

## Task 7: Add i18n Translations

**Files:**
- Modify: `src/i18n/en/index.ts` (or main English translation file)
- Modify: `src/i18n/fr/index.ts` (or main French translation file)

**Step 1: Find translation files**

```bash
cd /d/code/MermaidStudio && find src/i18n -name "*.ts" -type f
```

**Step 2: Add English translations**

Find the `ai` section in English translations and add:

```ts
ai: {
  // ... existing translations ...
  fixDiagram: 'Fix Diagram',
  fixDiagramTitle: 'AI Diagram Fix',
  fixDiagramButton: 'Fix with AI',
  analyzing: 'Analyzing diagram...',
  noIssuesFound: 'No issues found! Your diagram looks great.',
  fixErrorPrefix: 'Fix error: {{msg}}',
  openChatForHelp: 'Open chat for help',
}
```

**Step 3: Add French translations**

Find the `ai` section in French translations and add:

```ts
ai: {
  // ... existing translations ...
  fixDiagram: 'Réparer le diagramme',
  fixDiagramTitle: 'Réparation IA de diagramme',
  fixDiagramButton: 'Réparer avec IA',
  analyzing: 'Analyse du diagramme...',
  noIssuesFound: 'Aucun problème trouvé ! Votre diagramme est excellent.',
  fixErrorPrefix: 'Erreur de réparation : {{msg}}',
  openChatForHelp: 'Ouvrir le chat pour aider',
}
```

**Step 4: Update AIPanel to use new translations**

Replace hardcoded strings with `t()` calls:

```tsx
<button
  data-testid="fix-diagram-button"
  title={t('ai.fixDiagram')}
>
  {/* ... icon ... */}
</button>

{loading && fixMode && (
  <div>
    <span>{t('ai.analyzing')}</span>
  </div>
)}
```

**Step 5: Test translations**

```bash
cd /d/code/MermaidStudio && npm run dev
```

Switch between English and French in settings, verify all fix mode text is translated.

**Step 6: Commit**

```bash
cd /d/code/MermaidStudio && git add src/i18n/
git commit -m "feat: add i18n translations for fix diagram feature

- Add English translations for fix mode UI
- Add French translations for fix mode UI
- Update AIPanel to use translation keys
"
```

---

## Task 8: Add E2E Tests

**Files:**
- Create: `tests/e2e/ai-fix-diagram.spec.ts`

**Step 1: Write E2E tests**

Create `tests/e2e/ai-fix-diagram.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('AI Fix Diagram', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Configure mock AI provider for testing
    await page.evaluate(() => {
      localStorage.setItem('ai_provider', 'ollama');
      localStorage.setItem('ai_model', 'test-model');
    });
  });

  test('should show Fix Diagram button in toolbar', async ({ page }) => {
    const fixButton = page.getByTestId('fix-diagram-button');
    await expect(fixButton).toBeVisible();
  });

  test('should open AI panel in fix mode when Fix button clicked', async ({ page }) => {
    await page.getByTestId('fix-diagram-button').click();

    // AI Panel should be open
    const aiPanel = page.getByTestId('ai-panel');
    await expect(aiPanel).toBeVisible();

    // Should show loading state
    await expect(page.getByText(/analyzing/i)).toBeVisible();
  });

  test('should show explanation and code block after fix completes', async ({ page }) => {
    // Mock AI response
    await page.route('**/api/chat/completions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: 'Found 1 syntax error: unclosed bracket.\\n\\n```mermaid\\nflowchart TD\\n  A --> B\\n```'
            }
          }]
        }),
      });
    });

    await page.getByTestId('fix-diagram-button').click();

    // Wait for response
    await expect(page.getByText(/syntax error/i)).toBeVisible();

    // Should have code block with Apply button
    const applyButton = page.getByTestId('apply-ai');
    await expect(applyButton).toBeVisible();
  });

  test('should apply fixed code to editor', async ({ page }) => {
    // Start with broken diagram
    const editor = page.locator('.cm-content').first();
    await editor.fill('flowchart TD\n  A[broken');

    // Mock AI response
    await page.route('**/api/chat/completions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: {
              content: 'Fixed!\\n\\n```mermaid\\nflowchart TD\\n  A[Fixed] --> B[End]\\n```'
            }
          }]
        }),
      });
    });

    await page.getByTestId('fix-diagram-button').click();
    await page.getByTestId('apply-ai').click();

    // Verify editor content updated
    await expect(editor).toContainText('A[Fixed]');
  });
});
```

**Step 2: Run E2E tests**

```bash
cd /d/code/MermaidStudio && npm run test:e2e
```

Expected: Tests may fail if API routes don't match (adjust as needed)

**Step 3: Commit**

```bash
cd /d/code/MermaidStudio && git add tests/e2e/ai-fix-diagram.spec.ts
git commit -m "test: add E2E tests for AI fix diagram feature

- Test Fix button visibility and click
- Test AI panel opens in fix mode
- Test explanation and code block display
- Test Apply button updates editor
"
```

---

## Task 9: Manual Testing Checklist

**Files:** None (manual verification)

**Step 1: Complete manual testing**

Run through this checklist:

```bash
cd /d/code/MermaidStudio && npm run dev
```

**Checklist:**
- [ ] Fix button appears in toolbar (wrench + sparkles icon)
- [ ] Hovering shows "Fix Diagram with AI" tooltip
- [ ] Clicking fix opens AIPanel
- [ ] "Analyzing diagram..." loading message appears
- [ ] AI response includes explanation
- [ ] AI response includes mermaid code block
- [ ] Apply button appears in code block header
- [ ] Clicking Apply updates editor content
- [ ] Preview updates with fixed diagram
- [ ] Undo (Ctrl+Z) restores original code
- [ ] Fix button works when diagram is already valid (shows "No issues found")
- [ ] Fix button shows config message when no API key set
- [ ] Fix mode resets when closing AIPanel
- [ ] Switching tabs maintains fix mode correctly

**Step 2: Test with different AI providers**

- [ ] OpenAI (GPT)
- [ ] Anthropic (Claude)
- [ ] Google (Gemini)
- [ ] Ollama (local)

**Step 3: Test error scenarios**

- [ ] Invalid Mermaid syntax
- [ ] Orphaned nodes
- [ ] Inconsistent naming
- [ ] Empty diagram
- [ ] Rate limit hit
- [ ] Network error

**Step 4: Test translations**

- [ ] Switch to French, verify all text is translated
- [ ] Switch back to English
- [ ] Verify RTL languages if supported

---

## Task 10: Documentation

**Files:**
- Modify: `README.md` (if user-facing features need docs)
- Modify: `CHANGELOG.md` (add entry for v0.5.0)

**Step 1: Update CHANGELOG**

Add to `CHANGELOG.md`:

```markdown
## [0.5.0] - 2026-04-XX

### Added
- **AI Fix Diagram** - Automatically detect and fix syntax, semantic, and style issues in Mermaid diagrams
- New "Fix Diagram" button in editor toolbar
- AI Panel now supports fix mode with 3-pass analysis (syntax → semantic → style)
- Enhanced error handling with fallback to chat mode
- i18n support for fix mode in English and French

### Changed
- AIPanel now accepts `fixMode` and `onEnterFixMode` props
- EditorToolbar `onOpenAIPanel` now accepts mode option
- useAISend hook exports `sendFixRequest` function
- mermaidSystemPrompt exports `buildFixSystemPrompt` function

### Fixed
- Improved AI error message sanitization for security
```

**Step 2: Update README (if applicable)**

Add to "Features" section:

```markdown
### AI-Powered Features
- **AI Fix Diagram** - Click the Fix button to automatically detect and repair syntax errors, semantic issues, and style problems
- **AI Chat** - Describe changes in plain English and let AI generate Mermaid code
- **Multi-Provider Support** - Works with OpenAI, Claude, Gemini, Ollama, and custom APIs
```

**Step 3: Commit**

```bash
cd /d/code/MermaidStudio && git add CHANGELOG.md README.md
git commit -m "docs: document AI Fix Diagram feature

- Add CHANGELOG entry for v0.5.0
- Update README with Fix Diagram feature description
"
```

---

## Final Steps

**Step 1: Run all tests**

```bash
cd /d/code/MermaidStudio && npm test && npm run test:e2e
```

**Step 2: Type check**

```bash
cd /d/code/MermaidStudio && npm run type-check
```

**Step 3: Lint**

```bash
cd /d/code/MermaidStudio && npm run lint
```

**Step 4: Build**

```bash
cd /d/code/MermaidStudio && npm run build
```

**Step 5: Final commit**

```bash
cd /d/code/MermaidStudio && git add .
git commit -m "chore: finalize AI Fix Diagram feature implementation

All tasks complete:
- Fix mode state in AIPanel
- buildFixSystemPrompt for 3-pass analysis
- sendFixRequest in useAISend hook
- Fix Diagram button in EditorToolbar
- App state integration
- i18n translations
- E2E tests
- Documentation updates

Ready for release v0.5.0
"
```

---

## Summary

**Total Estimated Time:** 3-4 days

**Commits:** 10 atomic commits following TDD and YAGNI principles

**Files Modified:**
- `src/components/ai/AIPanel.tsx`
- `src/components/ai/mermaidSystemPrompt.ts`
- `src/hooks/ai/useAISend.ts`
- `src/components/editor/EditorToolbar.tsx`
- `src/App.tsx`
- `src/i18n/en/index.ts` (or equivalent)
- `src/i18n/fr/index.ts` (or equivalent)

**Files Created:**
- `src/components/ai/__tests__/AIPanel.fixMode.test.tsx`
- `src/components/ai/__tests__/mermaidSystemPrompt.fix.test.ts`
- `src/hooks/ai/__tests__/useAISend.fix.test.ts`
- `src/components/editor/__tests__/EditorToolbar.fixButton.test.tsx`
- `tests/e2e/ai-fix-diagram.spec.ts`

**Key Design Decisions:**
1. Reuse existing AI Panel infrastructure (minimal code changes)
2. Manual trigger (button) not auto-detection (reduces API costs)
3. Chat-based response with Apply button (familiar UX pattern)
4. 3-pass analysis in single AI call (efficient)
5. Graceful fallbacks for all error scenarios
