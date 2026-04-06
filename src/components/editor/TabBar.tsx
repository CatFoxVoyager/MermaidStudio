import { X } from 'lucide-react';
import type { Tab } from '@/types';

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  if (!tabs.length) {return null;}
  return (
    <div className="flex items-end h-9 overflow-x-auto shrink-0 border-b"
      style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            data-testid="tab"
            data-active={isActive ? 'true' : 'false'}
            onClick={() => onSelect(tab.id)}
            className="group relative flex items-center gap-2 px-3 h-full cursor-pointer select-none shrink-0 border-r transition-colors duration-100"
            style={{
              maxWidth: 200,
              borderColor: 'var(--border-subtle)',
              background: isActive ? 'var(--surface-raised)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: 'var(--accent)' }} />
            )}
            <span className="text-xs truncate max-w-[130px]">{tab.title}</span>
            <button
              data-testid="close-tab"
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              className="shrink-0 p-0.5 rounded-sm transition-all duration-100 opacity-0 group-hover:opacity-60 hover:opacity-100!"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label={`Close ${tab.title}`}>
              {tab.is_dirty
                ? <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                : <X size={11} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
