import { useState, useCallback, useEffect } from 'react';
import type { Tab } from '@/types';
import { getDiagram, getDiagrams, updateDiagram, saveVersion, getSettings, updateSettings } from '@/services/storage/database';
import { extractThemeIdFromContent } from '@/constants/themeDerivation';

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Restore last opened diagram on mount
  useEffect(() => {
    async function restoreLastDiagram() {
      const settings = await getSettings();
      let diagramId = settings.lastOpenDiagramId;

      // If no last open diagram, fall back to the first available diagram
      if (!diagramId) {
        const diagrams = await getDiagrams();
        if (diagrams.length > 0) {
          diagramId = diagrams[0].id;
        }
      }

      if (diagramId) {
        const diagram = await getDiagram(diagramId);
        if (diagram) {
          const themeFromContent = extractThemeIdFromContent(diagram.content);
          const tab: Tab = {
            id: `tab_${diagram.id}`,
            diagram_id: diagram.id,
            title: diagram.title,
            content: diagram.content,
            saved_content: diagram.content,
            is_dirty: false,
            themeId: diagram.themeId ?? themeFromContent ?? undefined,
          };
          setTabs([tab]);
          setActiveTabId(tab.id);
        }
      }
      setInitialized(true);
    }
    restoreLastDiagram();
  }, []);

  // Save last opened diagram when active tab changes
  useEffect(() => {
    if (!initialized) {return;}
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      updateSettings({ lastOpenDiagramId: activeTab.diagram_id });
    }
  }, [activeTabId, tabs, initialized]);

  const openDiagram = useCallback(async (diagramId: string) => {
    const diagram = await getDiagram(diagramId);
    if (!diagram) {return;}

    const tab: Tab = {
      id: `tab_${diagramId}`,
      diagram_id: diagramId,
      title: diagram.title,
      content: diagram.content,
      saved_content: diagram.content,
      is_dirty: false,
      themeId: diagram.themeId ?? extractThemeIdFromContent(diagram.content) ?? undefined,
    };

    setTabs(prev => {
      const existing = prev.find(t => t.diagram_id === diagramId);
      if (existing) {
        // Update existing tab with fresh content from IndexedDB
        setActiveTabId(existing.id);
        return prev.map(t => t.id === existing.id ? { ...tab, id: existing.id } : t);
      }
      // Add new tab
      setActiveTabId(tab.id);
      return [...prev, tab];
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      const updated = prev.filter(t => t.id !== tabId);
      setActiveTabId(cur => {
        if (cur !== tabId) {return cur;}
        return updated[idx]?.id ?? updated[idx - 1]?.id ?? null;
      });
      return updated;
    });
  }, []);

  const closeTabsByDiagramIds = useCallback((diagramIds: string[]) => {
    const idSet = new Set(diagramIds);
    setTabs(prev => {
      const removed = prev.some(t => idSet.has(t.diagram_id));
      if (!removed) return prev;
      const updated = prev.filter(t => !idSet.has(t.diagram_id));
      setActiveTabId(cur => {
        if (cur && !idSet.has(prev.find(t => t.id === cur)?.diagram_id ?? '')) {return cur;}
        if (updated.length > 0) return updated[0].id;
        return null;
      });
      return updated;
    });
  }, []);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    const themeFromContent = extractThemeIdFromContent(content);
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (!tab) return prev;

      // Persist to database in background immediately so it's not lost on tab switch
      updateDiagram(tab.diagram_id, { content, themeId: themeFromContent ?? tab.themeId })
        .catch(err => console.error('[useTabs] Auto-save failed:', err));

      return prev.map(t => {
        if (t.id !== tabId) return t;
        const updates: Partial<Tab> = { content, is_dirty: content !== t.saved_content };
        if (themeFromContent !== null) {
          updates.themeId = themeFromContent;
        }
        return { ...t, ...updates };
      });
    });
  }, []);

  const updateTabTheme = useCallback((tabId: string, themeId: string | null) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, themeId: themeId ?? undefined } : t
    ));
  }, []);

  const saveTab = useCallback(async (tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (!tab) {return prev;}
      // Fire and forget - update will happen in background
      updateDiagram(tab.diagram_id, { content: tab.content, title: tab.title, themeId: tab.themeId })
        .catch(err => console.error('[useTabs] Failed to update diagram:', err));
      saveVersion(tab.diagram_id, tab.content)
        .catch(err => console.error('[useTabs] Failed to save version:', err));
      return prev.map(t => t.id === tabId ? { ...t, saved_content: t.content, is_dirty: false } : t);
    });
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  return { tabs, activeTabId, activeTab, setActiveTabId, openDiagram, closeTab, closeTabsByDiagramIds, updateTabContent, updateTabTheme, saveTab };
}
