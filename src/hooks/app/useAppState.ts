import { useState, useEffect, useCallback } from 'react';
import { getDiagrams } from '@/services/storage/database';
import { initMermaid } from '@/lib/mermaid/core';
import { useTheme, useTabs, useLanguage } from '@/hooks';

interface AppState {
  sidebarOpen: boolean;
  focusMode: boolean;
  renderTimeMs: number | null;
  refreshKey: number;
  aiSettingsKey: number;
  diagrams: unknown[];
}

interface AppActions {
  setSidebarOpen: (open: boolean) => void;
  setFocusMode: (focus: boolean) => void;
  setRenderTimeMs: (time: number | null) => void;
  refresh: () => void;
  setAiSettingsKey: (key: number | ((prev: number) => number)) => void;
}

export function useAppState(showPalette: boolean): AppState & AppActions & ReturnType<typeof useTheme> & ReturnType<typeof useTabs> & ReturnType<typeof useLanguage> {
  const themeState = useTheme();
  const tabsState = useTabs();
  const languageState = useLanguage();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [renderTimeMs, setRenderTimeMs] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiSettingsKey, setAiSettingsKey] = useState(0);
  const [diagrams, setDiagrams] = useState<unknown[]>([]);

  // Initialize Mermaid with theme
  useEffect(() => {
    initMermaid(themeState.theme);
  }, [themeState.theme]);

  // Load diagrams when palette is shown
  useEffect(() => {
    if (showPalette) {
      getDiagrams().then(setDiagrams);
    }
  }, [showPalette, refreshKey]);

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
