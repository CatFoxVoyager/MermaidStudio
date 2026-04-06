import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, FilePlus, Search, ChevronRight, Folder, FolderOpen, FileText, MoreHorizontal, Trash2, CreditCard as Edit3, X, Tag as TagIcon, Plus, CheckSquare, Square, FolderOpen as FolderOpenIcon } from 'lucide-react';
import type { Diagram, Folder as FolderType, Tag } from '@/types';
import {
  getFolders, getDiagrams, createFolder, createDiagram,
  deleteFolder, deleteDiagram, deleteDiagrams, updateFolder, updateDiagram,
  getTags, getDiagramTags, toggleDiagramTag, createTag, moveDiagramsToFolder
} from '@/services/storage/database';
import { ContextMenu } from '../shared/ContextMenu';
import type { ContextMenuItem } from '../shared/ContextMenu';

interface Props {
  onOpenDiagram: (id: string) => void;
  activeDiagramId?: string;
  onRefresh: () => void;
  onDiagramDeleted?: (diagramIds: string[]) => void;
}

interface CtxState { x: number; y: number; items: ContextMenuItem[] }

const TAG_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];

export function Sidebar({ onOpenDiagram, activeDiagramId, onRefresh, onDiagramDeleted }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerDiagramIds, setPickerDiagramIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[]; isSingle?: boolean } | null>(null);

  // Load data from IndexedDB
  const [allFolders, setAllFolders] = useState<FolderType[]>([]);
  const [allDiagrams, setAllDiagrams] = useState<Diagram[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const refresh = useCallback(() => {
    onRefresh();
    // Reload data
    Promise.all([getFolders(), getDiagrams(), getTags()]).then(([folders, diagrams, tagsData]) => {
      setAllFolders(folders);
      setAllDiagrams(diagrams);
      setTags(tagsData);
    });
  }, [onRefresh]);

  // Initial load
  useEffect(() => {
    Promise.all([getFolders(), getDiagrams(), getTags()]).then(([folders, diagrams, tagsData]) => {
      setAllFolders(folders);
      setAllDiagrams(diagrams);
      setTags(tagsData);
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function newDiagram(folderId: string | null = null) {
    const defaultContent = `---
config:
  theme: base
---
flowchart TD
    A --> B`;
    const d = await createDiagram(t('sidebar.untitled'), defaultContent, folderId);
    refresh(); onOpenDiagram(d.id);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) {n.delete(id);} else {n.add(id);} return n; });
  }

  async function commitEdit(id: string, type: 'folder' | 'diagram') {
    if (!editValue.trim()) { setEditingId(null); return; }
    if (type === 'folder') {await updateFolder(id, editValue.trim());}
    else {await updateDiagram(id, { title: editValue.trim() });}
    setEditingId(null); refresh();
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) {return;}
    await createTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setShowNewTag(false);
    refresh();
  }

  async function buildTagItems(d: Diagram): Promise<ContextMenuItem[]> {
    const allTags = await getTags();
    const dTags = await getDiagramTags(d.id);
    const tagIds = new Set(dTags.map(t => t.id));
    return allTags.map(t => ({
      label: `${tagIds.has(t.id) ? '✓' : '  '} ${t.name}`,
      icon: <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />,
      onClick: () => { toggleDiagramTag(d.id, t.id); refresh(); },
    }));
  }

  async function showFolderCtx(e: React.MouseEvent, f: FolderType) {
    e.preventDefault(); e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, items: [
      { label: t('sidebar.newDiagram'), icon: <FilePlus size={13} />, onClick: () => newDiagram(f.id) },
      { label: t('sidebar.rename'), icon: <Edit3 size={13} />, onClick: () => { setEditingId(f.id); setEditValue(f.name); } },
      { label: t('sidebar.deleteFolder'), icon: <Trash2 size={13} />, danger: true, divider: true, onClick: async () => { await deleteFolder(f.id); refresh(); } },
    ]});
  }

  async function showDiagramCtx(e: React.MouseEvent, d: Diagram) {
    e.preventDefault(); e.stopPropagation();
    const tagItems = await buildTagItems(d);
    setCtx({ x: e.clientX, y: e.clientY, items: [
      { label: t('sidebar.open'), icon: <FileText size={13} />, onClick: () => onOpenDiagram(d.id) },
      { label: t('sidebar.rename'), icon: <Edit3 size={13} />, onClick: () => { setEditingId(d.id); setEditValue(d.title); } },
      { label: t('sidebar.moveToFolder'), icon: <FolderOpenIcon size={13} />, divider: true, onClick: () => { setPickerDiagramIds([d.id]); setShowFolderPicker(true); setCtx(null); } },
      ...(tagItems.length > 0 ? [{ label: t('sidebar.tags'), icon: <TagIcon size={13} />, divider: true, onClick: () => {} }] : []),
      ...tagItems,
      { label: t('sidebar.delete'), icon: <Trash2 size={13} />, danger: true, divider: true, onClick: () => { setDeleteConfirm({ ids: [d.id], isSingle: true }); setCtx(null); } },
    ]});
  }

  async function handleMoveToFolder(folderId: string | null) {
    await moveDiagramsToFolder(pickerDiagramIds, folderId);
    setShowFolderPicker(false);
    setPickerDiagramIds([]);
    setSelectedIds(new Set());
    refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) {return;}
    if (deleteConfirm.isSingle) {
      await deleteDiagram(deleteConfirm.ids[0]);
    } else {
      await deleteDiagrams(deleteConfirm.ids);
    }
    onDiagramDeleted?.(deleteConfirm.ids);
    setDeleteConfirm(null);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    refresh();
  }

  const filtered = allDiagrams.filter(d => {
    if (!search && !activeTagId) {return true;}
    const q = search.toLowerCase();
    const matchesSearch = !search || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
    if (!matchesSearch) {return false;}
    // Tag filtering would be async, so we'll skip it for now or handle it differently
    return true;
  });

  function getMatchSnippet(d: Diagram): string | null {
    if (!search) {return null;}
    const q = search.toLowerCase();
    if (d.title.toLowerCase().includes(q)) {return null;}
    const lines = d.content.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(q)) {
        return line.trim().slice(0, 60);
      }
    }
    return null;
  }

  function renderDiagramItem(d: Diagram, depth = 0, dTags: typeof tags = []) {
    const isActive = d.id === activeDiagramId;
    const snippet = getMatchSnippet(d);
    const isSelected = selectedIds.has(d.id);

    function handleSelect(e: React.MouseEvent) {
      e.stopPropagation();
      setSelectedIds(prev => {
        const n = new Set(prev);
        if (n.has(d.id)) { n.delete(d.id); } else { n.add(d.id); }
        return n;
      });
    }

    return (
      <div key={d.id}
        className="group flex items-center gap-1.5 py-[5px] rounded-md cursor-pointer select-none transition-colors duration-100 relative"
        style={{
          paddingLeft: `${8 + depth * 16}px`, paddingRight: '6px',
          background: isSelected ? 'var(--accent-dim)' : (isActive ? 'var(--accent-dim)' : undefined),
          borderLeft: isSelected ? `2px solid var(--accent)` : (isActive ? `2px solid var(--accent)` : '2px solid transparent'),
          color: isSelected ? 'var(--accent)' : (isActive ? 'var(--accent)' : 'var(--text-secondary)'),
        }}
        onClick={(e) => {
          if (isSelectMode) { handleSelect(e); } else { onOpenDiagram(d.id); }
        }}
        onContextMenu={e => showDiagramCtx(e, d)}>
        {isSelectMode && (
          <button onClick={handleSelect} className="shrink-0 p-0.5 rounded-sm hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          </button>
        )}
        <FileText size={13} className="shrink-0 opacity-70" />
        <div className="flex-1 min-w-0">
          {editingId === d.id ? (
            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => commitEdit(d.id, 'diagram')}
              onKeyDown={e => { if (e.key === 'Enter') {commitEdit(d.id, 'diagram');} if (e.key === 'Escape') {setEditingId(null);} }}
              onClick={e => e.stopPropagation()}
              className="w-full text-xs bg-transparent border-b outline-hidden py-0"
              style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }} />
          ) : (
            <>
              <span className="text-xs truncate block"
                style={{ fontWeight: isActive ? 500 : undefined, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {d.title}
              </span>
              {snippet && (
                <span className="text-[10px] truncate block font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {snippet}
                </span>
              )}
              {dTags.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {dTags.map(t => (
                    <span key={t.id} className="w-2 h-2 rounded-full" style={{ background: t.color }} title={t.name} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-sm"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={e => showDiagramCtx(e, d)}
          aria-label={`Options for ${d.title}`}>
          <MoreHorizontal size={11} />
        </button>
      </div>
    );
  }

  function renderFolder(f: FolderType, depth = 0): React.ReactNode {
    const isOpen = expanded.has(f.id);
    const children = allFolders.filter(c => c.parent_id === f.id);
    const fDiagrams = filtered.filter(d => d.folder_id === f.id);
    return (
      <div key={f.id}>
        <div className="group flex items-center gap-1 py-[5px] rounded-md cursor-pointer select-none transition-colors duration-100"
          style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '6px', color: 'var(--text-secondary)' }}
          onClick={() => toggleExpand(f.id)} onContextMenu={e => showFolderCtx(e, f)}>
          <ChevronRight size={12} className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
          <span className="shrink-0 opacity-70">{isOpen ? <FolderOpen size={13} /> : <Folder size={13} />}</span>
          {editingId === f.id ? (
            <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => commitEdit(f.id, 'folder')}
              onKeyDown={e => { if (e.key === 'Enter') {commitEdit(f.id, 'folder');} if (e.key === 'Escape') {setEditingId(null);} }}
              onClick={e => e.stopPropagation()}
              className="flex-1 text-xs bg-transparent border-b outline-hidden py-0"
              style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }} />
          ) : (
            <span className="flex-1 text-xs truncate">{f.name}</span>
          )}
          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-sm"
            onClick={e => showFolderCtx(e, f)} style={{ color: 'var(--text-tertiary)' }}
            aria-label={`Options for ${f.name}`}>
            <MoreHorizontal size={11} />
          </button>
        </div>
        {isOpen && (
          <div>
            {children.map(c => renderFolder(c, depth + 1))}
            {fDiagrams.map(d => renderDiagramItem(d, depth + 1, []))}
          </div>
        )}
      </div>
    );
  }

  const rootFolders = allFolders.filter(f => f.parent_id === null);
  const rootDiagrams = filtered.filter(d => d.folder_id === null);
  const isFiltering = search || activeTagId;

  return (
    <div className="flex flex-col h-full border-r" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('sidebar.explorer')}</span>
        <div className="flex gap-1">
          <button onClick={() => setIsSelectMode(!isSelectMode)} title={isSelectMode ? t('sidebar.exitSelectMode') : t('sidebar.enterSelectMode')}
            className={`p-1 rounded-md transition-colors ${isSelectMode ? 'bg-white/10' : 'hover:bg-white/8'}`}
            style={{ color: isSelectMode ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <CheckSquare size={13} />
          </button>
          <button onClick={() => newDiagram(null)} title={t('sidebar.newDiagram')}
            className="p-1 rounded-md transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}>
            <FilePlus size={13} />
          </button>
          <button onClick={async () => { await createFolder(t('sidebar.newFolder')); refresh(); }} title={t('sidebar.newFolder')}
            className="p-1 rounded-md transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}>
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      <div className="px-2 py-2 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border outline-hidden transition-colors"
            style={{
              background: 'var(--surface-base)',
              borderColor: search ? 'var(--accent)' : 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="px-2 py-1.5 border-b shrink-0 flex flex-wrap gap-1 items-center" style={{ borderColor: 'var(--border-subtle)' }}>
          {tags.map(t => (
            <button key={t.id} onClick={() => setActiveTagId(prev => prev === t.id ? null : t.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all duration-150"
              style={{
                background: activeTagId === t.id ? t.color + '22' : 'transparent',
                borderColor: activeTagId === t.id ? t.color : 'var(--border-subtle)',
                color: activeTagId === t.id ? t.color : 'var(--text-tertiary)',
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
          <button onClick={() => setShowNewTag(v => !v)} title="Add tag"
            className="p-0.5 rounded-full transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-tertiary)' }}>
            <Plus size={10} />
          </button>
        </div>
      )}

      {showNewTag && (
        <div className="px-2 py-2 border-b shrink-0 space-y-1.5 animate-fade-in" style={{ borderColor: 'var(--border-subtle)' }}>
          <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') {handleCreateTag();} if (e.key === 'Escape') {setShowNewTag(false);} }}
            placeholder={t('sidebar.tagPlaceholder')} autoFocus
            className="w-full px-2 py-1 text-xs rounded-sm border outline-hidden"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          <div className="flex items-center gap-1">
            {TAG_COLORS.map(c => (
              <button key={c} onClick={() => setNewTagColor(c)}
                className="w-4 h-4 rounded-full transition-transform"
                style={{ background: c, outline: newTagColor === c ? `2px solid ${c}` : undefined, outlineOffset: '1px', transform: newTagColor === c ? 'scale(1.2)' : undefined }} />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={handleCreateTag} className="px-2 py-1 text-[10px] font-medium rounded-sm text-white" style={{ background: 'var(--accent)' }}>{t('common.save')}</button>
            <button onClick={() => setShowNewTag(false)} className="px-2 py-1 text-[10px] rounded-sm" style={{ color: 'var(--text-secondary)' }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="px-2 py-2 border-b shrink-0 animate-fade-in" style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedIds.size} {selectedIds.size === 1 ? t('sidebar.diagramSelected') : t('sidebar.diagramsSelected')}
            </span>
            <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} className="p-0.5 rounded-sm hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
              <X size={12} />
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setDeleteConfirm({ ids: Array.from(selectedIds) })}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-sm text-white"
              style={{ background: 'var(--accent)' }}>
              <Trash2 size={11} /> {t('sidebar.deleteSelected')}
            </button>
            <button onClick={() => { setPickerDiagramIds(Array.from(selectedIds)); setShowFolderPicker(true); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-sm border"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <FolderOpenIcon size={11} /> {t('sidebar.moveToFolder')}
            </button>
          </div>
        </div>
      )}

      {tags.length === 0 && (
        <div className="px-2 py-1.5 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <button onClick={() => setShowNewTag(true)}
            className="flex items-center gap-1.5 text-[10px] w-full px-2 py-1 rounded-sm transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}>
            <TagIcon size={10} /> {t('sidebar.addTags')}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {!isFiltering && rootFolders.map(f => renderFolder(f))}
        {isFiltering ? filtered.map(d => renderDiagramItem(d, 0, [])) : rootDiagrams.map(d => renderDiagramItem(d, 0, []))}
        {filtered.length === 0 && isFiltering && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search size={16} className="mb-2 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('sidebar.noMatchingDiagrams')}</p>
          </div>
        )}
        {allDiagrams.length === 0 && !isFiltering && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--accent-dim)' }}>
              <FileText size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('sidebar.noDiagrams')}</p>
            <button onClick={() => newDiagram(null)} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
              {t('sidebar.createFirst')}
            </button>
          </div>
        )}
      </div>

      {ctx && <ContextMenu {...ctx} onClose={() => setCtx(null)} />}

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-80 rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('sidebar.selectFolder')}</span>
              <button onClick={() => { setShowFolderPicker(false); setPickerDiagramIds([]); }} className="p-1 rounded-sm hover:bg-white/8" style={{ color: 'var(--text-secondary)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              <button onClick={() => handleMoveToFolder(null)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/6"
                style={{ color: 'var(--text-secondary)' }}>
                <FolderOpen size={14} />
                <span className="text-xs">{t('sidebar.rootFolder')}</span>
              </button>
              {allFolders.filter(f => f.parent_id === null).map(f => (
                <div key={f.id}>
                  <button onClick={() => handleMoveToFolder(f.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/6"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Folder size={14} />
                    <span className="text-xs truncate">{f.name}</span>
                  </button>
                  {allFolders.filter(sub => sub.parent_id === f.id).map(sub => (
                    <button key={sub.id} onClick={() => handleMoveToFolder(sub.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/6"
                      style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                      <Folder size={14} />
                      <span className="text-xs truncate">{sub.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-80 rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
            <div className="p-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 mx-auto" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Trash2 size={20} style={{ color: '#ef4444' }} />
              </div>
              <h3 className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
                {deleteConfirm.isSingle ? t('sidebar.deleteConfirmTitle') : t('sidebar.deleteMultipleConfirmTitle', { count: deleteConfirm.ids.length })}
              </h3>
              <p className="text-xs text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
                {t('sidebar.deleteConfirmMessage')}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {t('common.cancel')}
                </button>
                <button onClick={handleDeleteConfirm}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
                  style={{ background: '#ef4444' }}>
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
