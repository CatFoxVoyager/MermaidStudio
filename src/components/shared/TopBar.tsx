import { Sun, Moon, Command, LayoutGrid as Layout, PanelLeft, GitBranch, HelpCircle, HardDrive, Focus, Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onOpenTemplates: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenHelp: () => void;
  onOpenBackup: () => void;
  onFocusMode: () => void;
  focusMode: boolean;
  language: 'en' | 'fr';
  onChangeLanguage: (lang: 'en' | 'fr') => void;
}

export function TopBar({
  theme, onToggleTheme, onOpenCommandPalette, onOpenTemplates,
  sidebarOpen, onToggleSidebar, onOpenHelp, onOpenBackup, onFocusMode, focusMode,
  language, onChangeLanguage,
}: Props) {
  const { t } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="flex items-center justify-between h-11 px-3 flex-shrink-0 border-b z-20"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-2.5">
        <button onClick={onToggleSidebar}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }} title={t('header.toggleSidebar')}>
          <PanelLeft size={15} className={`transition-transform duration-200 ${sidebarOpen ? '' : 'scale-x-[-1]'}`} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <GitBranch size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mermaid<span style={{ color: 'var(--accent)' }}>Studio</span>
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
        <button onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}>
          <Layout size={13} />
          {t('header.templates')}
        </button>
        <button onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}>
          <Command size={13} />
          <kbd>Ctrl K</kbd>
        </button>
        <button onClick={onOpenBackup}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}
          title={t('header.backupImport')}>
          <HardDrive size={14} />
        </button>
        <button onClick={onOpenHelp}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/6"
          style={{ color: 'var(--text-secondary)' }}
          title={t('header.keyboardShortcuts')}>
          <HelpCircle size={14} />
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
        <button onClick={onToggleTheme}
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
