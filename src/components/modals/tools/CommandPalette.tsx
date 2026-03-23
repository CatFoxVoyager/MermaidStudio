import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, FilePlus, FolderPlus, LayoutGrid as Layout, Clock, Download, Sun, Moon, Sparkles, Command, FileText, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

interface Cmd {
  id: string; label: string; description?: string;
  icon: React.ReactNode; category: string;
  shortcut?: string; action: () => void;
}

interface Props {
  onClose: () => void;
  onNewDiagram: () => void;
  onNewFolder: () => void;
  onOpenTemplates: () => void;
  onToggleHistory: () => void;
  onToggleAI: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
  theme: 'dark' | 'light';
  diagrams: { id: string; title: string }[];
  onOpenDiagram: (id: string) => void;
}

export function CommandPalette({
  onClose, onNewDiagram, onNewFolder, onOpenTemplates,
  onToggleHistory, onToggleAI, onToggleTheme, onExport,
  theme, diagrams, onOpenDiagram,
}: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commands: Cmd[] = [
    { id: 'new-d', label: t('commands.newDiagram'), description: 'Create a blank diagram', icon: <FilePlus size={14} />, category: t('commands.categoryActions'), shortcut: 'Ctrl+N', action: () => { onNewDiagram(); onClose(); } },
    { id: 'new-f', label: t('commands.newFolder'), description: 'Create a folder', icon: <FolderPlus size={14} />, category: t('commands.categoryActions'), action: () => { onNewFolder(); onClose(); } },
    { id: 'tmpl', label: t('commands.templateLibrary'), description: 'Browse diagram templates', icon: <Layout size={14} />, category: t('commands.categoryActions'), shortcut: 'Ctrl+T', action: () => { onOpenTemplates(); onClose(); } },
    { id: 'hist', label: t('commands.versionHistory'), description: 'View and restore versions', icon: <Clock size={14} />, category: t('commands.categoryActions'), action: () => { onToggleHistory(); onClose(); } },
    { id: 'ai', label: t('commands.aiAssistant'), description: 'Open AI diagram helper', icon: <Sparkles size={14} />, category: t('commands.categoryActions'), shortcut: 'Ctrl+/', action: () => { onToggleAI(); onClose(); } },
    { id: 'exp', label: t('commands.exportDiagram'), description: 'Export as SVG or share', icon: <Download size={14} />, category: t('commands.categoryActions'), shortcut: 'Ctrl+E', action: () => { onExport(); onClose(); } },
    { id: 'theme', label: `${theme === 'dark' ? 'Light' : 'Dark'} Mode`, description: 'Toggle color theme', icon: theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />, category: t('commands.categorySettings'), action: () => { onToggleTheme(); onClose(); } },
    ...diagrams.slice(0, 20).map(d => ({ id: `d_${d.id}`, label: d.title, description: 'Open diagram', icon: <FileText size={14} />, category: t('commands.categoryDiagrams'), action: () => { onOpenDiagram(d.id); onClose(); } })),
  ];

  const filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase()) || c.description?.toLowerCase().includes(q.toLowerCase())) : commands;

  const grouped = filtered.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c); return acc;
  }, {});
  const flat = Object.values(grouped).flat();

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${sel}"]`) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') {flat[sel]?.action();}
    else if (e.key === 'Escape') {onClose();}
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="" size="xl">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <Command size={15} style={{ color: 'var(--text-tertiary)' }} className="flex-shrink-0" />
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
          placeholder={t('commands.templateLibrary')}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }} />
        <Search size={13} style={{ color: 'var(--text-tertiary)' }} className="flex-shrink-0" />
      </div>

      <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
        {flat.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('commands.templateLibrary')}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            let offset = 0;
            for (const [c, its] of Object.entries(grouped)) {
              if (c === cat) {break;}
              offset += its.length;
            }
            return (
              <div key={cat}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}>{cat}</p>
                {items.map((cmd, i) => {
                  const idx = offset + i;
                  const isSelected = idx === sel;
                  return (
                    <button key={cmd.id} data-idx={idx} onClick={cmd.action} onMouseEnter={() => setSel(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100"
                      style={{
                        background: isSelected ? 'var(--accent-dim)' : undefined,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-colors"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--surface-floating)',
                          borderColor: 'var(--border-subtle)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)',
                        }}>{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cmd.label}</p>
                        {cmd.description && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{cmd.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
                        <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            <kbd>{k}</kbd> {l}
          </span>
        ))}
      </div>
    </Modal>
  );
}
