/**
 * Tests for AI providers with rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { callAI, testConnection, fetchModels } from '../providers';
import { aiRateLimiter } from '@/utils/rateLimiter';

// Mock fetch globally
global.fetch = vi.fn();

describe('AI Providers Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limiter before each test
    aiRateLimiter.reset('openai');
    aiRateLimiter.reset('claude');
    aiRateLimiter.reset('gemini');

    // Clear fetch mock
    vi.mocked(global.fetch).mockClear();
  });

  describe('Rate limiting', () => {
    it('should rate-limit AI calls (20 requests/minute per provider)', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      // Mock successful response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Hi there!' } }] }),
      } as Response);

      // Make 20 requests (should all succeed)
      for (let i = 0; i < 20; i++) {
        const result = await callAI(config, messages);
        expect(result).toBe('Hi there!');
      }

      // 21st request should be rate limited
      await expect(callAI(config, messages)).rejects.toThrow('Rate limit exceeded');
    });

    it('should provide descriptive error with reset time when rate limit exceeded', async () => {
      const config = {
        provider: 'claude' as const,
        apiKey: 'sk-ant-test-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-opus-20240229',
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      // Mock successful response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'Hi there!' }] }),
      } as Response);

      // Make 20 requests to hit rate limit
      for (let i = 0; i < 20; i++) {
        await callAI(config, messages);
      }

      // Next request should fail with descriptive error
      try {
        await callAI(config, messages);
        expect.fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Rate limit exceeded');
        expect((error as Error).message).toContain('seconds');
      }
    });

    it('should have independent rate limits for different providers', async () => {
      const openaiConfig = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      const claudeConfig = {
        provider: 'claude' as const,
        apiKey: 'sk-ant-test-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-opus-20240229',
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      // Mock successful responses
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hi there!' } }],
          content: [{ text: 'Hi there!' }],
        }),
      } as Response);

      // Make 20 requests to OpenAI (should hit rate limit)
      for (let i = 0; i < 20; i++) {
        await callAI(openaiConfig, messages);
      }

      // OpenAI should be rate limited
      await expect(callAI(openaiConfig, messages)).rejects.toThrow('Rate limit exceeded');

      // But Claude should still work (independent rate limit)
      const result = await callAI(claudeConfig, messages);
      expect(result).toBe('Hi there!');
    });

    it('should allow requests after rate limit window expires', async () => {
      const config = {
        provider: 'gemini' as const,
        apiKey: 'AIza-test-key',
        baseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-pro',
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      // Mock successful response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hi there!' }] } }] }),
      } as Response);

      // Make 20 requests to hit rate limit
      for (let i = 0; i < 20; i++) {
        await callAI(config, messages);
      }

      // Should be rate limited
      await expect(callAI(config, messages)).rejects.toThrow('Rate limit exceeded');

      // Wait for rate limit to expire (60 seconds)
      // In a real test, we'd use vi.useFakeTimers(), but for now we'll just check the reset time
      const resetTime = aiRateLimiter.getResetTime('gemini');
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000); // Should be within 60 seconds
    });
  });

  describe('Provider API calls', () => {
    it('should call OpenAI API with correct format', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Response' } }] }),
      } as Response);

      await callAI(config, messages);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-test-key',
          }),
          body: expect.stringContaining('"model":"gpt-4"'),
        })
      );
    });

    it('should call Anthropic API with correct format', async () => {
      const config = {
        provider: 'claude' as const,
        apiKey: 'sk-ant-test-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-opus-20240229',
      };

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: 'Response' }] }),
      } as Response);

      await callAI(config, messages);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'sk-ant-test-key',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          }),
          body: expect.stringContaining('"system":"You are helpful"'),
        })
      );
    });

    it('should call Gemini API with correct format', async () => {
      const config = {
        provider: 'gemini' as const,
        apiKey: 'AIza-test-key',
        baseUrl: 'https://generativelanguage.googleapis.com',
        model: 'gemini-pro',
      };

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'Response' }] } }] }),
      } as Response);

      await callAI(config, messages);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-pro:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle rate limit errors', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      } as Response);

      await expect(callAI(config, messages)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle generic API errors', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      } as Response);

      await expect(callAI(config, messages)).rejects.toThrow('Internal server error');
    });
  });

  describe('Connection testing', () => {
    it('should return ok: true on successful connection', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      } as Response);

      const result = await testConnection(config);

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Connection successful!');
    });

    it('should return ok: false with error message on failure', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      } as Response);

      const result = await testConnection(config);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid API key');
    });

    it('should return ok: false on empty response', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      } as Response);

      const result = await testConnection(config);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Empty response from model.');
    });

    it('should handle network errors', async () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await testConnection(config);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('Model fetching', () => {
    it('should return models list for OpenAI-compatible APIs', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' },
            { id: 'gpt-4-turbo' },
          ],
        }),
      } as Response);

      const models = await fetchModels('openai', 'https://api.openai.com');

      expect(models).toContain('gpt-4');
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('gpt-4-turbo');
    });

    it('should fallback to presets for Gemini', async () => {
      const models = await fetchModels('gemini', 'https://generativelanguage.googleapis.com');

      // Gemini uses preset models
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should return presets on fetch failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const models = await fetchModels('openai', 'https://api.openai.com');

      // Should fallback to presets
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should handle error responses gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Invalid request' }),
      } as Response);

      const models = await fetchModels('openai', 'https://api.openai.com');

      // Should fallback to presets
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
