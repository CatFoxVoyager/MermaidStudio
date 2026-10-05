import { Sun, Moon, Command, LayoutGrid as Layout, PanelLeft, GitBranch, HardDrive, Focus, Globe, FilePlus, Info, ScrollText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '@/constants/app';

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
  /** About modal (desktop top-bar parity with palette / mobile badge) */
  onOpenAbout?: () => void;
  /** Re-open the first-run welcome modal (release notes) */
  onOpenReleaseNotes?: () => void;
}

export function TopBar({
  theme, onToggleTheme, onOpenCommandPalette, onOpenTemplates, onNewDiagram,
  sidebarOpen, onToggleSidebar, onOpenBackup, onFocusMode, focusMode,
  language, onChangeLanguage, onOpenAbout, onOpenReleaseNotes,
}: Props) {
  const { t } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Dismiss the language menu on Escape or any click outside it — previously
  // it had no dismissal path at all (critique iter-1, heuristic 3 / Sam).
  useEffect(() => {
    if (!showLangMenu) {return;}
    function onPointerDown(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {setShowLangMenu(false);}
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showLangMenu]);

  return (
    <header className="flex items-center justify-between h-11 px-3 shrink-0 border-b z-20"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-2.5">
        <button
          data-testid="sidebar-toggle"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }} title={t('header.toggleSidebar')} aria-label={t('header.toggleSidebar')}>
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
          <h1 className="text-sm font-semibold tracking-tight flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
            Mermaid<span style={{ color: 'var(--accent)' }}>Studio</span>{' '}
            {onOpenAbout ? (
              <button
                data-testid="topbar-about-badge"
                onClick={onOpenAbout}
                title={t('about.title')}
                aria-label={t('about.title')}
                className="text-xs font-normal rounded px-1 py-0.5 transition-colors hover:bg-[var(--hover)] active:bg-[var(--hover)] cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}>
                v{APP_VERSION}
              </button>
            ) : (
              <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>v{APP_VERSION}</span>
            )}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onFocusMode}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: focusMode ? 'var(--accent)' : 'var(--text-secondary)', background: focusMode ? 'var(--accent-dim)' : undefined }}
          title={t('header.focusMode')} aria-label={t('header.focusMode')}>
          <Focus size={14} />
        </button>
        <button
          data-testid="palette-button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('header.commandPalette')}>
          <Command size={13} />
        </button>
        {onNewDiagram && (
          <button
            data-testid="new-diagram-button"
            onClick={onNewDiagram}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-secondary)' }}>
            <FilePlus size={13} />
            {t('header.newDiagram')}
          </button>
        )}
        <button
          data-testid="templates-button"
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }}>
          <Layout size={13} />
          {t('header.templates')}
        </button>
        <button
          data-testid="backup-button"
          onClick={onOpenBackup}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }}>
          <HardDrive size={13} />
          {t('header.backupImport')}
        </button>
        {onOpenAbout && (
          <button
            data-testid="topbar-about"
            onClick={onOpenAbout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-secondary)' }}
            title={t('about.title')}>
            <Info size={13} />
            {t('header.about')}
          </button>
        )}
        {onOpenReleaseNotes && (
          <button
            data-testid="topbar-release-notes"
            onClick={onOpenReleaseNotes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-secondary)' }}
            title={t('header.releaseNotes')}>
            <ScrollText size={13} />
            {t('header.releaseNotes')}
          </button>
        )}
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />
        <div className="relative" ref={langMenuRef}>
          <button onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={t('header.changeLanguage')}
            aria-haspopup="menu"
            aria-expanded={showLangMenu}
            title={language === 'en' ? 'Français' : 'English'}>
            <Globe size={14} />
          </button>
          {showLangMenu && (
            <div role="menu" className="absolute right-0 mt-1 w-24 rounded-lg shadow-lg z-50"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
              <button role="menuitemradio" aria-checked={language === 'en'} onClick={() => { onChangeLanguage('en'); setShowLangMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--hover)] rounded-t-lg transition-colors"
                style={{ color: language === 'en' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                English
              </button>
              <button role="menuitemradio" aria-checked={language === 'fr'} onClick={() => { onChangeLanguage('fr'); setShowLangMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--hover)] rounded-b-lg transition-colors"
                style={{ color: language === 'fr' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                Français
              </button>
            </div>
          )}
        </div>
        <button
          data-testid="theme-toggle"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('header.toggleTheme')}
          title={t('header.toggleTheme')}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
