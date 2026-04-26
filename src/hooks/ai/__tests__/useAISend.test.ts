import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAISend } from '../useAISend';
import type { AIMessage } from '@/types';

vi.mock('@/services/storage/database', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storage/database')>();
  return {
    ...actual,
    getSettings: vi.fn(() =>
      Promise.resolve({
        ai_machine_size: 'low' as const,
        ai_api_key: '',
        ai_base_url: '',
        ai_model: '',
      })
    ),
  };
});

vi.mock('@/services/ai/providers', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/ai/providers')>();
  return {
    ...actual,
    callAI: vi.fn(() =>
      Promise.resolve('This is a response with ```mermaid\ngraph TD\n  A-->B\n```')
    ),
  };
});

vi.mock('@/utils/logger', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/logger')>();
  return {
    ...actual,
    logger: {
      scope: () => ({
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    },
  };
});

describe('useAISend', () => {
  let mockAddMessage: ReturnType<typeof vi.fn>;
  let mockMessages: AIMessage[];
  let mockT: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAddMessage = vi.fn((role: AIMessage['role'], content: string) => ({
      id: 'test-id',
      role,
      content,
      timestamp: new Date().toISOString(),
    }));

    mockMessages = [];
    mockT = vi.fn((key: string, params?: { msg?: string }) => {
      if (params?.msg) {
        return `Error: ${params.msg}`;
      }
      return key;
    });

    vi.clearAllMocks();
  });

  describe('Sending messages when configured', () => {
    it('should send message and add assistant response', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Create a flowchart', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('graph TD'));
    });

    it('should wrap unfenced mermaid code in fences', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('sequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Create a sequence diagram', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        '```mermaid\nsequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello\n```'
      );
    });

    it('should wrap mermaid code with preceding text in fences', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('Convert to sequence diagram\n\nsequenceDiagram\n    participant A\n    A->>B: Hi');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Convert to sequence', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        'Convert to sequence diagram\n\n```mermaid\nsequenceDiagram\n    participant A\n    A->>B: Hi\n```'
      );
    });

    it('should pass through already-fenced responses unchanged', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('```mermaid\nflowchart TD\n    A --> B\n```');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        '```mermaid\nflowchart TD\n    A --> B\n```'
      );
    });

    it('should pass through non-mermaid text unchanged', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('This is just a plain text response without any diagram code.');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Explain', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        'This is just a plain text response without any diagram code.'
      );
    });

    it('should set loading to false after completion', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test message', mockT);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Handling empty responses', () => {
    it('should handle empty response with error message', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('Empty response received')
      );
    });

    it('should handle whitespace-only response', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('   \n  ');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('Empty response received')
      );
    });
  });

  describe('Handling error responses', () => {
    it('should detect error messages in response', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('Error: Invalid API key');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('Error: Invalid API key')
      );
    });

    it('should handle "No response from" error messages', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('No response from server');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('No response from')
      );
    });
  });

  describe('Handling suspicious timestamp-only responses', () => {
    it('should pass through short responses like timestamps as-is', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('17:04');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith('assistant', '17:04');
    });

    it('should accept short valid responses that are not timestamps', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockResolvedValueOnce('OK');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith('assistant', 'OK');
    });
  });

  describe('Demo mode when not configured', () => {
    it('should show demo response when not configured', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: false,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('flowchart')
      );
    });

    it('should show explanatory demo response for "explain" queries', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'sequenceDiagram\n  Alice->>Bob: Hello',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: false,
        })
      );

      await act(async () => {
        await result.current.send('Explain this diagram', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('sequence diagram')
      );
      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('visualizes')
      );
    });

    it('should show generic demo response for non-explain queries', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: false,
        })
      );

      await act(async () => {
        await result.current.send('Create something', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('help'));
    });
  });

  describe('Preventing duplicate sends', () => {
    it('should return early if text is empty', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('', mockT);
      });

      expect(mockAddMessage).not.toHaveBeenCalled();
    });

    it('should return early if text is only whitespace', async () => {
      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('   ', mockT);
      });

      expect(mockAddMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('Network error')
      );
    });

    it('should handle unknown errors', async () => {
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockRejectedValueOnce('Unknown error string');

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      await act(async () => {
        await result.current.send('Test', mockT);
      });

      expect(mockAddMessage).toHaveBeenCalledWith(
        'assistant',
        expect.stringContaining('Unknown error')
      );
    });
  });

  describe('Loading state behavior', () => {
    it('should be true during send and false after completion', async () => {
      let resolveCallAI: (value: string) => void;
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockImplementationOnce(() => {
        return new Promise(resolve => {
          resolveCallAI = resolve;
        });
      });

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      const sendPromise = result.current.send('Test', mockT);

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        resolveCallAI!('Response');
        await sendPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('should prevent sending while already loading', async () => {
      let resolveCallAI: (value: string) => void;
      const { callAI } = await import('@/services/ai/providers');
      vi.mocked(callAI).mockImplementationOnce(() => {
        return new Promise(resolve => {
          resolveCallAI = resolve;
        });
      });

      const { result } = renderHook(() =>
        useAISend({
          currentContent: 'graph TD\n  A-->B',
          messages: mockMessages,
          addMessage: mockAddMessage,
          isConfigured: true,
        })
      );

      const firstSend = result.current.send('First', mockT);

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        await result.current.send('Second', mockT);
      });

      await act(async () => {
        resolveCallAI!('Response');
        await firstSend;
      });

      expect(mockAddMessage).toHaveBeenCalledTimes(1);
    });
  });
});
