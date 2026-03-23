import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface Props {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) {onClose();} };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {onClose();} };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [onClose]);

  const ax = Math.min(x, window.innerWidth - 200);
  const ay = Math.min(y, window.innerHeight - items.length * 36 - 16);

  return (
    <div ref={ref} className="fixed z-50 animate-fade-in min-w-[180px] rounded-xl overflow-hidden py-1.5 shadow-xl border"
      style={{ left: ax, top: ay, background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="my-1.5 mx-2 h-px" style={{ background: 'var(--border-subtle)' }} />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors duration-100
              ${item.danger ? 'text-red-400 hover:bg-red-400/10' : 'hover:bg-white/5 dark:hover:bg-white/5'}`}
            style={item.danger ? {} : { color: 'var(--text-primary)' }}>
            {item.icon && <span className="w-4 flex-shrink-0 opacity-60">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
