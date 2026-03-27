import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/services/storage/database';
import { initMermaid, setDefaultTheme as setCoreDefaultTheme } from '@/lib/mermaid/core';
import { getThemeById } from '@/constants/themes';
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from '@/constants/themeDerivation';
import type { MermaidTheme } from '@/types';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [defaultTheme, setDefaultThemeState] = useState<MermaidTheme | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getSettings().then(settings => {
      setTheme(settings.theme);

      // Load saved default theme preference
      try {
        const savedThemeId = localStorage.getItem('mermaid-studio-default-theme');
        if (savedThemeId) {
          const theme = getThemeById(savedThemeId);
          if (theme) setDefaultThemeState(theme);
        }
      } catch {
        // eslint-disable-line no-empty
        // localStorage may be unavailable in private browsing
      }

      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    const appTheme = defaultTheme ?? (theme === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME);
    initMermaid(theme, undefined, appTheme);

    updateSettings({ theme });
  }, [theme, initialized, defaultTheme]);

  const setDefaultTheme = (theme: MermaidTheme | null) => {
    setDefaultThemeState(theme);
    setCoreDefaultTheme(theme);
    try {
      if (theme) {
        localStorage.setItem('mermaid-studio-default-theme', theme.id);
      } else {
        localStorage.removeItem('mermaid-studio-default-theme');
      }
    } catch {
      // eslint-disable-line no-empty
      // localStorage may be unavailable in private browsing
    }
  };

  return {
    theme,
    defaultTheme,
    setDefaultTheme,
    toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
  };
}
