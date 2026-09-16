import { useState, useCallback, useEffect, useRef } from 'react';
import type { Tab } from '@/types';
import { getDiagram, getDiagrams, updateDiagram, saveVersion, getSettings, updateSettings } from '@/services/storage/database';
import { extractThemeIdFromContent } from '@/constants/themeDerivation';

// Auto-save fires once the user pauses typing. Persisting on every keystroke
// re-serialized the whole IndexedDB record for each character typed
// (audit constat 4).
const AUTO_SAVE_DELAY_MS = 1000;

/** A debounced save waiting to fire, keyed by diagram id. */
interface PendingAutoSave {
  content: string;
  themeId?: string;
  timer: number;
}

export interface UseTabsOptions {
  /**
   * Called when persisting a diagram fails (debounced auto-save or manual
   * save), so the UI can surface it — the hook itself only logs.
   */
  onSaveError?: (diagramTitle: string, error: unknown) => void;
}

export function useTabs({ onSaveError }: UseTabsOptions = {}) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Write-through mirror of `tabs` so callbacks can compute the next state
  // and persist OUTSIDE setTabs updaters — updaters must stay pure (an
  // impure updater fired every save twice under StrictMode, constat 4).
  const tabsRef = useRef<Tab[]>([]);
  const pendingSavesRef = useRef(new Map<string, PendingAutoSave>());

  // Latest-ref for the error callback so timers capture a stable reference.
  // Assigned in an effect — updating a ref during render is a React anti-
  // pattern (react-hooks/refs).
  const onSaveErrorRef = useRef(onSaveError);
  useEffect(() => {
    onSaveErrorRef.current = onSaveError;
  }, [onSaveError]);

  const reportSaveError = useCallback((diagramId: string, err: unknown) => {
    console.error('[useTabs] Auto-save failed:', err);
    const title = tabsRef.current.find(t => t.diagram_id === diagramId)?.title ?? diagramId;
    onSaveErrorRef.current?.(title, err);
  }, []);

  const cancelPendingSave = useCallback((diagramId: string) => {
    const pending = pendingSavesRef.current.get(diagramId);
    if (!pending) {return;}
    window.clearTimeout(pending.timer);
    pendingSavesRef.current.delete(diagramId);
  }, []);

  const scheduleAutoSave = useCallback(
    (diagramId: string, content: string, themeId?: string) => {
      cancelPendingSave(diagramId);
      const timer = window.setTimeout(() => {
        pendingSavesRef.current.delete(diagramId);
        updateDiagram(diagramId, { content, themeId })
          .catch(err => reportSaveError(diagramId, err));
      }, AUTO_SAVE_DELAY_MS);
      pendingSavesRef.current.set(diagramId, { content, themeId, timer });
    },
    [cancelPendingSave, reportSaveError]
  );

  const flushPendingSave = useCallback(
    (diagramId: string) => {
      const pending = pendingSavesRef.current.get(diagramId);
      if (!pending) {return;}
      cancelPendingSave(diagramId);
      updateDiagram(diagramId, { content: pending.content, themeId: pending.themeId })
        .catch(err => reportSaveError(diagramId, err));
    },
    [cancelPendingSave, reportSaveError]
  );

  // Unmount: flush instead of dropping — a pending debounce cancelled here
  // would silently lose the user's last second of typing.
  useEffect(() => {
    const pending = pendingSavesRef.current;
    return () => {
      pending.forEach((p, diagramId) => {
        window.clearTimeout(p.timer);
        updateDiagram(diagramId, { content: p.content, themeId: p.themeId })
          .catch(err => reportSaveError(diagramId, err));
      });
      pending.clear();
    };
  }, [reportSaveError]);

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
          tabsRef.current = [tab];
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

    const existing = tabsRef.current.find(t => t.diagram_id === diagramId);
    if (existing) {
      // Update existing tab with fresh content from IndexedDB
      tabsRef.current = tabsRef.current.map(t => (t.id === existing.id ? { ...tab, id: existing.id } : t));
      setTabs(tabsRef.current);
      setActiveTabId(existing.id);
    } else {
      tabsRef.current = [...tabsRef.current, tab];
      setTabs(tabsRef.current);
      setActiveTabId(tab.id);
    }
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      const prev = tabsRef.current;
      const idx = prev.findIndex(t => t.id === tabId);
      if (idx === -1) {return;}

      const updated = prev.filter(t => t.id !== tabId);
      tabsRef.current = updated;
      setTabs(updated);
      // Closing a tab must not lose the last second of typing.
      flushPendingSave(prev[idx].diagram_id);
      setActiveTabId(cur => {
        if (cur !== tabId) {return cur;}
        return updated[idx]?.id ?? updated[idx - 1]?.id ?? null;
      });
    },
    [flushPendingSave]
  );

  const closeTabsByDiagramIds = useCallback(
    (diagramIds: string[]) => {
      const idSet = new Set(diagramIds);
      const prev = tabsRef.current;
      if (!prev.some(t => idSet.has(t.diagram_id))) {return;}

      const updated = prev.filter(t => !idSet.has(t.diagram_id));
      tabsRef.current = updated;
      setTabs(updated);
      prev.forEach(t => {
        if (idSet.has(t.diagram_id)) {flushPendingSave(t.diagram_id);}
      });
      setActiveTabId(cur => {
        if (cur && !idSet.has(prev.find(t => t.id === cur)?.diagram_id ?? '')) {return cur;}
        if (updated.length > 0) {return updated[0].id;}
        return null;
      });
    },
    [flushPendingSave]
  );

  const updateTabContent = useCallback(
    (tabId: string, content: string) => {
      const themeFromContent = extractThemeIdFromContent(content);
      const tab = tabsRef.current.find(t => t.id === tabId);
      if (!tab) {return;}

      const updates: Partial<Tab> = { content, is_dirty: content !== tab.saved_content };
      if (themeFromContent !== null) {
        updates.themeId = themeFromContent;
      }
      tabsRef.current = tabsRef.current.map(t => (t.id === tabId ? { ...t, ...updates } : t));
      setTabs(tabsRef.current);

      scheduleAutoSave(tab.diagram_id, content, themeFromContent ?? tab.themeId);
    },
    [scheduleAutoSave]
  );

  const updateTabTheme = useCallback((tabId: string, themeId: string | null) => {
    tabsRef.current = tabsRef.current.map(t =>
      t.id === tabId ? { ...t, themeId: themeId ?? undefined } : t
    );
    setTabs(tabsRef.current);
  }, []);

  const saveTab = useCallback(
    async (tabId: string) => {
      const tab = tabsRef.current.find(t => t.id === tabId);
      if (!tab) {return;}

      // The manual save covers the pending debounce — cancel it or the
      // auto-save would duplicate the write a second later.
      cancelPendingSave(tab.diagram_id);

      tabsRef.current = tabsRef.current.map(t =>
        t.id === tabId ? { ...t, saved_content: t.content, is_dirty: false } : t
      );
      setTabs(tabsRef.current);

      try {
        await updateDiagram(tab.diagram_id, { content: tab.content, title: tab.title, themeId: tab.themeId });
        await saveVersion(tab.diagram_id, tab.content);
      } catch (err) {
        console.error('[useTabs] Failed to save diagram:', err);
        onSaveErrorRef.current?.(tab.title, err);
      }
    },
    [cancelPendingSave]
  );

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null;

  return { tabs, activeTabId, activeTab, setActiveTabId, openDiagram, closeTab, closeTabsByDiagramIds, updateTabContent, updateTabTheme, saveTab };
}
