import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIChat } from '../useAIChat';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `test-uuid-${Math.random()}`),
  },
  writable: true,
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('useAIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty messages', () => {
      const { result } = renderHook(() => useAIChat());
      expect(result.current.messages).toEqual([]);
    });

    it('should return bottomRef', () => {
      const { result } = renderHook(() => useAIChat());
      expect(result.current.bottomRef).toBeDefined();
      expect(result.current.bottomRef.current).toBeNull();
    });

    it('should return addMessage function', () => {
      const { result } = renderHook(() => useAIChat());
      expect(result.current.addMessage).toBeDefined();
      expect(typeof result.current.addMessage).toBe('function');
    });

    it('should return resetChat function', () => {
      const { result } = renderHook(() => useAIChat());
      expect(result.current.resetChat).toBeDefined();
      expect(typeof result.current.resetChat).toBe('function');
    });
  });

  describe('Adding Messages', () => {
    it('should add user message', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('user', 'Hello');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello');
    });

    it('should add assistant message', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('assistant', 'Hi there!');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.messages[0].content).toBe('Hi there!');
    });

    it('should add multiple messages', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('user', 'First message');
        result.current.addMessage('assistant', 'Response');
        result.current.addMessage('user', 'Second message');
      });

      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[0].content).toBe('First message');
      expect(result.current.messages[1].content).toBe('Response');
      expect(result.current.messages[2].content).toBe('Second message');
    });

    it('should generate unique IDs for messages', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('user', 'Msg 1');
        result.current.addMessage('user', 'Msg 2');
      });

      expect(result.current.messages[0].id).not.toBe(result.current.messages[1].id);
    });

    it('should include timestamp in messages', () => {
      const { result } = renderHook(() => useAIChat());
      const before = Date.now();

      act(() => {
        result.current.addMessage('user', 'Test');
      });

      const timestamp = new Date(result.current.messages[0].timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should return the created message from addMessage', () => {
      const { result } = renderHook(() => useAIChat());

      let returnedMessage: any;

      act(() => {
        returnedMessage = result.current.addMessage('user', 'Test message');
      });

      expect(returnedMessage).toBeDefined();
      expect(returnedMessage.role).toBe('user');
      expect(returnedMessage.content).toBe('Test message');
      expect(returnedMessage.id).toBeDefined();
      expect(returnedMessage.timestamp).toBeDefined();
    });
  });

  describe('Resetting Chat', () => {
    it('should reset chat when empty', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.resetChat();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('should clear all messages', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('user', 'Hello');
        result.current.addMessage('assistant', 'Hi');
        result.current.resetChat();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('should allow adding messages after reset', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('user', 'First');
        result.current.resetChat();
        result.current.addMessage('user', 'After reset');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('After reset');
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('should update bottomRef when messages change', () => {
      const { result } = renderHook(() => useAIChat());

      act(() => {
        result.current.addMessage('user', 'Test');
      });

      // Ref should still be defined after message add
      expect(result.current.bottomRef).toBeDefined();
    });
  });
});
