/**
 * Custom hook for managing keyboard shortcuts in React components.
 *
 * Provides a declarative way to register keyboard shortcuts with optional
 * modifier keys (Ctrl/Cmd, Shift) and conditional execution.
 *
 * @example
 * ```tsx
 * const shortcuts = [
 *   {
 *     key: 'k',
 *     ctrl: true,
 *     action: () => setOpenPalette(true),
 *   },
 *   {
 *     key: 's',
 *     ctrl: true,
 *     action: () => save(),
 *     condition: () => hasActiveTab(),
 *   },
 * ];
 * useKeyboardShortcuts(shortcuts);
 * ```
 */

import { useEffect } from 'react';

/**
 * Configuration for a keyboard shortcut.
 */
export interface Shortcut {
  /** The key name (e.g., 'k', 'F11', '?') */
  key: string;
  /** Whether Ctrl or Cmd key must be pressed */
  ctrl?: boolean;
  /** Whether Shift key must be pressed */
  shift?: boolean;
  /** Callback to execute when shortcut is triggered */
  action: () => void;
  /** Optional guard condition - action only executes if this returns true */
  condition?: () => boolean;
}

/**
 * Checks if the event target is an input-like element where keyboard
 * shortcuts should be ignored.
 */
function isInputLikeElement(eventTarget: EventTarget | null): boolean {
  if (!eventTarget) {return false;}
  const target = eventTarget as HTMLElement;
  // Check basic properties first
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return true;
  }
  // Check contentEditable
  if (target.isContentEditable) {
    return true;
  }
  // Check closest - only if it's an HTMLElement with closest method
  if (typeof target.closest === 'function') {
    return target.closest('input, textarea, [contenteditable]') !== null;
  }
  return false;
}

/**
 * Checks if a keyboard event matches a shortcut configuration.
 */
function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;

  // Check key match (case-insensitive for single characters)
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                   event.key === shortcut.key;

  // Check modifier keys
  const ctrlMatch = shortcut.ctrl === true ? ctrl : shortcut.ctrl === false ? !ctrl : true;
  const shiftMatch = shortcut.shift === true ? shift : shortcut.shift === false ? !shift : true;

  return keyMatch && ctrlMatch && shiftMatch;
}

/**
 * Hook for registering keyboard shortcuts.
 *
 * @param shortcuts - Array of shortcut configurations
 *
 * @remarks
 * - Shortcuts are evaluated in order; first match wins
 * - Default behavior is prevented for matched shortcuts
 * - Shortcuts are ignored when focus is in input/textarea/contenteditable elements
 * - Event listener is automatically cleaned up on unmount
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore key presses in input-like elements
      if (isInputLikeElement(event.target)) {
        return;
      }

      // Find first matching shortcut
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          // Check optional condition guard
          if (shortcut.condition && !shortcut.condition()) {
            continue;
          }

          event.preventDefault();
          shortcut.action();
          break; // Only execute first match
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
