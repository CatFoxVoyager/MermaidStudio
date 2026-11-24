import { Check, Scaling } from 'lucide-react';
import { type ReactElement, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type UIScaleApi, useUIScaleContext, useUIScaleTriggerFocusTick } from '@/hooks/useUIScale';
import { scaleShortcutModifier, UI_SCALE_STEPS } from '@/utils/uiScale';

function UIScaleMenuInner({ ctx }: { ctx: UIScaleApi }): ReactElement {
  const { t } = useTranslation();
  const { pref, scale, autoScale, setPref, menuOpen, openMenu, closeMenu } = ctx;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const focusTriggerTick = useUIScaleTriggerFocusTick();
  const handledFocusTickRef = useRef(focusTriggerTick);

  useEffect(() => {
    if (focusTriggerTick !== handledFocusTickRef.current) {
      handledFocusTickRef.current = focusTriggerTick;
      triggerRef.current?.focus();
    }
  }, [focusTriggerTick]);

  useEffect(() => {
    if (!menuOpen) return;

    function onOutsideDown(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMenu();
        if (containerRef.current?.contains(document.activeElement)) {
          triggerRef.current?.focus();
        }
      }
    }

    document.addEventListener('pointerdown', onOutsideDown);
    document.addEventListener('mousedown', onOutsideDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onOutsideDown);
      document.removeEventListener('mousedown', onOutsideDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const percent = Math.round(scale * 100);
  const label = t('uiScale.label', { percent });
  const mod =
    scaleShortcutModifier(typeof navigator === 'undefined' ? '' : navigator.userAgent) === 'ctrl'
      ? 'Ctrl'
      : 'Alt';

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        data-testid="ui-scale-button"
        onClick={() => (menuOpen ? closeMenu() : openMenu())}
        className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors hover:bg-[var(--hover)]"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={label}
      >
        <Scaling size={14} aria-hidden="true" />
        <span className="tabular-nums">{percent} %</span>
      </button>

      {menuOpen && (
        <div
          data-testid="ui-scale-menu"
          role="menu"
          aria-label={t('uiScale.title')}
          className="absolute right-0 mt-1 w-48 max-h-[calc(80vh/var(--ui-scale))] overflow-y-auto rounded-lg shadow-lg z-50 py-1"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            data-testid="ui-scale-option-auto"
            role="menuitemradio"
            aria-checked={pref === 'auto'}
            onClick={() => {
              setPref('auto');
              closeMenu();
            }}
            className="w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] transition-colors"
            style={{ color: pref === 'auto' ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <span className="flex flex-col min-w-0">
              <span className="font-medium">{t('uiScale.auto')}</span>
              {autoScale !== null && (
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {t('uiScale.autoHint', { percent: Math.round(autoScale * 100) })}
                </span>
              )}
            </span>
            {pref === 'auto' && <Check size={13} className="shrink-0" aria-hidden="true" />}
          </button>

          <div className="my-1 h-px" style={{ background: 'var(--border-subtle)' }} />

          {UI_SCALE_STEPS.map(step => {
            const stepPercent = Math.round(step * 100);
            const selected = pref === step;
            return (
              <button
                key={stepPercent}
                type="button"
                data-testid={`ui-scale-option-${stepPercent}`}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setPref(step);
                  closeMenu();
                }}
                className="w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 text-xs tabular-nums hover:bg-[var(--hover)] transition-colors"
                style={{ color: selected ? 'var(--accent)' : 'var(--text-secondary)' }}
              >
                <span>{stepPercent} %</span>
                {selected && <Check size={13} className="shrink-0" aria-hidden="true" />}
              </button>
            );
          })}

          <div
            className="mt-1 pt-1.5 pb-1 px-3 border-t text-[11px]"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-tertiary)',
            }}
          >
            {t('uiScale.shortcuts', { mod })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Top-bar control for the global interface scale. Renders nothing when used
 * outside `UIScaleProvider`.
 */
export function UIScaleMenu(): ReactElement | null {
  const ctx = useUIScaleContext();
  if (!ctx) return null;
  return <UIScaleMenuInner ctx={ctx} />;
}
