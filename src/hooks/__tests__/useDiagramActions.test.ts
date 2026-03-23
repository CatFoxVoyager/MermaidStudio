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
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('useDiagramActions Hook', () => {
  const mockOpenDiagram = vi.fn();
  const mockRefresh = vi.fn();
  const mockShowToast = vi.fn();
  const mockCloseModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('newDiagram', () => {
    it('should create a new diagram with default title', async () => {
      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.newDiagram();
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledWith('Untitled Diagram');
    });

    it('should call openDiagram with the new diagram id', async () => {
      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.newDiagram();
      });

      expect(mockOpenDiagram).toHaveBeenCalled();
      const diagramId = mockOpenDiagram.mock.calls[0][0];
      expect(diagramId).toMatch(/^diagram-\d+$/);
    });

    it('should call refresh after creating diagram', async () => {
      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.newDiagram();
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleTemplateSelect', () => {
    it('should create diagram from template', async () => {
      const template: import('@/types').Template = {
        title: 'Flowchart',
        content: 'graph TD\n  A --> B',
        id: 'template-1',
        description: 'A simple flowchart',
        category: 'flowchart',
        complexity: 'simple',
        type: 'flowchart',
      };

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.handleTemplateSelect(template);
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledWith(template.title, template.content);
    });

    it('should open the created diagram', async () => {
      const template: import('@/types').Template = {
        title: 'Sequence Diagram',
        content: 'sequenceDiagram\n  A->>B: Hello',
        id: 'template-2',
        description: 'A sequence diagram',
        category: 'sequence',
        complexity: 'simple',
        type: 'sequence',
      };

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.handleTemplateSelect(template);
      });

      expect(mockOpenDiagram).toHaveBeenCalled();
    });

    it('should refresh the diagram list', async () => {
      const template: import('@/types').Template = {
        title: 'Class Diagram',
        content: 'classDiagram\n  A --> B',
        id: 'template-3',
        description: 'A class diagram',
        category: 'class',
        complexity: 'moderate',
        type: 'classDiagram',
      };

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.handleTemplateSelect(template);
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should close the templates modal', async () => {
      const template: import('@/types').Template = {
        title: 'ER Diagram',
        content: 'erDiagram\n  A ||--o{ B',
        id: 'template-4',
        description: 'An ER diagram',
        category: 'entity',
        complexity: 'advanced',
        type: 'erDiagram',
      };

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.handleTemplateSelect(template);
      });

      expect(mockCloseModal).toHaveBeenCalledWith('showTemplates');
    });

    it('should show toast notification', async () => {
      const template: import('@/types').Template = {
        title: 'State Diagram',
        content: 'stateDiagram-v2\n  A --> B',
        id: 'template-5',
        description: 'A state diagram',
        category: 'state',
        complexity: 'simple',
        type: 'stateDiagram',
      };

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.handleTemplateSelect(template);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
        const toastMessage = mockShowToast.mock.calls[0][0];
        expect(toastMessage).toContain('opened');
        expect(toastMessage).toContain(template.title);
      });
    });
  });

  describe('handleNewFolder', () => {
    it('should create a new folder', async () => {
      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.handleNewFolder();
      });

      const { createFolder } = await import('@/services/storage/database');
      expect(createFolder).toHaveBeenCalledWith('New Folder');
    });

    it('should refresh after creating folder', async () => {
      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

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

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await expect(async () => {
        await act(async () => {
          await result.current.newDiagram();
        });
      }).rejects.toThrow('Database error');
    });

    it('should propagate createFolder errors to caller', async () => {
      const { createFolder } = await import('@/services/storage/database');
      (createFolder as any).mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await expect(async () => {
        await act(async () => {
          await result.current.handleNewFolder();
        });
      }).rejects.toThrow('Database error');
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple diagram creations', async () => {
      const { result } = renderHook(() =>
        useDiagramActions({
          openDiagram: mockOpenDiagram,
          refresh: mockRefresh,
          showToast: mockShowToast,
          closeModal: mockCloseModal,
        })
      );

      await act(async () => {
        await result.current.newDiagram();
        await result.current.newDiagram();
        await result.current.newDiagram();
      });

      const { createDiagram } = await import('@/services/storage/database');
      expect(createDiagram).toHaveBeenCalledTimes(3);
      expect(mockOpenDiagram).toHaveBeenCalledTimes(3);
      expect(mockRefresh).toHaveBeenCalledTimes(3);
    });
  });
});
