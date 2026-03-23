import { useState, useCallback } from 'react';
import type { Tab } from '@/types';
import { getDiagram, updateDiagram, saveVersion } from '@/services/storage/database';

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

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

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, content, is_dirty: content !== t.saved_content } : t
    ));
  }, []);

  const saveTab = useCallback(async (tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (!tab) {return prev;}
      // Fire and forget - update will happen in background
      updateDiagram(tab.diagram_id, { content: tab.content, title: tab.title });
      saveVersion(tab.diagram_id, tab.content);
      return prev.map(t => t.id === tabId ? { ...t, saved_content: t.content, is_dirty: false } : t);
    });
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  return { tabs, activeTabId, activeTab, setActiveTabId, openDiagram, closeTab, updateTabContent, saveTab };
}
