/**
 * Tests for useKeyboardShortcuts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import type { Shortcut } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    keydownHandler = null;
    // Spy on window.addEventListener and capture the handler
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event: string, handler: EventListenerOrEventListenerObject) => {
        if (event === 'keydown' && typeof handler === 'function') {
          keydownHandler = handler as (event: KeyboardEvent) => void;
        }
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Event listener lifecycle', () => {
    it('should register event listener on mount', () => {
      const shortcuts: Shortcut[] = [
        { key: 'k', ctrl: true, action: vi.fn() },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should clean up event listener on unmount', () => {
      const shortcuts: Shortcut[] = [
        { key: 'k', ctrl: true, action: vi.fn() },
      ];
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

      expect(removeSpy).not.toHaveBeenCalled();

      unmount();

      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Basic key matching', () => {
    it('should execute action on simple key match', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k' });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should execute action on key match with Ctrl', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should execute action on key match with Cmd (metaKey)', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should execute action on key match with Shift', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'K', shift: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'K', shiftKey: true });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should execute action on key match with Ctrl+Shift', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [
        { key: 'F', ctrl: true, shift: true, action },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', {
        key: 'F',
        ctrlKey: true,
        shiftKey: true,
      });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should handle F11 key correctly', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'F11', action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'F11' });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters like ?', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: '?', action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: '?' });
      keydownHandler!(event);

      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should match keys case-insensitively', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const eventLower = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const eventUpper = new KeyboardEvent('keydown', { key: 'K', ctrlKey: true });

      keydownHandler!(eventLower);
      keydownHandler!(eventUpper);

      expect(action).toHaveBeenCalledTimes(2);
    });
  });

  describe('Modifier key requirements', () => {
    it('should not execute action when Ctrl is required but not pressed', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k' });
      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();
    });

    it('should not execute action when Shift is required but not pressed', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'K', shift: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'K' });
      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();
    });

    it('should not execute action when Ctrl+Shift required but only Ctrl pressed', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [
        { key: 'F', ctrl: true, shift: true, action },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'F', ctrlKey: true });
      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('Default behavior prevention', () => {
    it('should prevent default for matched shortcut', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 's', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      keydownHandler!(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default for unmatched key', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'x' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      keydownHandler!(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Condition guard', () => {
    it('should execute action when condition returns true', () => {
      const action = vi.fn();
      const condition = vi.fn(() => true);
      const shortcuts: Shortcut[] = [
        { key: 's', ctrl: true, action, condition },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      keydownHandler!(event);

      expect(condition).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
    });

    it('should not execute action when condition returns false', () => {
      const action = vi.fn();
      const condition = vi.fn(() => false);
      const shortcuts: Shortcut[] = [
        { key: 's', ctrl: true, action, condition },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      keydownHandler!(event);

      expect(condition).toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
    });

    it('should not prevent default when condition returns false', () => {
      const action = vi.fn();
      const condition = vi.fn(() => false);
      const shortcuts: Shortcut[] = [
        { key: 's', ctrl: true, action, condition },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      keydownHandler!(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should execute action without condition when condition not provided', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      keydownHandler!(event);

      expect(action).toHaveBeenCalled();
    });
  });

  describe('Input element handling', () => {
    it('should ignore shortcuts when typing in input element', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      Object.defineProperty(event, 'target', { writable: false, value: input });

      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should ignore shortcuts when typing in textarea element', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      Object.defineProperty(event, 'target', { writable: false, value: textarea });

      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('should ignore shortcuts when typing in contenteditable element', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      Object.defineProperty(event, 'target', { writable: false, value: div });

      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it('should execute shortcuts when not in input element', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const div = document.createElement('div');
      document.body.appendChild(div);

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      Object.defineProperty(event, 'target', { writable: false, value: div });

      keydownHandler!(event);

      expect(action).toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it('should detect input via closest selector', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const span = document.createElement('span');
      const input = document.createElement('input');
      input.appendChild(span);
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      Object.defineProperty(event, 'target', { writable: false, value: span });

      keydownHandler!(event);

      expect(action).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('Multiple shortcuts', () => {
    it('should register multiple shortcuts', () => {
      const action1 = vi.fn();
      const action2 = vi.fn();
      const action3 = vi.fn();
      const shortcuts: Shortcut[] = [
        { key: 'k', ctrl: true, action: action1 },
        { key: 't', ctrl: true, action: action2 },
        { key: 'F11', action: action3 },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      keydownHandler!(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      keydownHandler!(new KeyboardEvent('keydown', { key: 't', ctrlKey: true }));
      keydownHandler!(new KeyboardEvent('keydown', { key: 'F11' }));

      expect(action1).toHaveBeenCalledTimes(1);
      expect(action2).toHaveBeenCalledTimes(1);
      expect(action3).toHaveBeenCalledTimes(1);
    });

    it('should only execute first matching shortcut', () => {
      const action1 = vi.fn();
      const action2 = vi.fn();
      const shortcuts: Shortcut[] = [
        { key: 'k', ctrl: true, action: action1 },
        { key: 'k', ctrl: true, action: action2 },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      keydownHandler!(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

      expect(action1).toHaveBeenCalledTimes(1);
      expect(action2).not.toHaveBeenCalled();
    });

    it('should handle empty shortcuts array', () => {
      renderHook(() => useKeyboardShortcuts([]));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      keydownHandler!(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle null target gracefully', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      Object.defineProperty(event, 'target', { writable: false, value: null });

      expect(() => keydownHandler!(event)).not.toThrow();
      expect(action).toHaveBeenCalled();
    });

    it('should work with repeated key presses', () => {
      const action = vi.fn();
      const shortcuts: Shortcut[] = [{ key: 'k', ctrl: true, action }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      for (let i = 0; i < 5; i++) {
        keydownHandler!(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      }

      expect(action).toHaveBeenCalledTimes(5);
    });
  });
});
