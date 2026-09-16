import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSettings, getDiagrams, clearCache } from '../database';

describe('Database Migration (localStorage to IndexedDB)', () => {
  beforeEach(async () => {
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
      const diagrams = await getDiagrams();
      expect(diagrams.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle malformed localStorage data', async () => {
      localStorage.setItem('mermaid_studio_v1', 'invalid-json');
      const diagrams = await getDiagrams();
      expect(diagrams.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing fields in legacy data', async () => {
      const incompleteData = {
        folders: [],
        diagrams: [
          {
            id: 'incomplete-diag',
          },
        ],
        settings: {},
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(incompleteData));
      const diagrams = await getDiagrams();
      expect(Array.isArray(diagrams)).toBe(true);
    });
  });

  describe('Fallback behavior', () => {
    it('should handle IndexedDB failure gracefully on first access', async () => {
      const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      try {
        const diagrams = await getDiagrams();
        expect(Array.isArray(diagrams)).toBe(true);
      } finally {
        openSpy.mockRestore();
      }
    });
  });

  describe('Data transformations', () => {
    it('should apply default migrations to settings when values are missing', async () => {
      const legacyData = {
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'dark',
          language: 'en',
        },
        userTemplates: [{ id: 'old-template', name: 'Old Template' }],
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(legacyData));
      const settings = await getSettings();
      expect(settings.ai_machine_size).toBe('low');
    });

    it('should preserve existing settings values', async () => {
      const legacyData = {
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'dark',
          language: 'en',
          ai_machine_size: 'low',
          ai_base_url: 'https://existing.url',
          ai_model: 'existing-model',
        },
        userTemplates: [],
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(legacyData));
      const settings = await getSettings();
      expect(settings.ai_machine_size).toBe('low');
      expect(settings.ai_base_url).toBe('https://existing.url');
      expect(settings.ai_model).toBe('existing-model');
    });

    // Regression lock (audit constat 5): the legacy settings whitelist used
    // to DROP seenReleaseNotesVersion and lastOpenDiagramId, so every
    // migration re-showed release notes / forgot the last opened diagram.
    it('should preserve seenReleaseNotesVersion and lastOpenDiagramId when migrating to IndexedDB', async () => {
      const legacyData = {
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'dark',
          language: 'fr',
          seenReleaseNotesVersion: '0.6.0',
          lastOpenDiagramId: 'diag-42',
        },
        userTemplates: [],
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(legacyData));
      const settings = await getSettings();
      expect(settings.seenReleaseNotesVersion).toBe('0.6.0');
      expect(settings.lastOpenDiagramId).toBe('diag-42');
    });

    it('should preserve seenReleaseNotesVersion and lastOpenDiagramId in the localStorage fallback path', async () => {
      const legacyData = {
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'dark',
          language: 'fr',
          seenReleaseNotesVersion: '0.6.0',
          lastOpenDiagramId: 'diag-42',
        },
        userTemplates: [],
      };

      localStorage.setItem('mermaid_studio_v1', JSON.stringify(legacyData));
      const openSpy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('Simulated IndexedDB failure');
      });

      try {
        const settings = await getSettings();
        expect(settings.seenReleaseNotesVersion).toBe('0.6.0');
        expect(settings.lastOpenDiagramId).toBe('diag-42');
      } finally {
        openSpy.mockRestore();
      }
    });
  });
});
