import { useTranslation } from 'react-i18next';
import { FilePlus, Save, Menu } from 'lucide-react';
import { APP_VERSION } from '@/constants/app';

export interface MobileTopBarProps {
  onNewDiagram?: () => void;   // optional — if undefined, New button hidden (matches desktop TopBar pattern)
  onSave: () => void;          // primary Save action
  onOpenCommandPalette: () => void;  // overflow trigger — REUSES the existing TopBar/CommandPalette mechanism per D-01
}

export function MobileTopBar({
  onNewDiagram,
  onSave,
  onOpenCommandPalette,
}: MobileTopBarProps) {
  const { t } = useTranslation();

  return (
    <header
      className="flex h-[48px] items-center justify-between px-3 border-b bg-[var(--surface-raised)]"
      style={{ borderColor: 'var(--border-subtle)' }}
      data-testid="mobile-topbar"
      role="banner"
    >
      {/* Brand block - mirror desktop TopBar structure */}
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
          Mermaid<span style={{ color: 'var(--accent)' }}>Studio</span>{' '}
          <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
            v{APP_VERSION}
          </span>
        </h1>
      </div>

      {/* Actions cluster - primary actions + overflow trigger */}
      <div className="flex items-center gap-1">
        {onNewDiagram && (
          <button
            data-testid="mobile-topbar-new"
            onClick={onNewDiagram}
            className="p-3 rounded-lg transition-colors hover:bg-white/8 active:bg-white/15 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={t('header.newDiagram')}
            title={t('header.newDiagram')}
          >
            <FilePlus size={18} />
          </button>
        )}
        <button
          data-testid="mobile-topbar-save"
          onClick={onSave}
          className="p-3 rounded-lg transition-colors hover:bg-white/8 active:bg-white/15 min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('common.save')}
          title={t('common.save')}
        >
          <Save size={18} />
        </button>
        <button
          data-testid="mobile-topbar-overflow"
          onClick={onOpenCommandPalette}
          className="p-3 rounded-lg transition-colors hover:bg-white/8 active:bg-white/15 min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('header.commandPalette')}
          title={t('header.commandPalette')}
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}
