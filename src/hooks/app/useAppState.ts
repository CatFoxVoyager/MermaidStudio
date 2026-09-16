import { useState, useEffect, useCallback } from 'react';
import { getDiagrams } from '@/services/storage/database';
import { initMermaid } from '@/lib/mermaid/core';
import { useTheme, useTabs, useLanguage } from '@/hooks';
import type { UseTabsOptions } from '@/hooks/useTabs';
import type { Diagram } from '@/types';

// Exported so hooks/index.ts can re-export them (the repaired type-check
// gate flagged the local-only declarations as unre-exportable, TS2459).
export interface AppState {
  sidebarOpen: boolean;
  focusMode: boolean;
  renderTimeMs: number | null;
  refreshKey: number;
  aiSettingsKey: number;
  diagrams: Diagram[];
}

export interface AppActions {
  /* Updater form: callers (useAppShortcuts, AppLayout's onToggleSidebar)
     toggle via setSidebarOpen(v => !v), which the raw useState setter
     supports. */
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setFocusMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setRenderTimeMs: (time: number | null) => void;
  refresh: () => void;
  setAiSettingsKey: (key: number | ((prev: number) => number)) => void;
}

export interface UseAppStateOptions {
  /** Surfaced as a toast when persisting a diagram fails (audit constat 4). */
  onSaveError?: UseTabsOptions['onSaveError'];
}

export function useAppState(
  { onSaveError }: UseAppStateOptions = {}
): AppState & AppActions & ReturnType<typeof useTheme> & ReturnType<typeof useTabs> & ReturnType<typeof useLanguage> {
  const themeState = useTheme();
  const tabsState = useTabs({ onSaveError });
  const languageState = useLanguage();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [renderTimeMs, setRenderTimeMs] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiSettingsKey, setAiSettingsKey] = useState(0);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);

  // Initialize Mermaid with theme
  useEffect(() => {
    initMermaid(themeState.theme);
  }, [themeState.theme]);

  // Load the diagram list on mount and after every refresh() — the command
  // palette reads it whenever it opens. Gating the load on a palette flag
  // left `diagrams` permanently empty: App never had a truthy flag to pass
  // (audit constat 1), so the palette's "diagrams" category stayed blank.
  useEffect(() => {
    getDiagrams().then(setDiagrams);
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return {
    ...themeState,
    ...tabsState,
    ...languageState,
    sidebarOpen,
    focusMode,
    renderTimeMs,
    refreshKey,
    aiSettingsKey,
    diagrams,
    setSidebarOpen,
    setFocusMode,
    setRenderTimeMs,
    refresh,
    setAiSettingsKey,
  };
}
