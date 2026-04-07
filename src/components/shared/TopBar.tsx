import { Sun, Moon, Command, LayoutGrid as Layout, PanelLeft, GitBranch, HardDrive, Focus, Globe, FilePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onOpenTemplates: () => void;
  onNewDiagram?: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenBackup: () => void;
  onFocusMode: () => void;
  focusMode: boolean;
  language: 'en' | 'fr';
  onChangeLanguage: (lang: 'en' | 'fr') => void;
}

export function TopBar({
  theme, onToggleTheme, onOpenCommandPalette, onOpenTemplates, onNewDiagram,
  sidebarOpen, onToggleSidebar, onOpenBackup, onFocusMode, focusMode,
  language, onChangeLanguage,
}: Props) {
  const { t } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="flex items-center justify-between h-11 px-3 shrink-0 border-b z-20"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-2.5">
        <button
          data-testid="sidebar-toggle"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }} title={t('header.toggleSidebar')}>
          <PanelLeft size={15} className={`transition-transform duration-200 ${sidebarOpen ? '' : 'scale-x-[-1]'}`} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <path d="M7 10v4M7 14h10M17 14v-4" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mermaid<span style={{ color: 'var(--accent)' }}>Studio</span> <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>v0.4.1</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onFocusMode}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: focusMode ? 'var(--accent)' : 'var(--text-secondary)', background: focusMode ? 'var(--accent-dim)' : undefined }}
          title={t('header.focusMode')}>
          <Focus size={14} />
        </button>
        <button
          data-testid="palette-button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('header.commandPalette')}>
          <Command size={13} />
        </button>
        {onNewDiagram && (
          <button
            data-testid="new-diagram-button"
            onClick={onNewDiagram}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6"
            style={{ color: 'var(--text-secondary)' }}>
            <FilePlus size={13} />
            {t('header.newDiagram')}
          </button>
        )}
        <button
          data-testid="templates-button"
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}>
          <Layout size={13} />
          {t('header.templates')}
        </button>
        <button
          data-testid="backup-button"
          onClick={onOpenBackup}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}>
          <HardDrive size={13} />
          {t('header.backupImport')}
        </button>
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />
        <div className="relative">
          <button onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/6"
            style={{ color: 'var(--text-secondary)' }}
            title={language === 'en' ? 'Français' : 'English'}>
            <Globe size={14} />
          </button>
          {showLangMenu && (
            <div className="absolute right-0 mt-1 w-24 rounded-lg shadow-lg z-50"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
              <button onClick={() => { onChangeLanguage('en'); setShowLangMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/6 rounded-t-lg transition-colors"
                style={{ color: language === 'en' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                English
              </button>
              <button onClick={() => { onChangeLanguage('fr'); setShowLangMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white/6 rounded-b-lg transition-colors"
                style={{ color: language === 'fr' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                Français
              </button>
            </div>
          )}
        </div>
        <button
          data-testid="theme-toggle"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Toggle theme"
          title={t('header.toggleTheme')}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
