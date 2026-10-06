import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  /** Section header: rendered as a non-interactive label (a header was
   *  previously a button with a noop onClick — a dead control, iter-11). */
  header?: boolean;
  /** Checkbox semantics: when defined the item renders as a
   *  menuitemcheckbox with aria-checked (tag toggles, iter-14). */
  ariaState?: boolean;
}

interface Props {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
  /** Touch sizing: 44px rows (mobile reach — the only mobile path to these
   *  menus is this kebab; desktop keeps its compact density). */
  touch?: boolean;
}

export function ContextMenu({ items, x, y, onClose, touch = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rowHeight = touch ? 44 : 36;

  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) {onClose();} };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {onClose();} };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [onClose]);

  const ax = Math.min(x, window.innerWidth - 200);
  const ay = Math.min(y, window.innerHeight - items.length * rowHeight - 16);

  // Measured vertical clamp (iter-14 P2: the estimate ignored per-item
  // padding/dividers — the menu rendered 3px past the viewport bottom with
  // Delete hugging the screen edge). After first paint, if the panel
  // overflows, shift it up to fit with a 16px margin — enough clearance for
  // the iOS home-indicator gesture zone on fixed surfaces (iter-16 P1).
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) {return;}
    const h = el.offsetHeight;
    const overflow = ay + h - (window.innerHeight - 16);
    if (overflow > 0) {
      el.style.top = `${Math.max(8, ay - overflow)}px`;
    }
  }, [ay, items.length]);

  return (
    <div ref={el => { ref.current = el; panelRef.current = el; }} role="menu" aria-label={items.find(i => !i.header)?.label}
      className="fixed z-50 animate-fade-in min-w-[180px] rounded-xl overflow-hidden py-1.5 shadow-xl ring-1 ring-black/10 border"
      style={{ left: ax, top: ay, background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
      {items.map((item, i) => (
        <div key={i} role={item.header ? 'presentation' : 'none'}>
          {item.divider && <div className="my-1.5 mx-2 h-px" style={{ background: 'var(--border-subtle)' }} />}
          {item.header ? (
            <span
              className={`w-full flex items-center gap-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider select-none ${touch ? 'min-h-[36px]' : 'py-1'}`}
              style={{ color: 'var(--text-tertiary)' }}>
              {item.icon && <span className="w-4 shrink-0 opacity-60">{item.icon}</span>}
              {item.label}
            </span>
          ) : (
            <button
              role={item.ariaState !== undefined ? 'menuitemcheckbox' : 'menuitem'}
              aria-checked={item.ariaState}
              onClick={() => { item.onClick(); onClose(); }}
              className={`menu-item w-full flex items-center gap-2.5 px-3 text-sm transition-colors duration-100 active:bg-[var(--state-pressed)] ${touch ? 'min-h-[44px]' : 'py-1.5'}
                ${item.danger ? 'text-red-700 dark:text-red-400 hover:bg-red-500/10' : 'hover:bg-[var(--hover)] dark:hover:bg-[var(--hover)]'}`}
              style={item.danger ? {} : { color: 'var(--text-primary)' }}>
              {item.icon && <span className="w-4 shrink-0 opacity-60">{item.icon}</span>}
              {item.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
