import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/services/storage/database';
import { initMermaid } from '@/lib/mermaid/core';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getSettings().then(settings => {
      setTheme(settings.theme);
      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized) {return;}
    const root = document.documentElement;
    if (theme === 'dark') {root.classList.add('dark');}
    else {root.classList.remove('dark');}
    initMermaid(theme);
    updateSettings({ theme });
  }, [theme, initialized]);

  return { theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
}
