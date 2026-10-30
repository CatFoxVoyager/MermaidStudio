import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/services/storage/database';
import { getThemeById } from '@/constants/themes';
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from '@/constants/themeDerivation';
import type { MermaidTheme } from '@/types';
import { logger, storage } from '@/utils/logger';

const log = logger.scope('useTheme');

const DEFAULT_THEME_KEY = 'mermaid-studio-default-theme';

// Browser chrome (URL bar, Android edge-to-edge gesture zone) is painted from
// theme-color, not from the page: a stale color shows as a mismatched band
// around the viewport on mobile. Keep it on the app's base surface.
const THEME_CHROME_COLORS = { light: '#fafaf9', dark: '#0d1117' } as const;

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [defaultTheme, setDefaultThemeState] = useState<MermaidTheme | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getSettings().then(settings => {
      setTheme(settings.theme);

      // Load saved default theme preference using storage abstraction
      const savedThemeId = storage.getItem(DEFAULT_THEME_KEY);
      if (savedThemeId) {
        const theme = getThemeById(savedThemeId);
        if (theme) setDefaultThemeState(theme);
      }

      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach(meta => meta.setAttribute('content', THEME_CHROME_COLORS[theme]));

    const appTheme = defaultTheme ?? (theme === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME);
    // Dynamic import (29-02, PERF-01): the boot chain must not statically
    // reach the mermaid runtime. Immediate (not idle-gated) — renderDiagram
    // re-runs doInit per call, so ordering with useAppState's init effect
    // stays tolerant. Same specifier as every other consumer, so core.ts's
    // theme singletons remain one shared instance.
    let cancelled = false;
    import('@/lib/mermaid/core').then(({ initMermaid }) => {
      if (!cancelled) initMermaid(theme, undefined, appTheme);
    });

    updateSettings({ theme });
    return () => {
      cancelled = true;
    };
  }, [theme, initialized, defaultTheme]);

  const setDefaultTheme = (theme: MermaidTheme | null) => {
    setDefaultThemeState(theme);
    // Core theme state syncs via dynamic import (29-02, PERF-01) — by the
    // time a user picks a theme the boot effect has already loaded the
    // module, so this resolves in a microtask; renderDiagram re-applies
    // init per call, making the async set order-tolerant.
    import('@/lib/mermaid/core').then(({ setDefaultTheme: setCoreDefaultTheme }) => {
      setCoreDefaultTheme(theme);
    });
    // Use storage abstraction - handles errors automatically
    if (theme) {
      storage.setItem(DEFAULT_THEME_KEY, theme.id);
    } else {
      storage.removeItem(DEFAULT_THEME_KEY);
    }
  };

  return {
    theme,
    defaultTheme,
    setDefaultTheme,
    toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
  };
}
