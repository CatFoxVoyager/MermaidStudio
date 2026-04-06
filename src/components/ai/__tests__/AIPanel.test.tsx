/**
 * Characterization tests for AIPanel component
 * Documents existing behavior before refactoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIPanel } from '../AIPanel';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { msg?: string }) => {
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
  }),
}));

// Mock dependencies with importOriginal to preserve exports
vi.mock('@/services/storage/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/storage/database')>();
  return {
    ...actual,
    getSettings: vi.fn(() => Promise.resolve({
      ai_provider: 'openai',
      ai_api_key: 'test-key',
      ai_model: 'gpt-4',
      ai_base_url: '',
      theme: 'base',
      language: 'en',
    })),
  };
});

const mockCallAI = vi.fn(() => Promise.resolve('flowchart LR\n  A-->B'));

vi.mock('@/services/ai/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ai/providers')>();
  return {
    ...actual,
    callAI: () => mockCallAI(),
    getPreset: vi.fn((provider: string) => {
      const presets: Record<string, { label: string; requiresKey: boolean }> = {
        openai: { label: 'OpenAI', requiresKey: true },
        ollama: { label: 'Ollama', requiresKey: false },
        anthropic: { label: 'Anthropic', requiresKey: true },
      };
      return presets[provider] || { label: provider, requiresKey: true };
    }),
    buildSystemPrompt: vi.fn(() => 'Mock system prompt'),
  };
});

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(() => Promise.resolve()),
};
global.navigator.clipboard = mockClipboard as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `test-${Math.random()}`),
  },
  writable: true,
});

describe('AIPanel - Characterization Tests', () => {
  const mockProps = {
    currentContent: '',
    onApply: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Initial State', () => {
    it('should render with empty state initially', () => {
      render(<AIPanel {...mockProps} />);
      expect(screen.getByTestId('ai-panel')).toBeInTheDocument();
    });

    it('should render with empty messages array', () => {
      render(<AIPanel {...mockProps} />);
      expect(screen.queryByTestId('ai-message-user')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ai-response')).not.toBeInTheDocument();
    });

    it('should render input field empty', () => {
      render(<AIPanel {...mockProps} />);
      const input = screen.getByTestId('ai-input') as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });

    it('should render send button', () => {
      render(<AIPanel {...mockProps} />);
      expect(screen.getByTestId('ai-send')).toBeInTheDocument();
    });

    it('should disable send button when input is empty', () => {
      render(<AIPanel {...mockProps} />);
      const sendButton = screen.getByTestId('ai-send');
      expect(sendButton).toBeDisabled();
    });

    it('should show welcome message when no messages', () => {
      render(<AIPanel {...mockProps} />);
      expect(screen.getByText('Describe your diagram')).toBeInTheDocument();
    });
  });

  describe('2. Settings Loading on Mount', () => {
    it('should load settings on mount and display provider', async () => {
      render(<AIPanel {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });
    });
  });

  describe('3. Provider Badge Display', () => {
    it('should display OpenAI badge for OpenAI provider', async () => {
      render(<AIPanel {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });
    });
  });

  describe('4. Message Sending Flow', () => {
    it('should enable send button when input has text', async () => {
      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Hello');

      const sendButton = screen.getByTestId('ai-send');
      expect(sendButton).not.toBeDisabled();
    });

    it('should add user message when sending', async () => {
      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Create a flowchart');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-message-user')).toBeInTheDocument();
        expect(screen.getByText('Create a flowchart')).toBeInTheDocument();
      });
    });

    it('should clear input after sending', async () => {
      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input') as HTMLTextAreaElement;
      await userEvent.type(input, 'Test message');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('5. Error Handling', () => {
    it('should handle empty response from AI', async () => {
      mockCallAI.mockResolvedValueOnce('');

      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Test');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/empty response/i)).toBeInTheDocument();
      });
    });

    it('should handle error response from AI', async () => {
      mockCallAI.mockResolvedValueOnce('Error: Invalid API key');

      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Test');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockCallAI.mockRejectedValueOnce(new Error('Network error'));

      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Test');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle suspicious timestamp-only responses', async () => {
      mockCallAI.mockResolvedValueOnce('17:04');

      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Test');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/unexpected response/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Chat Reset Functionality', () => {
    it('should show reset button when messages exist', async () => {
      mockCallAI.mockResolvedValueOnce('Response');

      render(<AIPanel {...mockProps} />);

      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Test');

      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        const resetButton = screen.getByTitle(/reset chat/i);
        expect(resetButton).toBeInTheDocument();
      });
    });

    it('should clear all messages when reset is clicked', async () => {
      mockCallAI.mockResolvedValueOnce('Response');

      render(<AIPanel {...mockProps} />);

      // Send a message
      const input = screen.getByTestId('ai-input');
      await userEvent.type(input, 'Test');
      const sendButton = screen.getByTestId('ai-send');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-message-user')).toBeInTheDocument();
      });

      // Click reset
      const resetButton = screen.getByTitle(/reset chat/i);
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.queryByTestId('ai-message-user')).not.toBeInTheDocument();
      });
    });

    it('should not show reset button when no messages', () => {
      render(<AIPanel {...mockProps} />);

      const resetButton = document.querySelector('[title="Reset chat"]');
      expect(resetButton).not.toBeInTheDocument();
    });
  });

  describe('7. API Key Required Warning', () => {
    it('should not show warning when API key is configured', async () => {
      render(<AIPanel {...mockProps} />);

      // With default mock that has API key, warning should not show
      await waitFor(() => {
        expect(screen.queryByText(/api key required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('UI Elements', () => {
    it('should render settings button', () => {
      render(<AIPanel {...mockProps} />);
      expect(screen.getByTestId('ai-settings')).toBeInTheDocument();
    });

    it('should call onOpenSettings when settings button clicked', async () => {
      render(<AIPanel {...mockProps} />);

      const settingsButton = screen.getByTestId('ai-settings');
      await userEvent.click(settingsButton);

      expect(mockProps.onOpenSettings).toHaveBeenCalled();
    });

    it('should render close button', () => {
      render(<AIPanel {...mockProps} />);
      expect(screen.getByTestId('close-ai')).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      render(<AIPanel {...mockProps} />);

      const closeButton = screen.getByTestId('close-ai');
      await userEvent.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should render suggestion buttons when no messages', async () => {
      render(<AIPanel {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Create a flowchart')).toBeInTheDocument();
        expect(screen.getByText('Add a node')).toBeInTheDocument();
        expect(screen.getByText('Explain this diagram')).toBeInTheDocument();
      });
    });
  });
});
