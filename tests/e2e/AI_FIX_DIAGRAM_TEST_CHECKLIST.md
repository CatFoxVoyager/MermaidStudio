# AI Fix Diagram - Manual Testing Checklist

**Date:** 2026-04-10
**Version:** v0.5.0 (in development)
**Tester:** _________________

## Prerequisites

- [ ] Node.js >= 24.0.0 installed
- [ ] npm >= 10.0.0 installed
- [ ] Project built: `npm run build`
- [ ] Dev server running: `npm run dev`
- [ ] At least one AI provider configured (OpenAI, Claude, Gemini, Ollama, etc.)

## Test Environment

- OS: Windows 11 Pro
- Browser: Chrome/Edge (latest)
- AI Provider: _________________
- Model: _________________

## Core Functionality Tests

### 1. Fix Button Visibility & Access

- [ ] **Fix button appears in toolbar**
  - Location: Editor toolbar (top of code editor)
  - Icon: Wrench + Sparkles
  - Visible when: A diagram tab is open

- [ ] **Hover tooltip shows "Fix Diagram"**
  - Hover over the button
  - Verify tooltip appears

- [ ] **Button is clickable**
  - Click the button
  - Verify no console errors

### 2. AI Panel Fix Mode

- [ ] **AI Panel opens in fix mode**
  - Click Fix button
  - Verify AI Panel slides in from right
  - Verify suggestions are hidden (no "Explain this diagram" buttons)

- [ ] **Loading indicator appears**
  - Verify "Analyzing diagram..." message appears
  - Verify animated pulse dot is visible
  - Verify loading state clears after AI responds

- [ ] **AI response includes explanation**
  - Wait for AI response
  - Verify text explanation appears
  - Verify explanation mentions issues found or "no issues"

### 3. Code Block & Apply

- [ ] **Code block appears in response**
  - Verify mermaid code block is formatted
  - Verify language indicator shows "mermaid"
  - Verify Apply button appears in code block header

- [ ] **Apply button works**
  - Click Apply button
  - Verify editor content updates
  - Verify preview updates with new diagram
- [ ] **Undo restores original**
  - Press Ctrl+Z after applying
  - Verify original code is restored

### 4. Valid Diagram Response

- [ ] **No issues found message**
  - Start with a valid diagram: `graph TD\n  A[Start] --> B[End]`
  - Click Fix button
  - Verify AI responds positively (e.g., "No issues found")

- [ ] **No code block for valid diagrams**
  - Verify no mermaid code block appears
  - Or verify code block shows same diagram

### 5. Error Scenarios

- [ ] **Invalid Mermaid syntax**
  - Test: `graph TD\n  A[broken` (missing closing bracket)
  - Verify AI detects and fixes syntax error

- [ ] **Orphaned nodes**
  - Test: `graph TD\n  A\n  B\n  C` (no connections)
  - Verify AI suggests connections

- [ ] **Inconsistent naming**
  - Test: `graph TD\n  A_Node --> B node` (mixed styles)
  - Verify AI normalizes naming

- [ ] **Empty diagram**
  - Test: Click Fix with empty editor
  - Verify AI asks for diagram content or suggests template

- [ ] **Network error**
  - Disconnect internet (for cloud providers)
  - Click Fix button
  - Verify error message appears
  - Verify error message is sanitized (no API keys)

- [ ] **Rate limit**
  - Send multiple fix requests quickly
  - Verify graceful handling

### 6. Configuration Scenarios

- [ ] **No API key configured**
  - Clear all AI provider settings
  - Click Fix button
  - Verify "API key required" message appears
  - Verify "Open settings" button works

- [ ] **Provider switch during fix mode**
  - Start fix with one provider
  - Switch to another provider
  - Verify fix mode resets or continues correctly

### 7. UI State Management

- [ ] **Fix mode resets on panel close**
  - Click Fix button
  - Close AI panel
  - Open AI panel normally (click AI button)
  - Verify suggestions appear (not in fix mode)

- [ ] **Switching tabs maintains fix mode**
  - Click Fix button
  - Switch to another tab
  - Switch back to original tab
  - Verify AI panel state is correct

### 8. Multiple AI Providers

**Test with each configured provider:**

#### OpenAI (GPT)
- [ ] Fix works with GPT-3.5
- [ ] Fix works with GPT-4
- [ ] Response format is correct

#### Anthropic (Claude)
- [ ] Fix works with Claude 3 Sonnet
- [ ] Fix works with Claude 3 Opus
- [ ] Response format is correct

#### Google (Gemini)
- [ ] Fix works with Gemini Pro
- [ ] Response format is correct

#### Ollama (Local)
- [ ] Fix works with local model
- [ ] Response format is correct
- [ ] No network required

### 9. Internationalization (i18n)

**English (en):**
- [ ] "Fix Diagram" tooltip
- [ ] "Analyzing diagram..." loading message
- [ ] "No issues found! Your diagram looks great."
- [ ] Error messages are in English

**French (fr):**
- [ ] Switch language to French
- [ ] Verify "Réparer le diagramme" tooltip
- [ ] Verify "Analyse du diagramme..." loading message
- [ ] Verify "Aucun problème trouvé ! Votre diagramme est excellent."
- [ ] Error messages are in French

### 10. Performance

- [ ] **Response time is acceptable**
  - Fix request completes in < 30 seconds (cloud providers)
  - Fix request completes in < 60 seconds (local providers)

- [ ] **UI remains responsive**
  - No freezing during AI request
  - Loading animation continues smoothly
  - Can still interact with other UI elements

- [ ] **Memory usage is reasonable**
  - Check browser memory tab
  - No significant leaks after multiple fix requests

## Edge Cases

- [ ] **Very large diagrams**
  - Test with 100+ nodes
  - Verify AI handles it

- [ ] **Complex nested structures**
  - Test with subgraphs
  - Verify AI preserves structure

- [ ] **Special characters in diagram**
  - Test with emojis, unicode, etc.
  - Verify AI preserves them

- [ ] **Multiple fix requests in quick succession**
  - Click Fix button multiple times
  - Verify only one request is processed

## Accessibility

- [ ] **Keyboard navigation**
  - Tab to Fix button
  - Press Enter to activate
  - Verify it works

- [ ] **Screen reader support**
  - Fix button has proper aria-label
  - Loading state is announced
  - Error messages are announced

## Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if on Mac)

## Defects Found

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| 1 | | | |
| 2 | | | |

## Notes

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

## Overall Result

- [ ] **PASS** - All tests passed
- [ ] **PASS with minor issues** - Core functionality works, minor defects found
- [ ] **FAIL** - Critical defects found

**Tester Signature:** _________________
**Date:** _________________
