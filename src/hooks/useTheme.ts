import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/services/storage/database';
import { initMermaid, setDefaultTheme as setCoreDefaultTheme } from '@/lib/mermaid/core';
import { getThemeById } from '@/constants/themes';
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from '@/constants/themeDerivation';
import type { MermaidTheme } from '@/types';
import { logger, storage } from '@/utils/logger';

const log = logger.scope('useTheme');

const DEFAULT_THEME_KEY = 'mermaid-studio-default-theme';

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

    const appTheme = defaultTheme ?? (theme === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME);
    initMermaid(theme, undefined, appTheme);

    updateSettings({ theme });
  }, [theme, initialized, defaultTheme]);

  const setDefaultTheme = (theme: MermaidTheme | null) => {
    setDefaultThemeState(theme);
    setCoreDefaultTheme(theme);
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
    toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
  };
}
