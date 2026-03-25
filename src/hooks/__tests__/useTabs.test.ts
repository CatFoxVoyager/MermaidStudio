/**
 * Tests for useTabs hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTabs } from '../useTabs';

// Mock database functions
vi.mock('@/services/storage/database', () => ({
  getDiagram: vi.fn((diagramId) => Promise.resolve({
    id: diagramId,
    title: diagramId, // Use diagramId as title
    content: `graph TD\n  A${diagramId}-->B${diagramId}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  updateDiagram: vi.fn(() => Promise.resolve()),
  saveVersion: vi.fn(() => Promise.resolve()),
  getSettings: vi.fn(() => Promise.resolve({
    theme: 'light',
    language: 'en',
    lastOpenDiagramId: null,
  })),
  updateSettings: vi.fn(() => Promise.resolve()),
}));

describe('useTabs Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty tabs array', () => {
      const { result } = renderHook(() => useTabs());

      expect(result.current.tabs).toEqual([]);
      expect(result.current.activeTabId).toBeNull();
      expect(result.current.activeTab).toBeNull();
    });

    it('should initialize with activeTabId as null', () => {
      const { result } = renderHook(() => useTabs());

      expect(result.current.activeTabId).toBeNull();
    });
  });

  describe('Opening Diagrams', () => {
    it('should create new tab when opening diagram', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.tabs.length).toBe(1);
      expect(result.current.tabs[0].diagram_id).toBe('diagram-1');
      expect(result.current.activeTabId).toBe('tab_diagram-1');
    });

    it('should set tab title from diagram title', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      await waitFor(() => {
        expect(result.current.tabs[0].title).toBe('diagram-1');
      }, { timeout: 3000 });
    });

    it('should set tab content from diagram content', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.tabs[0].content).toContain('graph TD');
    });

    it('should set saved_content matching content initially', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.tabs[0].saved_content).toBe(result.current.tabs[0].content);
    });

    it('should initialize is_dirty to false', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.tabs[0].is_dirty).toBe(false);
    });
  });

  describe('Opening Same Diagram Twice', () => {
    it('should not create duplicate tabs for same diagram', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.tabs.length).toBe(1);
    });

    it('should switch to existing tab if diagram already open', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.tabs.length).toBe(2);
      expect(result.current.activeTabId).toBe('tab_diagram-1');
    });
  });

  describe('Closing Tabs', () => {
    it('should remove tab from tabs array', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        result.current.closeTab('tab_diagram-1');
      });

      expect(result.current.tabs.length).toBe(1);
      expect(result.current.tabs[0].diagram_id).toBe('diagram-2');
    });

    it('should set activeTab to next tab when closing active tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        await result.current.openDiagram('diagram-3');
      });

      await waitFor(() => {
        expect(result.current.tabs.length).toBe(3);
      });

      act(() => {
        result.current.closeTab('tab_diagram-1');
      });

      await waitFor(() => {
        expect(result.current.tabs.length).toBe(2);
      });
    });

    it('should set activeTab to previous tab when closing last tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        await result.current.openDiagram('diagram-3');
        result.current.closeTab('tab_diagram-3');
      });

      expect(result.current.activeTabId).toBe('tab_diagram-2');
    });

    it('should set activeTab to null when closing last remaining tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        result.current.closeTab('tab_diagram-1');
      });

      expect(result.current.activeTabId).toBeNull();
    });

    it('should not change activeTab when closing non-active tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        result.current.closeTab('tab_diagram-2');
      });

      expect(result.current.activeTabId).toBe('tab_diagram-1');
    });
  });

  describe('Active Tab', () => {
    it('should return activeTab object for activeTabId', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      expect(result.current.activeTab).not.toBeNull();
      expect(result.current.activeTab?.id).toBe('tab_diagram-1');
    });

    it('should return null when no active tab', () => {
      const { result } = renderHook(() => useTabs());

      expect(result.current.activeTab).toBeNull();
    });
  });

  describe('setActiveTabId', () => {
    it('should change active tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });
      
      await act(async () => {
        await result.current.openDiagram('diagram-2');
      });

      act(() => {
        result.current.setActiveTabId('tab_diagram-1');
      });

      expect(result.current.activeTabId).toBe('tab_diagram-1');
    });
  });

  describe('Updating Tab Content', () => {
    it('should update tab content', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        result.current.updateTabContent('tab_diagram-1', 'new content');
      });

      expect(result.current.tabs[0].content).toBe('new content');
    });

    it('should set is_dirty to true when content differs from saved', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        result.current.updateTabContent('tab_diagram-1', 'new content');
      });

      expect(result.current.tabs[0].is_dirty).toBe(true);
    });

    it('should not affect other tabs when updating one tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        result.current.updateTabContent('tab_diagram-1', 'new content');
      });

      expect(result.current.tabs[0].content).toBe('new content');
      expect(result.current.tabs[1].content).toContain('graph TD');
    });
  });

  describe('Saving Tabs', () => {
    it('should update saved_content when saving', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        result.current.updateTabContent('tab_diagram-1', 'modified content');
        await result.current.saveTab('tab_diagram-1');
      });

      expect(result.current.tabs[0].saved_content).toBe('modified content');
    });

    it('should clear is_dirty flag when saving', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        result.current.updateTabContent('tab_diagram-1', 'modified content');
        await result.current.saveTab('tab_diagram-1');
      });

      expect(result.current.tabs[0].is_dirty).toBe(false);
    });

    it('should call updateDiagram database function', async () => {
      const { updateDiagram } = await import('@/services/storage/database');
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.saveTab('tab_diagram-1');
      });

      expect(updateDiagram).toHaveBeenCalledWith('diagram-1', {
        content: 'graph TD\n  Adiagram-1-->Bdiagram-1',
        title: 'diagram-1',
      });
    });

    it('should call saveVersion database function', async () => {
      const { saveVersion } = await import('@/services/storage/database');
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.saveTab('tab_diagram-1');
      });

      expect(saveVersion).toHaveBeenCalledWith('diagram-1', expect.any(String));
    });
  });

  describe('Content Changes Matching Saved Content', () => {
    it('should clear is_dirty when content matches saved_content', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
      });

      await waitFor(() => {
        expect(result.current.tabs[0]).toBeDefined();
      });

      const savedContent = result.current.tabs[0].saved_content;

      act(() => {
        result.current.updateTabContent('tab_diagram-1', savedContent);
      });

      await waitFor(() => {
        expect(result.current.tabs[0].is_dirty).toBe(false);
      });
    });
  });

  describe('Multiple Tabs Management', () => {
    it('should handle multiple tabs simultaneously', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        await result.current.openDiagram('diagram-3');
      });

      expect(result.current.tabs.length).toBe(3);
    });

    it('should maintain independent dirty states for each tab', async () => {
      const { result } = renderHook(() => useTabs());

      await act(async () => {
        await result.current.openDiagram('diagram-1');
        await result.current.openDiagram('diagram-2');
        result.current.updateTabContent('tab_diagram-1', 'modified 1');
        result.current.updateTabContent('tab_diagram-2', 'modified 2');
      });

      expect(result.current.tabs[0].is_dirty).toBe(true);
      expect(result.current.tabs[1].is_dirty).toBe(true);
    });
  });
});
