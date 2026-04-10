# AI Fix Diagram Feature - Design Document

**Date:** 2026-04-10
**Status:** Approved
**Approach:** Enhanced AI Panel (Approach 1)

---

## Overview

Add a "Fix Diagram" feature to MermaidStudio that allows users to automatically detect and fix syntax errors, semantic issues, and style problems in their Mermaid diagrams using AI.

### Requirements

1. **Manual trigger** - User clicks "Fix Diagram" button in toolbar
2. **Chat-based response** - AI explains issues and provides fixed code in the AI Panel
3. **Comprehensive detection** - Syntax, semantic, and style issues
4. **One-click apply** - Single Apply button replaces editor content
5. **Graceful fallbacks** - Explain why, offer chat, show partial results

---

## User Flow

```
User edits diagram → Syntax error occurs → User clicks "Fix Diagram" button
                                                        ↓
                            AIPanel opens in "fix mode" (or switches if already open)
                                                        ↓
            AI performs 3-pass analysis: syntax → semantic → style
                                                        ↓
          Response shows: [Explanation] → [Code block with fixes] → [Apply button]
                                                        ↓
                            User clicks Apply → Code replaces editor content
                                                        ↓
                                    Preview updates with fixed diagram
```

---

## Architecture

### Component Structure

```
src/components/ai/
├── AIPanel.tsx (modify)     // Add "fix mode" state and button
├── mermaidSystemPrompt.ts (modify)  // Add buildFixSystemPrompt()
└── __tests__/
    └── AIPanel.fixMode.test.tsx (new)

src/hooks/ai/
├── useAISend.ts (modify)    // Add sendFixRequest() function
└── __tests__/
    └── useAISend.fix.test.ts (new)

src/components/editor/
└── EditorToolbar.tsx (modify)  // Add "Fix Diagram" button
```

### Key Changes

1. **`AIPanel.tsx`** - Add `fixMode: boolean` state. When true, hide suggestions, show loading state with "Analyzing diagram..." message, and use specialized system prompt.

2. **`mermaidSystemPrompt.ts`** - New `buildFixSystemPrompt()` function that:
   - Includes current diagram code
   - Instructs AI to perform syntax → semantic → style analysis
   - Requests response format: explanation + mermaid code block

3. **`useAISend.ts`** - New `sendFixRequest()` function that:
   - Builds fix-specific message: "Please analyze and fix this diagram"
   - Uses 3x max_tokens for comprehensive fixes
   - Handles fallback logic (explain → chat → partial)

4. **`EditorToolbar.tsx`** - Add button with icon (wrench/sparkles combo) that calls `onOpenAIPanel({ mode: 'fix' })`

---

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ EditorToolbar   │────▶│      App         │────▶│    AIPanel      │
│  "Fix" button   │     │ (onOpenAIPanel)  │     │  (fixMode=true) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │  useAISend    │
                                                  │sendFixRequest │
                                                  └───────┬───────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │callAI()       │
                                                  │(providers.ts) │
                                                  └───────┬───────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     Editor      │◀────│   AIPanel        │◀────│   AI Response   │
│ (content update)│     │  onApply(code)   │     │  + explanation  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| **No API key configured** | Show existing "Configure API key" warning in AIPanel |
| **AI returns empty response** | Fallback: "Couldn't analyze. Try rephrasing or check settings." |
| **AI returns invalid Mermaid** | Show warning dialog (existing validation) → allow "Apply anyway" |
| **Rate limit exceeded** | Show error message with retry countdown (existing rateLimiter) |
| **Diagram already valid** | AI responds: "No issues found! Your diagram looks great." |
| **Multiple tabs open** | Fix only applies to active tab (respects existing tab context) |
| **Undo after apply** | Uses existing editor undo stack (no special handling needed) |

**Fallback Flow (when fix fails):**
```
AI call fails
     ↓
Check: Is it syntax the AI can't handle?
     ↓ YES → Explain specific limitation
     ↓
     ↓ NO → Offer "Open chat" button for manual help
     ↓
Show partial fixes (if any code was returned)
```

---

## Testing Strategy

### Unit Tests
- `buildFixSystemPrompt()` - validates prompt structure and context injection
- `sendFixRequest()` - mocks API responses, tests error handling paths
- `AIPanel` fix mode - tests UI state changes, button rendering

### Integration Tests
- Fix button → AIPanel opens in fix mode
- AI response → Code block renders with Apply button
- Apply click → Editor content updates

### E2E Tests (Playwright)
1. Open broken diagram → Click Fix → Verify fixed code applies
2. Fix with no API key → Verify config message shows
3. Fix already-valid diagram → Verify "No issues" message
4. Fix during rate limit → Verify error message displays

### Manual Testing Checklist
- [ ] Fix button appears in toolbar
- [ ] Clicking fix opens AIPanel in correct mode
- [ ] AI detects syntax errors (unclosed bracket)
- [ ] AI detects semantic issues (orphaned node)
- [ ] AI detects style issues (inconsistent naming)
- [ ] Apply button replaces editor content
- [ ] Undo works after applying fix
- [ ] Rate limit shows appropriate message

---

## Implementation Plan

### Phase 1: Core Fix Mode (1-2 days)
- Add `fixMode` state to `AIPanel.tsx`
- Create `buildFixSystemPrompt()` in `mermaidSystemPrompt.ts`
- Add `sendFixRequest()` to `useAISend.ts`
- Wire up "Fix Diagram" button in `EditorToolbar.tsx`

### Phase 2: Response Handling (0.5 day)
- Ensure code block parsing works for fix responses
- Test Apply button functionality
- Add loading state ("Analyzing diagram...")

### Phase 3: Error Fallbacks (0.5 day)
- Implement "No issues found" handling
- Add "Open chat" fallback button
- Test partial fix scenarios

### Phase 4: Polish (0.5 day)
- Add unit tests
- Add E2E tests
- Update i18n translations

**Total: ~3-4 days**

---

## Success Metrics

1. **Reduced support burden** - Fewer users asking "why won't my diagram render?"
2. **Faster diagram creation** - Time from new diagram to working output decreases
3. **Learning tool** - Users understand Mermaid better by seeing fixes explained
4. **All equally important** - Multiple value propositions validated

---

## Open Questions

None - design is complete and approved.
