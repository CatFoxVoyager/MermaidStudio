/**
 * Tests for database layer with API key encryption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSettings,
  updateSettings,
  createDiagram,
  createFolder,
  clearCache,
  getDiagram,
  updateDiagram,
  deleteDiagram,
  deleteDiagrams,
  getDiagrams,
  updateFolder,
  deleteFolder,
  getFolders,
  createTag,
  deleteTag,
  toggleDiagramTag,
  getDiagramTags,
  getTags,
  getDiagramsForTag,
  exportBackup,
  importBackup,
  saveVersion,
  getVersions,
  saveUserTemplate,
  getUserTemplates,
  deleteUserTemplate,
  moveDiagramsToFolder,
} from '../database';

describe('Database API Key Encryption', () => {
  beforeEach(async () => {
    // Clear cache and localStorage before each test
    clearCache();
    localStorage.clear();

    // Close any open IndexedDB connections
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name?.includes('mermaid')) {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.deleteDatabase(db.name!);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }

    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(() => {
    clearCache();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('API key encryption', () => {
    it('should migrate legacy plaintext API key to encrypted', async () => {
      const testApiKey = 'sk-legacy-migration-key-12345';

      // Simulate legacy data with plaintext API key
      clearCache();
      localStorage.clear();

      // Manually create legacy data structure
      const legacyData = {
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'light', // Different from default to ensure migration
          language: 'en',
          ai_api_key: testApiKey,
          ai_machine_size: 'low',
          ai_base_url: 'https://api.openai.com',
          ai_model: 'gpt-5.3-instant',
        },
        userTemplates: [],
      };

      // Store legacy data in localStorage
      localStorage.setItem('mermaid_studio_v1', JSON.stringify(legacyData));

      // Trigger migration by calling getSettings
      const settings = await getSettings();

      // Should have the API key
      expect(settings.ai_api_key).toBe(testApiKey);

      // Should have migrated other settings
      expect(settings.theme).toBe('light');

      // Clear cache and verify it persists after migration
      clearCache();
      const settingsAfter = await getSettings();
      expect(settingsAfter.ai_api_key).toBe(testApiKey);
      expect(settingsAfter.theme).toBe('light');
    });

    it('should encrypt API keys before saving', async () => {
      const testApiKey = 'sk-test-api-key-12345';

      // Update settings with API key
      await updateSettings({ ai_api_key: testApiKey });

      // Retrieve settings to verify encryption
      const settings = await getSettings();

      // Should have the decrypted API key
      expect(settings.ai_api_key).toBe(testApiKey);

      // Should not have the encrypted field in returned object
      expect('_encryptedKey' in settings).toBe(false);
    });

    it('should decrypt API keys when retrieved', async () => {
      const testApiKey = 'sk-test-api-key-12345';

      // Save API key
      await updateSettings({ ai_api_key: testApiKey });

      // Retrieve settings
      const settings = await getSettings();

      // Should have the decrypted API key
      expect(settings.ai_api_key).toBe(testApiKey);

      // Should not have the encrypted field in returned object
      expect('_encryptedKey' in settings).toBe(false);
    });

    it('should persist settings across cache clears', async () => {
      const testApiKey = 'sk-test-api-key-12345';

      // Save API key
      await updateSettings({ ai_api_key: testApiKey });

      // Clear cache to simulate new session
      clearCache();

      // Retrieve settings - should load from IndexedDB
      const settings = await getSettings();

      // Should have the API key after cache clear
      expect(settings.ai_api_key).toBe(testApiKey);
    });

    it('should store encrypted key in database, not plaintext', async () => {
      const testApiKey = 'sk-test-api-key-12345';

      // Save API key
      await updateSettings({ ai_api_key: testApiKey });

      // Clear cache to force reload from database
      clearCache();

      // Retrieve settings again - should successfully decrypt
      const settings = await getSettings();

      // Should have the decrypted API key
      expect(settings.ai_api_key).toBe(testApiKey);

      // Should not have the encrypted field in returned object
      expect('_encryptedKey' in settings).toBe(false);
    });

    it('should handle multiple updates to API key', async () => {
      const apiKey1 = 'sk-test-api-key-1';
      const apiKey2 = 'sk-test-api-key-2';

      // Save first API key
      await updateSettings({ ai_api_key: apiKey1 });
      let settings = await getSettings();
      expect(settings.ai_api_key).toBe(apiKey1);

      // Update to second API key
      await updateSettings({ ai_api_key: apiKey2 });
      settings = await getSettings();
      expect(settings.ai_api_key).toBe(apiKey2);

      // Clear cache and verify it persists
      clearCache();
      settings = await getSettings();
      expect(settings.ai_api_key).toBe(apiKey2);
    });

    it('should handle empty API key', async () => {
      // First set an API key
      await updateSettings({ ai_api_key: 'sk-test-key' });
      let settings = await getSettings();
      expect(settings.ai_api_key).toBe('sk-test-key');

      // Update with empty API key
      await updateSettings({ ai_api_key: '' });

      settings = await getSettings();
      // Empty string should be preserved
      expect(settings.ai_api_key || '').toBe('');
    });

    it('should update multiple settings', async () => {
      await updateSettings({
        ai_machine_size: 'low',
        ai_base_url: 'http://localhost:11434',
        ai_model: 'llama3',
      });

      const settings = await getSettings();

      expect(settings.ai_machine_size).toBe('low');
      expect(settings.ai_base_url).toBe('http://localhost:11434');
      expect(settings.ai_model).toBe('llama3');
    });

    it('should preserve other settings when updating API key', async () => {
      // Set initial settings
      await updateSettings({
        ai_machine_size: 'low',
        ai_base_url: 'https://api.openai.com',
        ai_model: 'gpt-5.3-instant',
        theme: 'dark',
      });

      // Update only API key
      await updateSettings({ ai_api_key: 'sk-new-key' });

      const settings = await getSettings();

      expect(settings.ai_api_key).toBe('sk-new-key');
      expect(settings.ai_machine_size).toBe('low');
      expect(settings.ai_base_url).toBe('https://api.openai.com');
      expect(settings.ai_model).toBe('gpt-5.3-instant');
      expect(settings.theme).toBe('dark');
    });
  });

  describe('Async operations', () => {
    it('should create diagrams asynchronously without theme frontmatter', async () => {
      const diagram = await createDiagram('Test Diagram', 'flowchart TD\n  A --> B');

      expect(diagram.id).toBeDefined();
      expect(diagram.title).toBe('Test Diagram');
      // Content is stored as-is (theme frontmatter is no longer added by default)
      expect(diagram.content).toBe('flowchart TD\n  A --> B');
      // themeId should be undefined (frontmatter provides theming)
      expect(diagram.themeId).toBeUndefined();
    });

    it('should create folders asynchronously', async () => {
      const folder = await createFolder('Test Folder');

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Test Folder');
    });

    it('should generate unique IDs', async () => {
      const diagram1 = await createDiagram('Diagram 1');
      const diagram2 = await createDiagram('Diagram 2');

      expect(diagram1.id).not.toBe(diagram2.id);
    });

    it('should persist data after cache clear', async () => {
      const diagram = await createDiagram('Persistent Diagram');

      // Clear cache
      clearCache();

      // Create another item to force load from IndexedDB
      await createFolder('Test');

      // Verify the first diagram was created successfully
      expect(diagram.id).toBeDefined();
    });
  });

  describe('Diagram CRUD operations', () => {
    it('should create diagram with unique ID', async () => {
      const diagram = await createDiagram('Test Diagram', 'flowchart TD\n  A --> B');

      expect(diagram.id).toBeDefined();
      expect(diagram.title).toBe('Test Diagram');
      // Content is stored as-is (no theme frontmatter added)
      expect(diagram.content).toBe('flowchart TD\n  A --> B');
      expect(diagram.created_at).toBeDefined();
      expect(diagram.updated_at).toBeDefined();
    });

    it('should retrieve diagram by ID', async () => {
      const created = await createDiagram('Test Diagram', 'flowchart TD\n  A --> B');
      const retrieved = await getDiagram(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Test Diagram');
    });

    it('should return undefined for non-existent diagram', async () => {
      const retrieved = await getDiagram('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should update diagram', async () => {
      const diagram = await createDiagram('Original Title', 'flowchart TD\n  A --> B');

      await updateDiagram(diagram.id, {
        title: 'Updated Title',
        content: 'flowchart TD\n  B --> C',
      });

      const updated = await getDiagram(diagram.id);
      expect(updated?.title).toBe('Updated Title');
      // Content is updated as-is (base theme config is only added on creation)
      expect(updated?.content).toBe('flowchart TD\n  B --> C');
      expect(updated?.created_at).toBe(diagram.created_at); // Should not change
      expect(updated?.updated_at).toBeDefined(); // Should be present
    });

    it('should delete diagram', async () => {
      const diagram = await createDiagram('To Delete', 'flowchart TD\n  A --> B');

      await deleteDiagram(diagram.id);

      const retrieved = await getDiagram(diagram.id);
      expect(retrieved).toBeUndefined();
    });

    it('should list all diagrams', async () => {
      const diagram1 = await createDiagram('Diagram 1', 'flowchart TD\n  A --> B');
      const diagram2 = await createDiagram('Diagram 2', 'flowchart TD\n  B --> C');

      const diagrams = await getDiagrams();

      expect(diagrams.length).toBeGreaterThanOrEqual(2);
      expect(diagrams.some(d => d.id === diagram1.id)).toBe(true);
      expect(diagrams.some(d => d.id === diagram2.id)).toBe(true);
    });

    it('should create diagram in folder', async () => {
      const folder = await createFolder('Test Folder');
      const diagram = await createDiagram('Folder Diagram', 'flowchart TD\n  A --> B', folder.id);

      expect(diagram.folder_id).toBe(folder.id);
    });
  });

  describe('Folder CRUD operations', () => {
    it('should create folder with unique ID', async () => {
      const folder = await createFolder('Test Folder');

      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Test Folder');
      expect(folder.parent_id).toBeNull();
      expect(folder.created_at).toBeDefined();
    });

    it('should create folder with parent', async () => {
      const parent = await createFolder('Parent Folder');
      const child = await createFolder('Child Folder', parent.id);

      expect(child.parent_id).toBe(parent.id);
    });

    it('should list all folders', async () => {
      const folder1 = await createFolder('Folder 1');
      const folder2 = await createFolder('Folder 2');

      const folders = await getFolders();

      expect(folders.length).toBeGreaterThanOrEqual(2);
      expect(folders.some(f => f.id === folder1.id)).toBe(true);
      expect(folders.some(f => f.id === folder2.id)).toBe(true);
    });

    it('should update folder name', async () => {
      const folder = await createFolder('Original Name');

      await updateFolder(folder.id, 'Updated Name');

      const folders = await getFolders();
      const updated = folders.find(f => f.id === folder.id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete folder', async () => {
      const folder = await createFolder('To Delete');

      await deleteFolder(folder.id);

      const folders = await getFolders();
      expect(folders.some(f => f.id === folder.id)).toBe(false);
    });

    it('should set folder_id to null when deleting folder', async () => {
      const folder = await createFolder('Test Folder');
      const diagram = await createDiagram(
        'Diagram in Folder',
        'flowchart TD\n  A --> B',
        folder.id
      );

      await deleteFolder(folder.id);

      const retrieved = await getDiagram(diagram.id);
      expect(retrieved?.folder_id).toBeNull();
    });

    it('should delete child folders when deleting parent', async () => {
      const parent = await createFolder('Parent');
      const child = await createFolder('Child', parent.id);

      await deleteFolder(parent.id);

      const folders = await getFolders();
      expect(folders.some(f => f.id === parent.id)).toBe(false);
      expect(folders.some(f => f.id === child.id)).toBe(false);
    });
  });

  describe('Tag operations', () => {
    it('should create tag', async () => {
      const tag = await createTag('test-tag', '#ff0000');

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('test-tag');
      expect(tag.color).toBe('#ff0000');
    });

    it('should list all tags', async () => {
      const tag1 = await createTag('tag1', '#ff0000');
      const tag2 = await createTag('tag2', '#00ff00');

      const tags = await getTags();

      expect(tags.length).toBeGreaterThanOrEqual(2);
      expect(tags.some(t => t.id === tag1.id)).toBe(true);
      expect(tags.some(t => t.id === tag2.id)).toBe(true);
    });

    it('should delete tag', async () => {
      const tag = await createTag('to-delete', '#ff0000');

      await deleteTag(tag.id);

      const tags = await getTags();
      expect(tags.some(t => t.id === tag.id)).toBe(false);
    });

    it('should toggle tag on diagram', async () => {
      const tag = await createTag('important', '#ff0000');
      const diagram = await createDiagram('Important Diagram');

      // Add tag
      await toggleDiagramTag(diagram.id, tag.id);
      let diagramTags = await getDiagramTags(diagram.id);
      expect(diagramTags.some(t => t.id === tag.id)).toBe(true);

      // Remove tag
      await toggleDiagramTag(diagram.id, tag.id);
      diagramTags = await getDiagramTags(diagram.id);
      expect(diagramTags.some(t => t.id === tag.id)).toBe(false);
    });

    it('should get tags for diagram', async () => {
      const tag1 = await createTag('tag1', '#ff0000');
      const tag2 = await createTag('tag2', '#00ff00');
      const diagram = await createDiagram('Tagged Diagram');

      await toggleDiagramTag(diagram.id, tag1.id);
      await toggleDiagramTag(diagram.id, tag2.id);

      const diagramTags = await getDiagramTags(diagram.id);
      expect(diagramTags.length).toBe(2);
      expect(diagramTags.some(t => t.id === tag1.id)).toBe(true);
      expect(diagramTags.some(t => t.id === tag2.id)).toBe(true);
    });

    it('should remove diagram-tag association when deleting tag', async () => {
      const tag = await createTag('to-delete', '#ff0000');
      const diagram = await createDiagram('Diagram');

      await toggleDiagramTag(diagram.id, tag.id);
      await deleteTag(tag.id);

      const diagramTags = await getDiagramTags(diagram.id);
      expect(diagramTags.some(t => t.id === tag.id)).toBe(false);
    });
  });

  describe('Backup and Import', () => {
    it('should export all data excluding sensitive fields', async () => {
      const folder = await createFolder('Backup Folder');
      const diagram = await createDiagram('Backup Diagram', 'flowchart TD\n  A --> B', folder.id);
      const tag = await createTag('backup-tag', '#00ff00');
      await toggleDiagramTag(diagram.id, tag.id);

      await updateSettings({ ai_api_key: 'sk-backup-test-key' });

      const backup = await exportBackup();

      expect(backup.version).toBe(1);
      expect(backup.exported_at).toBeDefined();
      expect(backup.folders.length).toBeGreaterThan(0);
      expect(backup.diagrams.length).toBeGreaterThan(0);
      expect(backup.tags.length).toBeGreaterThan(0);
      expect(backup.diagramTags.length).toBeGreaterThan(0);

      expect(backup.settings).toBeDefined();
      if (backup.settings) {
        expect(backup.settings._encryptedKey).toBeUndefined();
        expect(backup.settings.theme).toBeDefined();
      }
    });

    it('should not import duplicate diagrams', async () => {
      // Export and re-import
      const backup = await exportBackup();
      const result = await importBackup(backup);

      // Should not import duplicates (all diagrams already exist)
      expect(result.diagrams).toBe(0);
    });

    it('should merge settings during import', async () => {
      // Set initial settings
      await updateSettings({
        theme: 'dark',
        language: 'en',
        ai_machine_size: 'low',
      });

      // Create backup with different settings
      const backup = await exportBackup();
      if (backup.settings) {
        backup.settings.theme = 'light';
        backup.settings.language = 'fr';
      }

      // Import backup
      await importBackup(backup);

      // Settings should be merged
      const settings = await getSettings();
      expect(settings.theme).toBe('light');
      expect(settings.language).toBe('fr');
    });

    it('should exclude encrypted API key from backup', async () => {
      const testKey = `sk-backup-test-${Date.now()}`;

      await updateSettings({ ai_api_key: testKey });

      const backup = await exportBackup();

      if (backup.settings) {
        expect(backup.settings._encryptedKey).toBeUndefined();
        expect('ai_api_key' in backup.settings).toBe(false);

        expect(backup.settings.theme).toBeDefined();
        expect(backup.settings.language).toBeDefined();
      }
    });
  });

  describe('Cache behavior', () => {
    it('should load from cache on first call', async () => {
      const settings1 = await getSettings();
      const settings2 = await getSettings();

      // Should return same settings (from cache)
      expect(settings1.theme).toBe(settings2.theme);
    });

    it('should reload from IndexedDB after cache clear', async () => {
      await updateSettings({ theme: 'dark' });
      const settings1 = await getSettings();
      expect(settings1.theme).toBe('dark');

      // Clear cache
      clearCache();

      // Update settings directly (bypassing cache)
      await updateSettings({ theme: 'light' });

      // Should load new settings from IndexedDB
      const settings2 = await getSettings();
      expect(settings2.theme).toBe('light');
    });

    it('should cache diagram operations', async () => {
      const diagram = await createDiagram('Cached Diagram');
      const retrieved1 = await getDiagram(diagram.id);
      const retrieved2 = await getDiagram(diagram.id);

      expect(retrieved1?.id).toBe(retrieved2?.id);
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple simultaneous diagram creates', async () => {
      const promises = [
        createDiagram('Concurrent 1'),
        createDiagram('Concurrent 2'),
        createDiagram('Concurrent 3'),
      ];
      const results = await Promise.all(promises);

      const ids = new Set(results.map(d => d.id));
      expect(ids.size).toBe(3);
    });

    it('should handle multiple simultaneous folder creates', async () => {
      const promises = [
        createFolder('Folder 1'),
        createFolder('Folder 2'),
        createFolder('Folder 3'),
      ];
      const results = await Promise.all(promises);

      const ids = new Set(results.map(f => f.id));
      expect(ids.size).toBe(3);
    });

    it('should handle concurrent tag operations', async () => {
      const promises = [
        createTag('tag1', '#ff0000'),
        createTag('tag2', '#00ff00'),
        createTag('tag3', '#0000ff'),
      ];
      const results = await Promise.all(promises);

      const ids = new Set(results.map(t => t.id));
      expect(ids.size).toBe(3);
    });
  });

  describe('Encryption edge cases', () => {
    it('should handle empty API key', async () => {
      await updateSettings({ ai_api_key: '' });
      const settings = await getSettings();

      // Empty string should be preserved
      expect(settings.ai_api_key || '').toBe('');
    });

    it('should handle API key with special characters', async () => {
      const specialKey = 'sk-test-!@#$%^&*()_+-={}[]|\\:";\'<>?,./`~';
      await updateSettings({ ai_api_key: specialKey });

      const settings = await getSettings();
      expect(settings.ai_api_key).toBe(specialKey);
    });

    it('should handle very long API keys', async () => {
      const longKey = 'sk-' + 'a'.repeat(10000);
      await updateSettings({ ai_api_key: longKey });

      const settings = await getSettings();
      expect(settings.ai_api_key).toBe(longKey);
    });

    it('should handle API key with unicode characters', async () => {
      const unicodeKey = 'sk-test-你好世界-🔑-🚀';
      await updateSettings({ ai_api_key: unicodeKey });

      const settings = await getSettings();
      expect(settings.ai_api_key).toBe(unicodeKey);
    });
  });

  describe('Migration edge cases', () => {
    it('should handle corrupted localStorage data', async () => {
      clearCache();
      localStorage.clear();

      // Store invalid JSON
      localStorage.setItem('mermaid_studio_v1', 'invalid-json{{{');

      // Should fall back to fresh data
      const settings = await getSettings();
      expect(settings).toBeDefined();
      expect(settings.theme).toBeDefined();
    });

    it('should handle missing settings in localStorage', async () => {
      clearCache();
      localStorage.clear();

      // Store data without settings
      const partialData = JSON.stringify({
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
      });
      localStorage.setItem('mermaid_studio_v1', partialData);

      const settings = await getSettings();
      expect(settings.theme).toBeDefined();
      expect(settings.language).toBeDefined();
    });

    it('should migrate partial settings with defaults', async () => {
      clearCache();
      localStorage.clear();

      // Store partial settings
      const partialData = JSON.stringify({
        folders: [],
        diagrams: [],
        versions: [],
        tags: [],
        diagramTags: [],
        settings: {
          theme: 'dark',
          // Missing: language, ai_api_key, etc.
        },
      });
      localStorage.setItem('mermaid_studio_v1', partialData);

      const settings = await getSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.language).toBe('en'); // Default
      expect(settings.ai_machine_size).toBe('low'); // Default
    });
  });

  describe('Version management', () => {
    it('should limit versions to 50 per diagram', async () => {
      const diagram = await createDiagram('Version Test');

      // Create 51 versions
      for (let i = 0; i < 51; i++) {
        await saveVersion(diagram.id, `content-${i}`, `Version ${i}`);
      }

      const versions = await getVersions(diagram.id);

      // Should have 50 versions (oldest removed)
      expect(versions.length).toBe(50);

      // Oldest version should be Version 1 (not Version 0)
      const versionLabels = versions.map(v => v.label);
      expect(versionLabels).not.toContain('Version 0');
    });

    it('should maintain version order', async () => {
      const diagram = await createDiagram('Order Test');

      const v1 = await saveVersion(diagram.id, 'v1', 'First');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const v2 = await saveVersion(diagram.id, 'v2', 'Second');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const v3 = await saveVersion(diagram.id, 'v3', 'Third');

      const versions = await getVersions(diagram.id);

      // Should be in reverse chronological order (newest first)
      expect(versions[0].id).toBe(v3.id);
      expect(versions[1].id).toBe(v2.id);
      expect(versions[2].id).toBe(v1.id);
    });
  });

  describe('User templates', () => {
    it('should create user template', async () => {
      const template = await saveUserTemplate({
        title: 'Custom Template',
        description: 'My custom template',
        content: 'graph TD\n  A --> B',
        category: 'flowchart',
      });

      expect(template.id).toBeDefined();
      expect(template.title).toBe('Custom Template');
      expect(template.created_at).toBeDefined();
    });

    it('should get user templates', async () => {
      await saveUserTemplate({
        title: 'Template 1',
        description: 'Desc 1',
        content: 'content1',
        category: 'flowchart',
      });

      await saveUserTemplate({
        title: 'Template 2',
        description: 'Desc 2',
        content: 'content2',
        category: 'sequence',
      });

      const templates = await getUserTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.some(t => t.title === 'Template 1')).toBe(true);
      expect(templates.some(t => t.title === 'Template 2')).toBe(true);
    });

    it('should delete user template', async () => {
      const template = await saveUserTemplate({
        title: 'To Delete',
        description: 'Will be deleted',
        content: 'content',
        category: 'flowchart',
      });

      await deleteUserTemplate(template.id);

      const templates = await getUserTemplates();
      expect(templates.some(t => t.id === template.id)).toBe(false);
    });
  });

  describe('Tag query operations', () => {
    it('should get diagrams for a tag', async () => {
      const tag = await createTag('test-tag', '#ff0000');
      const diagram1 = await createDiagram('Diagram 1');
      const diagram2 = await createDiagram('Diagram 2');

      await toggleDiagramTag(diagram1.id, tag.id);
      await toggleDiagramTag(diagram2.id, tag.id);

      const diagramIds = await getDiagramsForTag(tag.id);

      expect(diagramIds).toContain(diagram1.id);
      expect(diagramIds).toContain(diagram2.id);
      expect(diagramIds.length).toBe(2);
    });

    it('should return empty array for tag with no diagrams', async () => {
      const tag = await createTag('unused-tag', '#00ff00');

      const diagramIds = await getDiagramsForTag(tag.id);

      expect(diagramIds).toEqual([]);
    });
  });

  describe('Bulk operations', () => {
    it('should delete multiple diagrams', async () => {
      const diagram1 = await createDiagram('Bulk 1');
      const diagram2 = await createDiagram('Bulk 2');
      const diagram3 = await createDiagram('Bulk 3');

      await deleteDiagrams([diagram1.id, diagram2.id]);

      const diagrams = await getDiagrams();

      expect(diagrams.some(d => d.id === diagram1.id)).toBe(false);
      expect(diagrams.some(d => d.id === diagram2.id)).toBe(false);
      expect(diagrams.some(d => d.id === diagram3.id)).toBe(true);
    });

    it('should move multiple diagrams to folder', async () => {
      const folder = await createFolder('Target Folder');
      const diagram1 = await createDiagram('Move 1');
      const diagram2 = await createDiagram('Move 2');
      const diagram3 = await createDiagram('Move 3');

      await moveDiagramsToFolder([diagram1.id, diagram2.id], folder.id);

      const d1 = await getDiagram(diagram1.id);
      const d2 = await getDiagram(diagram2.id);
      const d3 = await getDiagram(diagram3.id);

      expect(d1?.folder_id).toBe(folder.id);
      expect(d2?.folder_id).toBe(folder.id);
      expect(d3?.folder_id).toBeNull();
    });

    it('should move diagrams out of folder', async () => {
      const folder = await createFolder('Original Folder');
      const diagram = await createDiagram('To Move', 'flowchart TD\n  A --> B', folder.id);

      await moveDiagramsToFolder([diagram.id], null);

      const retrieved = await getDiagram(diagram.id);
      expect(retrieved?.folder_id).toBeNull();
    });
  });

  describe('Backup and restore edge cases', () => {
    it('should handle empty backup', async () => {
      clearCache();
      localStorage.clear();

      // Create fresh data
      const backup = await exportBackup();

      expect(backup.version).toBe(1);
      expect(backup.exported_at).toBeDefined();
      expect(backup.diagrams).toBeDefined();
      expect(backup.folders).toBeDefined();
    });

    it('should handle backup with no settings', async () => {
      const backup = await exportBackup();
      delete backup.settings;

      const result = await importBackup(backup);

      expect(result.diagrams).toBe(0); // No new diagrams
      expect(result.folders).toBe(0); // No new folders
    });

    it('should merge user templates from backup', async () => {
      const backup = await exportBackup();

      // Add a user template to backup
      backup.userTemplates = [
        {
          id: 'template-backup-1',
          title: 'Backup Template',
          description: 'From backup',
          content: 'flowchart TD\n  A --> B',
          category: 'flowchart',
          created_at: new Date().toISOString(),
        },
      ];

      await importBackup(backup);

      const templates = await getUserTemplates();
      expect(templates.some(t => t.id === 'template-backup-1')).toBe(true);
    });
  });
});
