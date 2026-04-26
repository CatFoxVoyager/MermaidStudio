import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAISend } from '../useAISend';

const mockCallAI = vi.fn();
vi.mock('@/services/storage/database', () => ({
  getSettings: vi.fn(() =>
    Promise.resolve({
      ai_machine_size: 'low',
      ai_api_key: '',
      ai_base_url: '',
      ai_model: '',
    })
  ),
}));

vi.mock('@/services/ai/providers', () => ({
  callAI: vi.fn((...args: unknown[]) => mockCallAI(...args)),
}));

describe('useAISend - Fix Mode', () => {
  const mockAddMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallAI.mockResolvedValue(
      'Found 1 syntax error.\n\n```mermaid\nflowchart TD\n  A --> B\n```'
    );
  });

  it('should send fix request and add response', async () => {
    const { result } = renderHook(() =>
      useAISend({
        currentContent: 'flowchart TD\n  A[broken',
        messages: [],
        addMessage: mockAddMessage,
        isConfigured: true,
      })
    );

    await waitFor(async () => {
      await result.current.sendFixRequest(key => key);
    });

    expect(mockCallAI).toHaveBeenCalled();
    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('syntax error')
    );
  });

  it('should wrap unfenced fix response in fences', async () => {
    mockCallAI.mockResolvedValueOnce(
      'Fixed the unclosed bracket.\n\nflowchart TD\n    A[broken]\n    A --> B'
    );

    const { result } = renderHook(() =>
      useAISend({
        currentContent: 'flowchart TD\n  A[broken',
        messages: [],
        addMessage: mockAddMessage,
        isConfigured: true,
      })
    );

    await waitFor(async () => {
      await result.current.sendFixRequest(key => key);
    });

    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('```mermaid\n')
    );
    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('flowchart TD')
    );
  });

  it('should handle "no issues found" response', async () => {
    mockCallAI.mockResolvedValue(
      'This diagram looks great! No syntax, semantic, or style issues detected.'
    );

    const { result } = renderHook(() =>
      useAISend({
        currentContent: 'flowchart TD\n  A --> B',
        messages: [],
        addMessage: mockAddMessage,
        isConfigured: true,
      })
    );

    await waitFor(async () => {
      await result.current.sendFixRequest(key => key);
    });

    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('looks great')
    );
  });

  it('should handle errors gracefully', async () => {
    mockCallAI.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() =>
      useAISend({
        currentContent: 'broken',
        messages: [],
        addMessage: mockAddMessage,
        isConfigured: true,
      })
    );

    await waitFor(async () => {
      await result.current.sendFixRequest(key => key);
    });

    expect(mockAddMessage).toHaveBeenCalledWith(
      'assistant',
      expect.stringContaining('errorPrefix')
    );
  });
});
