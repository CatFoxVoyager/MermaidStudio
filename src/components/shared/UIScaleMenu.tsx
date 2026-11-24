import { Check, Scaling } from 'lucide-react';
import { type ReactElement, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type UIScaleApi, useUIScaleContext, useUIScaleTriggerFocusTick } from '@/hooks/useUIScale';
import {
  scaleShortcutModifier,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  UI_SCALE_STEPS,
} from '@/utils/uiScale';

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
          className="absolute right-0 mt-1 w-56 max-h-[calc(80vh/var(--ui-scale))] overflow-y-auto rounded-lg shadow-lg z-50 py-1"
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
              triggerRef.current?.focus();
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

          <div
            className="my-1 pt-2 pb-1.5 px-3 border-t space-y-1.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: 'var(--text-tertiary)' }}>{t('uiScale.sliderLabel')}</span>
              <span
                className="font-medium tabular-nums"
                style={{ color: pref === 'auto' ? 'var(--text-secondary)' : 'var(--accent)' }}
              >
                {percent} %
              </span>
            </div>
            <input
              type="range"
              data-testid="ui-scale-slider"
              min={Math.round(UI_SCALE_MIN * 100)}
              max={Math.round(UI_SCALE_MAX * 100)}
              step={1}
              value={percent}
              aria-label={t('uiScale.sliderLabel')}
              aria-valuetext={`${percent} %`}
              onChange={e => setPref(Number(e.target.value) / 100)}
              className="w-full h-1.5 cursor-pointer accent-[var(--accent)]"
            />
            <div
              className="flex justify-between text-[10px] tabular-nums"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <span>{Math.round(UI_SCALE_MIN * 100)} %</span>
              <span>100 %</span>
              <span>{Math.round(UI_SCALE_MAX * 100)} %</span>
            </div>
          </div>

          <div
            className="grid grid-cols-3 gap-1 px-2 py-1.5 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
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
                    triggerRef.current?.focus();
                  }}
                  className="flex items-center justify-center rounded-md px-1.5 py-1 text-xs tabular-nums transition-colors hover:bg-[var(--hover)]"
                  style={{
                    background: selected ? 'var(--accent-dim)' : 'transparent',
                    color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {stepPercent} %
                </button>
              );
            })}
          </div>

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
