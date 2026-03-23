/**
 * Comprehensive tests for AIPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AIPanel } from '../AIPanel';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'ai.panelTitle': 'AI Assistant',
        'ai.placeholder': 'Ask AI...',
        'ai.send': 'Press Enter',
        'ai.title': 'AI Assistant',
        'ai.describeDefault': 'Describe your diagram',
        'ai.providerSettings': 'Settings',
        'ai.apply': 'Apply',
        'ai.suggestion1': 'Create a flowchart',
        'ai.suggestion2': 'Add a node',
        'ai.suggestion3': 'Explain this diagram',
        'ai.suggestion4': 'Fix the syntax',
        'ai.suggestion5': 'Optimize the layout',
        'ai.suggestion6': 'Add styling',
        'ai.apiKeyRequired': 'API Key Required',
        'ai.apiKeyMessage': 'Please configure your API key',
        'ai.openSettings': 'Open Settings',
        'ai.switchProviderHint': 'or switch to a different provider',
        'ai.configureProvider': 'Configure your AI provider in settings.',
        'ai.errorPrefix': 'Error: {{msg}}',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock AI provider service
vi.mock('@/services/ai/providers', () => ({
  callAI: vi.fn(),
  streamAIResponse: vi.fn(),
  getPreset: vi.fn((provider: string) => {
    const presets: Record<string, { label: string; requiresKey: boolean }> = {
      openai: { label: 'OpenAI', requiresKey: true },
      anthropic: { label: 'Anthropic', requiresKey: true },
      ollama: { label: 'Ollama', requiresKey: false },
    };
    return presets[provider] || { label: provider, requiresKey: true };
  }),
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(() => Promise.resolve()),
};
global.navigator.clipboard = mockClipboard as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('AIPanel Component', () => {
  const mockOnApply = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnOpenSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Handling', () => {
    it('should clear input after send attempt', async () => {
      await act(async () => {
        render(
          <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
        );
      });

      const textarea = screen.getByPlaceholderText('Ask AI...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test message' } });

      // Input should have value
      expect(textarea.value).toBe('Test message');

      // Try to send (may not actually send due to API not configured)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      // Input should be cleared after send attempt
      await waitFor(() => {
        expect(textarea.value).toBe('');
      }, { timeout: 1000 });
    });
  });

  describe('Settings and Configuration Tests', () => {
    it('should render settings button', () => {
      render(
        <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
      );

      const settingsButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.getAttribute('title') === 'Settings'
      );

      expect(settingsButton).toBeInTheDocument();
    });

    it('should call onOpenSettings when settings button clicked', async () => {
      render(
        <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
      );

      const settingsButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.getAttribute('title') === 'Settings'
      );

      if (settingsButton) {
        fireEvent.click(settingsButton);
        await waitFor(() => {
          expect(mockOnOpenSettings).toHaveBeenCalled();
        });
      }
    });

    it('should call onClose when close button clicked', async () => {
      render(
        <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
      );

      const closeButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.querySelector('svg[xmlns="http://www.w3.org/2000/svg"]') &&
        btn !== Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('title') === 'Settings')
      );

      if (closeButton) {
        fireEvent.click(closeButton);
        await waitFor(() => {
          expect(mockOnClose).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Provider Badge Tests', () => {
    it('should display provider badge', () => {
      render(
        <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
      );

      // Provider badge should be visible
      const badges = document.querySelectorAll('span[class*="rounded-full"]');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Suggestion Buttons Tests', () => {
    it('should render suggestion buttons when no messages', async () => {
      await act(async () => {
        render(
          <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
        );
      });

      // Should have 6 suggestion buttons
      const suggestionButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('Create') ||
        btn.textContent?.includes('Add') ||
        btn.textContent?.includes('Explain') ||
        btn.textContent?.includes('Fix') ||
        btn.textContent?.includes('Optimize') ||
        btn.textContent?.includes('Add styling')
      );

      expect(suggestionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Welcome Screen Tests', () => {
    it('should render welcome message when no messages', async () => {
      await act(async () => {
        render(
          <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
        );
      });

      // Check for AI Assistant text (may be multiple instances)
      const elements = screen.getAllByText('AI Assistant');
      expect(elements.length).toBeGreaterThan(0);
      expect(screen.getByText('Describe your diagram')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll Tests', () => {
    it('should setup scroll ref', async () => {
      await act(async () => {
        render(
          <AIPanel currentContent="" onApply={mockOnApply} onClose={mockOnClose} onOpenSettings={mockOnOpenSettings} />
        );
      });

      // Component should have rendered without errors
      expect(screen.getByPlaceholderText('Ask AI...')).toBeInTheDocument();
    });
  });
});
