import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAISettings } from '../useAISettings';

vi.mock('@/services/storage/database', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storage/database')>();
  return {
    ...actual,
    getSettings: vi.fn(() =>
      Promise.resolve({
        ai_machine_size: 'low',
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
    getMachineConfig: vi.fn((size: string) => ({
      id: size === 'low' ? 'qwen3.5-0.8b-mermaid' : 'qwen3.5-2b-mermaid',
      label: size === 'low' ? 'Low Memory' : 'High Memory',
    })),
  };
});

describe('useAISettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization with default machine size', () => {
    it('should initialize with default machine size', () => {
      const { result } = renderHook(() => useAISettings());
      expect(result.current.machineSize).toBe('low');
    });

    it('should load settings and update machine size', async () => {
      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.machineSize).toBe('low');
      });
    });
  });

  describe('Loading settings from database', () => {
    it('should load machine size from settings', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValueOnce({
        ai_machine_size: 'low',
        ai_api_key: '',
        ai_base_url: '',
        ai_model: '',
        theme: 'dark',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.machineSize).toBe('low');
      });
    });

    it('should handle missing machine size in settings', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValueOnce({
        ai_machine_size: undefined as any,
        ai_api_key: '',
        ai_base_url: '',
        ai_model: '',
        theme: 'dark',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.machineSize).toBe('low');
      });
    });
  });

  describe('Config object', () => {
    it('should return config object with label', async () => {
      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.config).toBeDefined();
        expect(result.current.config.label).toBe('Low Memory');
      });
    });
  });

  describe('Reload when settingsKey changes', () => {
    it('should reload settings when settingsKey changes', async () => {
      const { getSettings } = await import('@/services/storage/database');
      let callCount = 0;
      vi.mocked(getSettings).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ai_machine_size: callCount === 1 ? 'low' : ('high' as const),
          ai_api_key: '',
          ai_base_url: '',
          ai_model: '',
          theme: 'dark',
          language: 'en',
        });
      });

      const { result, rerender } = renderHook(({ key }) => useAISettings(key), {
        initialProps: { key: 1 },
      });

      await waitFor(() => {
        expect(result.current.machineSize).toBe('low');
        expect(callCount).toBe(1);
      });

      rerender({ key: 2 });

      await waitFor(() => {
        expect(result.current.machineSize).toBe('high');
        expect(callCount).toBe(2);
      });
    });

    it('should not reload when settingsKey is undefined', async () => {
      const { getSettings } = await import('@/services/storage/database');
      let callCount = 0;
      vi.mocked(getSettings).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ai_machine_size: 'low' as const,
          ai_api_key: '',
          ai_base_url: '',
          ai_model: '',
          theme: 'dark',
          language: 'en',
        });
      });

      const { result, rerender } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.machineSize).toBe('low');
        expect(callCount).toBe(1);
      });

      rerender();

      expect(callCount).toBe(1);
    });
  });
});
