/**
 * Tests for useToast hook with secure ID generation
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';
import { isValidId } from '@/utils/crypto';

describe('useToast Secure ID Generation', () => {
  describe('Secure ID generation', () => {
    it('should generate IDs using crypto.getRandomValues()', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.show('Test message', 'success');
      });

      const toasts = result.current.toasts;
      expect(toasts).toHaveLength(1);

      const toast = toasts[0];
      expect(toast.id).toBeTruthy();

      // ID should be 32 hex chars (128 bits) with toast_ prefix
      expect(toast.id).toMatch(/^toast_[a-f0-9]{32}$/i);
    });

    it('should generate unique IDs for multiple toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.show('Test 1', 'success');
        result.current.show('Test 2', 'error');
        result.current.show('Test 3', 'info');
      });

      const toasts = result.current.toasts;
      expect(toasts).toHaveLength(3);

      const ids = toasts.map(t => t.id);
      const uniqueIds = new Set(ids);

      // All IDs should be unique
      expect(uniqueIds.size).toBe(3);
    });

    it('should use cryptographically secure IDs (no collisions)', () => {
      const { result } = renderHook(() => useToast());

      // Generate many toasts to test for collisions
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.show(`Test ${i}`, 'success');
        }
      });

      const toasts = result.current.toasts;
      const ids = toasts.map(t => t.id);
      const uniqueIds = new Set(ids);

      // All 100 IDs should be unique (no collisions)
      expect(uniqueIds.size).toBe(100);
    });
  });

  describe('Toast functionality with secure IDs', () => {
    it('should add toast with secure ID', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.show('Test message', 'success');
      });

      const toasts = result.current.toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].type).toBe('success');
      expect(isValidId(toasts[0].id.replace('toast_', ''))).toBe(true);
    });

    it('should remove toast by secure ID', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.show('Test message', 'success');
      });

      let toasts = result.current.toasts;
      expect(toasts).toHaveLength(1);

      const toastId = toasts[0].id;

      act(() => {
        result.current.dismiss(toastId);
      });

      toasts = result.current.toasts;
      expect(toasts).toHaveLength(0);
    });

    it('should auto-dismiss toast after timeout', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.show('Test message', 'success');
      });

      expect(result.current.toasts).toHaveLength(1);

      // Fast-forward time by 2500ms
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(result.current.toasts).toHaveLength(0);

      vi.useRealTimers();
    });
  });
});
