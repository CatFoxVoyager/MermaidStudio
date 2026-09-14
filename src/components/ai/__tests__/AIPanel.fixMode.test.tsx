import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIPanel } from '../AIPanel';

// Mock i18next. The mocked `t` MUST be referentially stable across renders —
// real react-i18next memoizes it, and AIPanel's fix-mode effect lists `t` in
// its dependency array (AIPanel.tsx, deps [fixTrigger, isConfigured, t]). A
// per-call closure re-fired that effect on EVERY render; the effect's
// sendFixRequest updates state, which re-renders, which re-fires the effect…
// an unbounded synchronous loop that neither testTimeout nor React can
// interrupt, ending in the pool killing the worker fork ("Worker exited
// unexpectedly") — this killed one fork on EVERY full-suite run (VAL-01,
// 2026-09-14) and silently dropped this file's 2 tests. vi.hoisted keeps the
// stable reference visible inside the hoisted vi.mock factory.
const { mockT } = vi.hoisted(() => ({
  mockT: (key: string, params?: { msg?: string; provider?: string }) => {
    const translations: Record<string, string> = {
      'ai.panelTitle': 'AI Assistant',
      'ai.placeholder': 'Ask AI...',
      'ai.send': 'Press Enter',
      'ai.title': 'AI Assistant',
      'ai.describeDefault': 'Describe your diagram',
      'ai.providerSettings': 'Settings',
      'ai.resetChat': 'Reset chat',
      'ai.apply': 'Apply',
      'ai.suggestion1': 'Create a flowchart',
      'ai.suggestion2': 'Add a node',
      'ai.suggestion3': 'Explain this diagram',
      'ai.suggestion4': 'Fix the syntax',
      'ai.suggestion5': 'Optimize the layout',
      'ai.suggestion6': 'Add styling',
      'ai.apiKeyRequired': 'API Key Required',
      'ai.apiKeyMessage': 'Please configure your API key for {{ provider }}.',
      'ai.openSettings': 'Open Settings',
      'ai.switchProviderHint': 'or switch to a different provider',
      'ai.configureProvider': 'Configure your AI provider in settings.',
      'ai.errorPrefix': 'Error: {{msg}}',
      'ai.analyzing': 'Analyzing diagram...',
    };
    let result = translations[key] || key;
    if (params?.msg) {
      result = result.replace('{{msg}}', params.msg);
    }
    if (params?.provider) {
      result = result.replace('{{provider}}', params.provider);
    }
    return result;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('AIPanel Fix Mode', () => {
  const mockProps = {
    currentContent: 'flowchart TD\n  A --> B',
    onApply: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fix mode when fixMode prop is true', () => {
    render(<AIPanel {...mockProps} fixMode={true} onEnterFixMode={vi.fn()} />);
    // Should hide suggestions in fix mode
    expect(screen.queryByText(/Create a flowchart/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add a node/i)).not.toBeInTheDocument();
  });

  it('should show suggestions when fixMode prop is false', () => {
    render(<AIPanel {...mockProps} fixMode={false} onEnterFixMode={vi.fn()} />);
    // Should show suggestions when not in fix mode
    expect(screen.getByText(/Create a flowchart/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a node/i)).toBeInTheDocument();
  });
});
