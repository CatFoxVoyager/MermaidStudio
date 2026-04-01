/**
 * Tests for useAISettings hook
 * Tests settings loading, provider detection, and configuration status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAISettings } from '../useAISettings';

// Mock dependencies with importOriginal to preserve exports
vi.mock('@/services/storage/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/storage/database')>();
  return {
    ...actual,
    getSettings: vi.fn(() => Promise.resolve({
      ai_provider: 'openai',
      ai_api_key: 'sk-test-key',
      ai_base_url: '',
      ai_model: 'gpt-4',
    })),
  };
});

vi.mock('@/services/ai/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ai/providers')>();
  return {
    ...actual,
    getPreset: vi.fn((provider: string) => {
      const presets: Record<string, { label: string; requiresKey: boolean }> = {
        openai: { label: 'OpenAI', requiresKey: true },
        claude: { label: 'Anthropic', requiresKey: true },
        gemini: { label: 'Gemini', requiresKey: true },
        ollama: { label: 'Ollama', requiresKey: false },
        lmstudio: { label: 'LM Studio', requiresKey: false },
      };
      return presets[provider] || presets.openai;
    }),
  };
});

describe('useAISettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization with default provider', () => {
    it('should initialize with default provider state', () => {
      const { result } = renderHook(() => useAISettings());

      // Initial state before settings load
      expect(result.current.provider).toBe('openai');
      expect(result.current.isConfigured).toBe(false);
    });

    it('should load settings and update provider', async () => {
      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.provider).toBe('openai');
      });

      // Should be configured since we have an API key
      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });
    });
  });

  describe('Loading settings from database', () => {
    it('should load provider from settings', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValueOnce({
        ai_provider: 'claude',
        ai_api_key: 'sk-ant-test',
        ai_base_url: '',
        ai_model: 'claude-3-opus',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.provider).toBe('claude');
      });
    });

    it('should handle missing provider in settings', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValueOnce({
        ai_provider: undefined,
        ai_api_key: 'sk-test',
        ai_base_url: '',
        ai_model: 'gpt-4',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.provider).toBe('openai'); // Falls back to default
      });
    });
  });

  describe('isConfigured logic', () => {
    it('should set isConfigured true when API key exists for provider requiring key', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValue({
        ai_provider: 'openai',
        ai_api_key: 'sk-test-key',
        ai_base_url: '',
        ai_model: 'gpt-4',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(true);
      });
    });

    it('should set isConfigured false when API key missing for provider requiring key', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValue({
        ai_provider: 'openai',
        ai_api_key: '',
        ai_base_url: '',
        ai_model: 'gpt-4',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.isConfigured).toBe(false);
      });
    });

    it('should set isConfigured true for local providers without API key', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValue({
        ai_provider: 'ollama',
        ai_api_key: '', // No key needed for Ollama
        ai_base_url: '',
        ai_model: 'llama2',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.provider).toBe('ollama');
        expect(result.current.isConfigured).toBe(true);
      });
    });

    it('should set isConfigured true for LM Studio without API key', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValue({
        ai_provider: 'lmstudio',
        ai_api_key: '',
        ai_base_url: 'http://localhost:1234',
        ai_model: 'local-model',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.provider).toBe('lmstudio');
        expect(result.current.isConfigured).toBe(true);
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
          ai_provider: callCount === 1 ? 'openai' : 'claude',
          ai_api_key: callCount === 1 ? 'sk-openai' : 'sk-claude',
          ai_base_url: '',
          ai_model: 'gpt-4',
          theme: 'base',
          language: 'en',
        });
      });

      const { result, rerender } = renderHook(({ key }) => useAISettings(key), {
        initialProps: { key: 1 },
      });

      // First load
      await waitFor(() => {
        expect(result.current.provider).toBe('openai');
        expect(callCount).toBe(1);
      });

      // Trigger reload by changing settingsKey
      rerender({ key: 2 });

      // Should reload with new settings
      await waitFor(() => {
        expect(result.current.provider).toBe('claude');
        expect(callCount).toBe(2);
      });
    });

    it('should not reload when settingsKey is undefined', async () => {
      const { getSettings } = await import('@/services/storage/database');
      let callCount = 0;
      vi.mocked(getSettings).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ai_provider: 'openai',
          ai_api_key: 'sk-test',
          ai_base_url: '',
          ai_model: 'gpt-4',
          theme: 'base',
          language: 'en',
        });
      });

      const { result, rerender } = renderHook(() => useAISettings());

      // Initial load
      await waitFor(() => {
        expect(result.current.provider).toBe('openai');
        expect(callCount).toBe(1);
      });

      // Rerender with same settingsKey (undefined)
      rerender();

      // Should not reload
      expect(callCount).toBe(1);
    });
  });

  describe('Preset object', () => {
    it('should return preset object with correct properties', async () => {
      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.preset).toBeDefined();
        expect(result.current.preset.label).toBe('OpenAI');
        expect(result.current.preset.requiresKey).toBe(true);
      });
    });

    it('should update preset when provider changes', async () => {
      const { getSettings } = await import('@/services/storage/database');
      vi.mocked(getSettings).mockResolvedValueOnce({
        ai_provider: 'ollama',
        ai_api_key: '',
        ai_base_url: '',
        ai_model: 'llama2',
        theme: 'base',
        language: 'en',
      });

      const { result } = renderHook(() => useAISettings());

      await waitFor(() => {
        expect(result.current.provider).toBe('ollama');
        expect(result.current.preset.label).toBe('Ollama');
        expect(result.current.preset.requiresKey).toBe(false);
      });
    });
  });
});
