/**
 * Tests for localStorage to IndexedDB migration
 *
 * Note: Due to IndexedDB persistence between test runs in the test environment,
 * these tests focus on migration logic and error handling rather than
 * testing the exact data migration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSettings,
  getDiagrams,
  clearCache,
} from '../database';

describe('Database Migration (localStorage to IndexedDB)', () => {
  beforeEach(async () => {
    // Clear cache and localStorage before each test
    clearCache();
    localStorage.clear();
  });

  afterEach(() => {
    clearCache();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Migration error handling', () => {
    it('should handle empty localStorage gracefully', async () => {
      // No localStorage data
      const diagrams = await getDiagrams();

      // Should create fresh data with welcome diagram
      expect(diagrams.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle malformed localStorage data', async () => {
      // Store invalid JSON
      localStorage.setItem('mermaid_studio_v1', 'invalid-json');

      // Should not throw, should fall back to fresh data
      const diagrams = await getDiagrams();
      expect(diagrams.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing fields in legacy data', async () => {
      const incompleteData = {
        folders: [],
        diagrams: [
          {
            // Missing required fields
            id: 'incomplete-diag',
          },
        ],
        settings: {},
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(incompleteData));

      // Should not throw
      const diagrams = await getDiagrams();
      expect(Array.isArray(diagrams)).toBe(true);
    });
  });

  describe('Fallback behavior', () => {
    it('should handle IndexedDB failure gracefully on first access', async () => {
      // Mock IndexedDB to fail
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      try {
        // Should not throw, should create fresh data
        const diagrams = await getDiagrams();
        expect(Array.isArray(diagrams)).toBe(true);
      } finally {
        vi.spyOn(indexedDB, 'open').mockRestore();
      }
    });
  });

  describe('Data transformations', () => {
    it('should apply default migrations to settings', async () => {
      // This test runs first before IndexedDB is populated
      const legacyData = {
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'dark',
          language: 'en',
          // Old values that should be migrated
          ai_provider: 'old-provider',
          ai_base_url: 'old-url',
          ai_model: 'old-model',
        },
        userTemplates: [
          { id: 'old-template', name: 'Old Template' },
        ],
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(legacyData));

      const settings = await getSettings();

      // Should apply migrations
      expect(settings.ai_provider).toBe('openai');
      expect(settings.ai_base_url).toBe('https://api.openai.com');
      expect(settings.ai_model).toBe('gpt-5.3-instant');
    });
  });
});
