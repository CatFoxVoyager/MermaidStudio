/**
 * Tests for useDiagramActions hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDiagramActions } from '../useDiagramActions';

// Mock database functions
vi.mock('@/services/storage/database', () => ({
  createDiagram: vi.fn((title: string, content?: string) => Promise.resolve({
    id: `diagram-${Date.now()}`,
    title,
    content: content || 'flowchart TD\n    A --> B',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  createFolder: vi.fn(() => Promise.resolve({
    id: `folder-${Date.now()}`,
    name: 'New Folder',
    parent_id: null,
    created_at: new Date().toISOString(),
  })),
  getSettings: vi.fn(() => Promise.resolve({
    theme: 'light',
    language: 'en',
    lastOpenDiagramId: null,
  })),
  updateSettings: vi.fn(() => Promise.resolve()),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const TEMPLATE: import('@/types').Template = {
  id: 'template-1',
  title: 'Flowchart',
  description: 'd',
  category: 'flowchart',
  complexity: 'simple',
  type: 'flowchart',
  content: 'graph TD\n  A --> B',
};

describe('useDiagramActions Hook', () => {
  const mockOpenDiagram = vi.fn();
  const mockRefresh = vi.fn();
  const mockShowToast = vi.fn();
  const mockCloseModal = vi.fn();

  function setup() {
    return renderHook(() =>
      useDiagramActions({
        openDiagram: mockOpenDiagram,
        refresh: mockRefresh,
        showToast: mockShowToast,
        closeModal: mockCloseModal,
      })
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('newDiagram', () => {
    it('opens a root draft and creates nothing', async () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).not.toHaveBeenCalled();
      expect(result.current.newDiagramDraft).toMatchObject({
        folderId: null,
        defaultName: 'newDiagramDialog.defaultName',
      });
      expect(result.current.newDiagramDraft?.content).toBeUndefined();
    });

    it('a repeated blank request keeps the open draft (typing is not lost)', () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      const first = result.current.newDiagramDraft!.id;
      act(() => {
        result.current.newDiagram();
      });

      expect(result.current.newDiagramDraft!.id).toBe(first);
    });
  });

  describe('newDiagramInFolder', () => {
    it('targets the folder with the sidebar default content', async () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagramInFolder('folder-1');
      });

      const draft = result.current.newDiagramDraft!;
      expect(draft.folderId).toBe('folder-1');
      expect(draft.content).toContain('theme: base');
      expect(draft.content).toContain('flowchart TD');

      await act(async () => {
        await result.current.confirmNewDiagram('X');
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledWith('X', draft.content, 'folder-1');
    });

    it('always replaces an open draft', () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      const before = result.current.newDiagramDraft!.id;
      act(() => {
        result.current.newDiagramInFolder('folder-2');
      });

      expect(result.current.newDiagramDraft!.id).toBe(before + 1);
      expect(result.current.newDiagramDraft!.folderId).toBe('folder-2');
    });
  });

  describe('confirmNewDiagram', () => {
    it('creates the trimmed name, refreshes and opens the diagram', async () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      await act(async () => {
        await result.current.confirmNewDiagram('  Réseau  ');
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledWith('Réseau', undefined, null);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(mockOpenDiagram).toHaveBeenCalledWith(expect.stringMatching(/^diagram-\d+$/))
      );
      expect(result.current.newDiagramDraft).toBeNull();
    });

    it('with a blank name creates nothing', async () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      await act(async () => {
        await result.current.confirmNewDiagram('   ');
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).not.toHaveBeenCalled();
    });

    it('cancelNewDiagram closes the draft and creates nothing', async () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      act(() => {
        result.current.cancelNewDiagram();
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(result.current.newDiagramDraft).toBeNull();
      expect(createDiagram).not.toHaveBeenCalled();
    });

    it('a second confirm in the same tick does not create a second diagram', async () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      await act(async () => {
        await Promise.all([
          result.current.confirmNewDiagram('A'),
          result.current.confirmNewDiagram('A'),
        ]);
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleTemplateSelect', () => {
    it('closes the library and opens a template draft', () => {
      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });
      const before = result.current.newDiagramDraft!.id;
      act(() => {
        result.current.handleTemplateSelect(TEMPLATE);
      });

      expect(mockCloseModal).toHaveBeenCalledWith('showTemplates');
      expect(result.current.newDiagramDraft).toMatchObject({
        content: TEMPLATE.content,
        defaultName: TEMPLATE.title,
        templateTitle: TEMPLATE.title,
      });
      expect(result.current.newDiagramDraft!.id).toBe(before + 1);
    });

    it('confirming a template draft creates from the template and toasts the chosen name', async () => {
      const { result } = setup();

      act(() => {
        result.current.handleTemplateSelect(TEMPLATE);
      });
      await act(async () => {
        await result.current.confirmNewDiagram(TEMPLATE.title);
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledWith(TEMPLATE.title, TEMPLATE.content, null);
      expect(mockShowToast).toHaveBeenCalledWith(`toast.opened "${TEMPLATE.title}"`);
    });
  });

  describe('handleNewFolder', () => {
    it('should create a new folder', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleNewFolder();
      });

      const { createFolder } = await import('@/services/storage/database');
      expect(createFolder).toHaveBeenCalledWith('New Folder');
    });

    it('should refresh after creating folder', async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleNewFolder();
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should propagate createDiagram errors to caller', async () => {
      const { createDiagram } = await import('@/services/storage/database');
      (createDiagram as any).mockRejectedValueOnce(new Error('Database error'));

      const { result } = setup();

      act(() => {
        result.current.newDiagram();
      });

      await expect(result.current.confirmNewDiagram('X')).rejects.toThrow('Database error');
    });

    it('should propagate createFolder errors to caller', async () => {
      const { createFolder } = await import('@/services/storage/database');
      (createFolder as any).mockRejectedValueOnce(new Error('Database error'));

      const { result } = setup();

      await expect(async () => {
        await act(async () => {
          await result.current.handleNewFolder();
        });
      }).rejects.toThrow('Database error');
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple diagram creations', async () => {
      const { result } = setup();

      for (const name of ['N1', 'N2', 'N3']) {
        act(() => {
          result.current.newDiagram();
        });
        await act(async () => {
          await result.current.confirmNewDiagram(name);
        });
      }

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledTimes(3);
      expect(mockOpenDiagram).toHaveBeenCalledTimes(3);
      expect(mockRefresh).toHaveBeenCalledTimes(3);
    });
  });
});
