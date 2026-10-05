import { useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Tab } from '@/types';
import type { KeyboardEvent } from 'react';

interface Props {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const barRef = useRef<HTMLDivElement>(null);
  if (!tabs.length) {return null;}

  // Keyboard activation for tabs (critique iter-3 P2: tabs were ghosts to the
  // keyboard — closable but never activable). Arrow keys move roving focus
  // and select, per the WAI-ARIA tabs pattern.
  function onKeyDown(e: KeyboardEvent) {
    const targets = Array.from(barRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
    const current = targets.indexOf(document.activeElement as HTMLElement);
    if (current === -1) {return;}
    let next = -1;
    if (e.key === 'ArrowRight') {next = (current + 1) % targets.length;}
    else if (e.key === 'ArrowLeft') {next = (current - 1 + targets.length) % targets.length;}
    else if (e.key === 'Home') {next = 0;}
    else if (e.key === 'End') {next = targets.length - 1;}
    if (next >= 0) {
      e.preventDefault();
      targets[next].focus();
      const id = targets[next].getAttribute('data-tab-id');
      if (id) {onSelect(id);}
    }
  }

  return (
    <div ref={barRef} role="tablist" aria-label={t('editor.openDiagrams')} onKeyDown={onKeyDown}
      className="flex items-end h-9 overflow-x-auto shrink-0 border-b"
      style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            data-tab-id={tab.id}
            data-testid="tab"
            data-active={isActive ? 'true' : 'false'}
            onClick={() => onSelect(tab.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); onSelect(tab.id);} }}
            className="group relative flex items-center gap-2 px-3 h-full cursor-pointer select-none shrink-0 border-r transition-colors duration-100 focus-visible:outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-[var(--accent)]"
            style={{
              maxWidth: 200,
              borderColor: 'var(--border-subtle)',
              background: isActive ? 'var(--surface-raised)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: 'var(--accent)' }} />
            )}
            {/* Dirty dot lives on the tab body, NOT inside the close button —
                a dot inside "Close X" is a misleading affordance (iter-3). */}
            {tab.is_dirty && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title={t('status.editedAutosave')} />}
            <span className="text-xs truncate max-w-[130px]">{tab.title}</span>
            <button
              data-testid="close-tab"
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              className="shrink-0 p-0.5 rounded-sm transition-all duration-100 opacity-0 group-hover:opacity-60 group-focus-within:opacity-60 focus-visible:opacity-100 hover:opacity-100!"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label={t('editor.closeTab', { name: tab.title })}>
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
