import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Download, Sun, Menu, Undo2, Redo2 } from 'lucide-react';
import { APP_VERSION } from '@/constants/app';
import { undoInView, redoInView } from '@/lib/editor/historyActions';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';

export interface MobileTopBarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave: () => void;
  onExport?: () => void;
  onToggleTheme?: () => void;
  onOpenCommandPalette: () => void;
  onOpenMenu?: () => void;
  onOpenAbout?: () => void;
  /** Drives the Save button's dirty state (amber dot + enabled), matching
   *  the desktop WorkspacePanel contract (disabled when clean). */
  isDirty?: boolean;
  /** ISO timestamp of the last real persist (autosave flush included).
   *  is_dirty means "differs from last checkpoint" and stays true across
   *  autosaves by design, so the visible saved-beat keys off this — the
   *  only signal that actually fires when a persist lands (iter-32 P2). */
  lastSavedAt?: string;
  /** True while the Files screen is the active destination: undo/redo act
   *  on the hidden editor and read as no-ops there, so the buttons disable
   *  instead of spending two scarce slots on invisible actions (iter-9). */
  historyUnavailable?: boolean;
  /** Active diagram name — the h1 shows it while editing (iter-14 P1: no
   *  editor surface named the open document); falls back to the wordmark
   *  on the Files screen. */
}

export function MobileTopBar({
  onUndo,
  onRedo,
  onSave,
  onExport,
  onToggleTheme,
  onOpenCommandPalette,
  onOpenMenu,
  onOpenAbout,
  isDirty = false,
  lastSavedAt,
  historyUnavailable = false,
}: MobileTopBarProps) {
  const { t } = useTranslation();
  // Shared focus-ring recipe (iter-9: the local copy had drifted — no
  // ring-offset, different accent form — two ring idioms on one bar).

  // Autosave is real (useTabs debounced write) but on mobile its only
  // visible signal was a 6px amber dot on a disabled button — the "saved"
  // beat lived in aria-label/title, which touch never shows (iter-32 P2).
  // A brief accent flash in the title slot fires each time a persist lands
  // (lastSavedAt changes): the reassurance moment exists visibly, without a
  // toast system and without stealing a topbar slot. The first value is the
  // restore-time timestamp, not a persist this session — skip it.
  const [savedFlash, setSavedFlash] = useState(false);
  const prevSavedAtRef = useRef<string | undefined>(lastSavedAt);
  // The flash only makes sense after the user has actually edited: opening a
  // diagram fires creation + initial autosave persists, and without this
  // guard the second boot persist showed a ghost "✓ Saved" on Files with no
  // user action (it33-A P3-3).
  const everDirtyRef = useRef(isDirty);
  useEffect(() => {
    if (isDirty) {everDirtyRef.current = true;}
  }, [isDirty]);
  useEffect(() => {
    const prev = prevSavedAtRef.current;
    prevSavedAtRef.current = lastSavedAt;
    if (lastSavedAt && prev && lastSavedAt !== prev && everDirtyRef.current) {
      setSavedFlash(true);
      const timer = window.setTimeout(() => setSavedFlash(false), 1500);
      return () => window.clearTimeout(timer);
    }
  }, [lastSavedAt]);

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
      return;
    }
    undoInView();
  };

  const handleRedo = () => {
    if (onRedo) {
      onRedo();
      return;
    }
    redoInView();
  };

  return (
    <header
      className="flex h-[56px] items-center justify-between border-b px-3 bg-[var(--surface-base)]"
      style={{ borderColor: 'var(--border-subtle)' }}
      data-testid="mobile-topbar"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--on-accent)' }} strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <path d="M7 10v4M7 14h10M17 14v-4" />
          </svg>
        </div>
        <h1
          className="flex min-w-0 items-center text-base font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {/* User decision 2026-10-06 (mirrored from the -app): the MS
              wordmark is PERMANENT in the brand block — the open document
              name lives in the Menu sheet context, not the brand slot. */}
          <span className="min-w-0 truncate" aria-label="MermaidStudio">
            M<span style={{ color: 'var(--accent)' }}>S</span>
          </span>
          {/* No !isDirty guard here: isDirty means "differs from last
              checkpoint" and legitimately stays true across autosaves —
              the flash reports the persist, the dot reports the checkpoint
              gap; both are true at once (iter-32 P2). */}
          {savedFlash && (
            <span role="status" className="shrink-0 whitespace-nowrap text-[11px] font-medium animate-fade-in"
              style={{ color: 'var(--accent)' }}>
              ✓ {t('toast.saved')}
            </span>
          )}
        </h1>
      </div>

      {/* gap-1.5 (6px): the ::before hit-stretch adds 2px per side, so 40px
          buttons need ≥46px pitch for a visible 2px gap between hit zones —
          gap-1 made them abut exactly (iter-13: mis-tap risk on
          Save/Export/Theme). The wordmark absorbs the extra width. */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          data-testid="mobile-topbar-undo"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleUndo}
          disabled={historyUnavailable}
          className={`relative rounded-[14px] transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] w-10 h-10 flex items-center justify-center before:absolute before:-inset-0.5 before:content-[''] disabled:cursor-default disabled:opacity-60 ${FOCUS_RING_CLASSES} ${historyUnavailable ? '' : 'hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)]'}`}
          style={{ color: historyUnavailable ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
          aria-label={t('shortcuts.undo', 'Undo')}
          title={t('shortcuts.undo', 'Undo')}
        >
          <Undo2 size={18} />
        </button>
        <button
          data-testid="mobile-topbar-redo"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleRedo}
          disabled={historyUnavailable}
          className={`relative rounded-[14px] transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] w-10 h-10 flex items-center justify-center before:absolute before:-inset-0.5 before:content-[''] disabled:cursor-default disabled:opacity-60 ${FOCUS_RING_CLASSES} ${historyUnavailable ? '' : 'hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)]'}`}
          style={{ color: historyUnavailable ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
          aria-label={t('shortcuts.redo', 'Redo')}
          title={t('shortcuts.redo', 'Redo')}
        >
          <Redo2 size={18} />
        </button>

        <button
          data-testid="mobile-topbar-save"
          onClick={onSave}
          disabled={!isDirty}
          className={`relative rounded-[14px] transition-colors w-10 h-10 flex items-center justify-center before:absolute before:-inset-0.5 before:content-[''] disabled:opacity-60 ${FOCUS_RING_CLASSES} ${isDirty ? 'hover:bg-[var(--accent-dim)] active:bg-[var(--state-pressed)]' : 'cursor-default'}`}
          style={isDirty
            ? { color: 'var(--accent)', background: 'var(--accent-dim)' }
            : { color: 'var(--text-tertiary)' }}
          aria-label={isDirty ? `${t('common.save')} — ${t('status.editedAutosave')}` : t('common.save')}
          title={isDirty ? `${t('common.save')} — ${t('status.editedAutosave')}` : t('common.save')}
        >
          <Save size={18} />
          {/* Same amber dirty dot the desktop TabBar/WorkspacePanel render —
               mobile previously had NO save-state signal anywhere (critique
               iter-7, heuristic 1: score 1/4). */}
          {isDirty && (
            <span
              aria-hidden="true"
              data-testid="mobile-topbar-dirty-dot"
              className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
            />
          )}
        </button>
        <button
          data-testid="mobile-topbar-export"
          onClick={onExport}
          className={`relative rounded-[14px] transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] w-10 h-10 flex items-center justify-center before:absolute before:-inset-0.5 before:content-[''] ${FOCUS_RING_CLASSES}`}
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('common.export')}
          title={t('common.export')}
        >
          <Download size={18} />
        </button>
        <button
          data-testid="mobile-topbar-theme"
          onClick={onToggleTheme || onOpenAbout} 
          className={`relative rounded-[14px] transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] w-10 h-10 flex items-center justify-center before:absolute before:-inset-0.5 before:content-[''] ${FOCUS_RING_CLASSES}`}
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('common.theme', 'Theme')}
          title={t('common.theme', 'Theme')}
        >
          <Sun size={18} />
        </button>
        <button
          data-testid="mobile-topbar-overflow"
          onClick={onOpenMenu || onOpenCommandPalette}
          className={`relative rounded-[14px] transition-colors hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)] w-10 h-10 flex items-center justify-center before:absolute before:-inset-0.5 before:content-[''] ${FOCUS_RING_CLASSES}`}
          style={{ color: 'var(--text-secondary)' }}
          /* Accessible name fixed (critique iter-7): this opens the Menu
             sheet, not the command palette — "Commands" was a lie read by
             screen readers. */
          aria-label={t('menu.title', 'Menu')}
          title={t('menu.title', 'Menu')}
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}
