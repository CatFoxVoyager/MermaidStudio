import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, FilePlus, Search, ChevronRight, Folder, FolderOpen, FileText, MoreHorizontal, Trash2, CreditCard as Edit3, X, Tag as TagIcon, Plus, CheckSquare, Square, FolderOpen as FolderOpenIcon, Check } from 'lucide-react';
import type { Diagram, Folder as FolderType, Tag } from '@/types';
import {
  getFolders, getDiagrams, createFolder, createDiagram,
  deleteFolder, deleteDiagram, deleteDiagrams, updateFolder, updateDiagram,
  getTags, getDiagramTags, getAllDiagramTags, toggleDiagramTag, createTag, moveDiagramsToFolder
} from '@/services/storage/database';
import { ContextMenu } from '../shared/ContextMenu';
import type { ContextMenuItem } from '../shared/ContextMenu';
import { Modal } from '../shared/Modal';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import { detectDiagramType } from '@/lib/mermaid/core';

interface Props {
  onOpenDiagram: (id: string) => void;
  /* string | null (not just undefined): callers derive it from the active
     tab, which is null whenever no tab is open. */
  activeDiagramId?: string | null;
  onRefresh: () => void;
  onDiagramDeleted?: (diagramIds: string[]) => void;
  /** Render as the full-screen mobile Files destination. */
  mobileScreen?: boolean;
}

interface CtxState { x: number; y: number; items: ContextMenuItem[] }

const TAG_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];
const ROOT_FOLDER_FILTER_ID = '__root__';

export function Sidebar({ onOpenDiagram, activeDiagramId, onRefresh, onDiagramDeleted, mobileScreen = false }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderFilterOpen, setFolderFilterOpen] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerDiagramIds, setPickerDiagramIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[]; isSingle?: boolean; folder?: { id: string; name: string } } | null>(null);

  // Load data from IndexedDB
  const [allFolders, setAllFolders] = useState<FolderType[]>([]);
  const [allDiagrams, setAllDiagrams] = useState<Diagram[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  // Full tag→diagram relation list so a tag chip can actually filter (the
  // chips used to light up without changing the list — silent no-op, iter-3).
  const [allDiagramTags, setAllDiagramTags] = useState<{ diagram_id: string; tag_id: string }[]>([]);

  const refresh = useCallback(() => {
    onRefresh();
    // Reload data
    Promise.all([getFolders(), getDiagrams(), getTags(), getAllDiagramTags()]).then(([folders, diagrams, tagsData, diagramTags]) => {
      setAllFolders(folders);
      setAllDiagrams(diagrams);
      setTags(tagsData);
      setAllDiagramTags(diagramTags);
    });
  }, [onRefresh]);

  // Initial load
  useEffect(() => {
    Promise.all([getFolders(), getDiagrams(), getTags(), getAllDiagramTags()]).then(([folders, diagrams, tagsData, diagramTags]) => {
      setAllFolders(folders);
      setAllDiagrams(diagrams);
      setTags(tagsData);
      setAllDiagramTags(diagramTags);
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
    // Selected state: an explicit check icon + colored dot — the previous
    // encoding (filled dot vs hollow ring) measured ambiguous: the hollow
    // ring read MORE prominent than the filled dot, inverting the state
    // (iter-22 P0, A22 measured height-0 on checked indicators).
    return allTags.map(t => {
      const selected = tagIds.has(t.id);
      return {
        label: t.name,
        icon: selected ? (
          <span className="flex items-center shrink-0" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full mr-1" style={{ background: t.color }} />
            <Check size={14} style={{ color: t.color }} strokeWidth={3} />
          </span>
        ) : (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 opacity-40"
            style={{ border: `1.5px solid ${t.color}` }}
            aria-hidden="true"
          />
        ),
        ariaState: selected,
        onClick: () => { toggleDiagramTag(d.id, t.id); refresh(); },
      };
    });
  }

  async function showFolderCtx(e: React.MouseEvent, f: FolderType) {
    e.preventDefault(); e.stopPropagation();
    // Anchor to the trigger's rect, not the raw click point (iter-14 P1: the
    // clamped viewport coords could land the menu 330px from the finger).
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCtx({ x: rect.left, y: rect.bottom + 4, items: [
      { label: t('sidebar.newDiagram'), icon: <FilePlus size={13} />, onClick: () => newDiagram(f.id) },
      { label: t('sidebar.rename'), icon: <Edit3 size={13} />, onClick: () => { setEditingId(f.id); setEditValue(f.name); } },
      { label: t('sidebar.deleteFolder'), icon: <Trash2 size={13} />, danger: true, divider: true, onClick: () => { setDeleteConfirm({ ids: [], folder: { id: f.id, name: f.name } }); setCtx(null); } },
    ]});
  }

  async function showDiagramCtx(e: React.MouseEvent, d: Diagram) {
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tagItems = await buildTagItems(d);
    setCtx({ x: rect.left, y: rect.bottom + 4, items: [
      { label: t('sidebar.open'), icon: <FileText size={13} />, onClick: () => onOpenDiagram(d.id) },
      { label: t('sidebar.rename'), icon: <Edit3 size={13} />, onClick: () => { setEditingId(d.id); setEditValue(d.title); } },
      { label: t('sidebar.moveToFolder'), icon: <FolderOpenIcon size={13} />, divider: true, onClick: () => { setPickerDiagramIds([d.id]); setShowFolderPicker(true); setCtx(null); } },
      ...(tagItems.length > 0 ? [{ label: t('sidebar.tags'), icon: <TagIcon size={13} />, divider: true, header: true, onClick: () => {} }] : []),
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
    if (deleteConfirm.folder) {
      await deleteFolder(deleteConfirm.folder.id);
    } else if (deleteConfirm.isSingle) {
      await deleteDiagram(deleteConfirm.ids[0]);
    } else {
      await deleteDiagrams(deleteConfirm.ids);
    }
    if (deleteConfirm.ids.length > 0) {
      onDiagramDeleted?.(deleteConfirm.ids);
    }
    setDeleteConfirm(null);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    refresh();
  }

  const filtered = allDiagrams.filter(d => {
    if (!search && !activeTagId) {return true;}
    const matchesSearch = !search
      || d.title.toLowerCase().includes(search.toLowerCase())
      || d.content.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) {return false;}
    // Tag filter is now real (was a silent no-op): keep diagrams carrying the active tag.
    if (activeTagId && !allDiagramTags.some(dt => dt.diagram_id === d.id && dt.tag_id === activeTagId)) {return false;}
    return true;
  });
  const visibleDiagrams = filtered.filter(d => !activeFolderId
    || (activeFolderId === ROOT_FOLDER_FILTER_ID ? d.folder_id === null : d.folder_id === activeFolderId));
  const activeFolder = allFolders.find(folder => folder.id === activeFolderId);

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

  // Mobile cards carry what the diagram IS and WHEN it changed (critique
  // iter-8 P2: bare name + unlabeled dots gave no recognition support).
  function diagramKind(d: Diagram): string {
    const kind = detectDiagramType(d.content);
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }

  function relativeTime(iso: string): string {
    // Deliberate impurity: file-card relative timestamps are display-only
    // granularity ("3 h ago") — re-render drift is invisible at that scale,
    // and an effect-driven clock would add a render cycle to every Files
    // view for no user-visible gain (same justification class as the
    // CodeEditor latest-ref disable in CLAUDE.md).
    // oxlint-disable-next-line react/purity
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) {return t('sidebar.justNow');}
    if (minutes < 60) {return t('sidebar.minutesAgo', { count: minutes });}
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {return t('sidebar.hoursAgo', { count: hours });}
    return t('sidebar.daysAgo', { count: Math.floor(hours / 24) });
  }

  function renderDiagramItem(d: Diagram, depth = 0, dTags: typeof tags = []) {
    const isActive = d.id === activeDiagramId;
    const snippet = getMatchSnippet(d);
    const isSelected = selectedIds.has(d.id);

    // SyntheticEvent: reached from both the row's click and its Enter/Space
    // keyboard handler (iter-9 keyboard parity).
    function handleSelect(e: React.SyntheticEvent) {
      e.stopPropagation();
      setSelectedIds(prev => {
        const n = new Set(prev);
        if (n.has(d.id)) { n.delete(d.id); } else { n.add(d.id); }
        return n;
      });
    }

    return (
      <div key={d.id}
        role={mobileScreen ? 'button' : undefined}
        tabIndex={mobileScreen ? 0 : undefined}
        aria-label={mobileScreen ? d.title : undefined}
        onKeyDown={mobileScreen ? (e) => {
          // Keyboard parity for the primary object (critique iter-9 P0: the
          // row was a bare div onClick — a keyboard/SR user could reach the
          // kebab but could never OPEN the file). Enter/Space = open.
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isSelectMode) { handleSelect(e); } else { onOpenDiagram(d.id); }
          }
        } : undefined}
        className={`group flex items-center ${mobileScreen ? `gap-3 min-h-14 px-3 py-1.5 rounded-2xl active:bg-[var(--state-pressed)] ${FOCUS_RING_CLASSES}` : 'gap-1.5 py-[5px] rounded-md'} cursor-pointer select-none transition-colors duration-100 relative`}
        style={{
          paddingLeft: mobileScreen ? undefined : `${8 + depth * 16}px`, paddingRight: mobileScreen ? undefined : '6px',
          background: isSelected || isActive ? 'var(--accent-dim)' : undefined,
          // Desktop keeps its tree-style accent rail; mobile drops it — the
          // 3px border died in the rounded-2xl corner (detector `side-tab`)
          // and accent-dim bg already carries the selected state.
          borderLeft: mobileScreen ? undefined : (isSelected || isActive ? '2px solid var(--accent)' : '2px solid transparent'),
          color: mobileScreen ? 'var(--text-secondary)' : (isSelected ? 'var(--accent)' : (isActive ? 'var(--accent)' : 'var(--text-secondary)')),
        }}
        onClick={(e) => {
          if (isSelectMode) { handleSelect(e); } else { onOpenDiagram(d.id); }
        }}
        onContextMenu={e => showDiagramCtx(e, d)}>
        {isSelectMode && (
          <button onClick={handleSelect} aria-label={isSelected ? t('sidebar.diagramSelected') : t('sidebar.enterSelectMode')} className="shrink-0 p-0.5 rounded-sm hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
            {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          </button>
        )}
        <FileText size={mobileScreen ? 24 : 13} className="shrink-0 opacity-70" />
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
              <span className={`${mobileScreen ? 'text-base' : 'text-xs'} truncate block`}
                style={{ fontWeight: isActive ? 500 : undefined, color: isActive && !mobileScreen ? 'var(--accent)' : 'var(--text-primary)' }}>
                {d.title}
              </span>
              {mobileScreen && (
                <span className="text-xs leading-none mt-1 block" style={{ color: 'var(--text-tertiary)' }}>
                  {diagramKind(d)} · {relativeTime(d.updated_at)}
                </span>
              )}
              {snippet && (
                <span className="text-[11px] truncate block font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {snippet}
                </span>
              )}
              {dTags.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {dTags.map(t => (
                    <span key={t.id} role="img" aria-label={t.name} className="w-2 h-2 rounded-full" style={{ background: t.color }} title={t.name} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <button className={`${mobileScreen
          ? `opacity-100 min-w-11 min-h-11 shrink-0 ${FOCUS_RING_CLASSES}`
          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'} transition-opacity p-1 rounded-md flex items-center justify-center`}
          style={{ color: 'var(--text-tertiary)' }}
          onClick={e => showDiagramCtx(e, d)}
          aria-label={t('sidebar.optionsFor', { name: d.title })}>
          <MoreHorizontal size={mobileScreen ? 20 : 11} />
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
          <button className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity p-0.5 rounded-sm"
            onClick={e => showFolderCtx(e, f)} style={{ color: 'var(--text-tertiary)' }}
            aria-label={t('sidebar.optionsFor', { name: f.name })}>
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
  const isFiltering = search || activeTagId || activeFolderId;

  return (
    <div className={`relative flex flex-col h-full ${mobileScreen ? 'bg-[var(--surface-base)]' : 'border-r'}`} style={{ background: mobileScreen ? 'var(--surface-base)' : 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      {!mobileScreen && <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('sidebar.explorer')}</span>
        <div className="flex gap-1">
          <button onClick={() => setIsSelectMode(!isSelectMode)} title={isSelectMode ? t('sidebar.exitSelectMode') : t('sidebar.enterSelectMode')}
            aria-label={isSelectMode ? t('sidebar.exitSelectMode') : t('sidebar.enterSelectMode')}
            className={`p-1 rounded-md transition-colors ${isSelectMode ? 'bg-[var(--accent-dim)]' : 'hover:bg-[var(--hover)]'}`}
            style={{ color: isSelectMode ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <CheckSquare size={13} />
          </button>
          <button onClick={() => newDiagram(null)} title={t('sidebar.newDiagram')} aria-label={t('sidebar.newDiagram')}
            className="p-1 rounded-md transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-secondary)' }}>
            <FilePlus size={13} />
          </button>
          <button onClick={async () => { await createFolder(t('sidebar.newFolder')); refresh(); }} title={t('sidebar.newFolder')} aria-label={t('sidebar.newFolder')}
            className="p-1 rounded-md transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-secondary)' }}>
            <FolderPlus size={13} />
          </button>
        </div>
      </div>}

      <div className={mobileScreen ? 'px-4 py-2 shrink-0 border-b' : 'px-2 py-2 border-b shrink-0'} style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="relative">
          <Search size={mobileScreen ? 24 : 11} className={`absolute ${mobileScreen ? 'left-4' : 'left-2.5'} top-1/2 -translate-y-1/2`} style={{ color: 'var(--text-tertiary)' }} />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            aria-label={t('sidebar.searchPlaceholder')}
            className={`w-full ${mobileScreen ? 'h-14 pl-12 pr-10 text-base rounded-full border-0 placeholder:text-[var(--text-tertiary)]' : 'pl-7 pr-7 py-1.5 text-xs rounded-lg border placeholder:text-[var(--text-tertiary)]'} outline-hidden transition-colors`}
            style={{
              background: mobileScreen ? 'var(--surface-floating)' : 'var(--surface-base)',
              borderColor: search ? 'var(--accent)' : 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => {
              /* Inline focus indicator (iter-14 P1: the Tailwind ring failed
                 to paint on this input in live measurement — 2.4.7). Inline
                 box-shadow is immune to cascade surprises. */
              e.currentTarget.style.boxShadow = '0 0 0 2px #ffffff, 0 0 0 4px rgba(13,115,119,0.7)';
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = '';
            }} />
          {search && (
            <button onClick={() => setSearch('')} aria-label={t('sidebar.clearSearch')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center ${mobileScreen ? 'w-11 h-11' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}>
              <X size={mobileScreen ? 19 : 10} />
            </button>
          )}
        </div>
      </div>

      {mobileScreen && <div className="relative px-4 py-2 shrink-0 border-b flex flex-wrap gap-1.5 items-center" style={{ borderColor: 'var(--border-subtle)' }}>
        <button type="button" aria-expanded={folderFilterOpen} onClick={() => setFolderFilterOpen(value => !value)}
          className={`flex items-center gap-1.5 min-h-11 px-3 rounded-xl border text-[13px] font-medium shrink-0 ${FOCUS_RING_CLASSES}`}
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)', color: 'var(--text-secondary)' }}>
          <FolderOpen size={17} />
          {activeFolder?.name ?? (activeFolderId === ROOT_FOLDER_FILTER_ID ? t('sidebar.rootFolder') : t('sidebar.allFolders'))}
        </button>
        {folderFilterOpen && <div className="absolute z-20 left-5 top-full min-w-52 max-h-64 overflow-y-auto rounded-xl border shadow-xl p-1"
          style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
          <button type="button" onClick={() => { setActiveFolderId(null); setFolderFilterOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-primary)' }}>{t('sidebar.allFolders')}</button>
          <button type="button" onClick={() => { setActiveFolderId(ROOT_FOLDER_FILTER_ID); setFolderFilterOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-primary)' }}>{t('sidebar.rootFolder')}</button>
          {allFolders.map(folder => <button key={folder.id} type="button"
            onClick={() => { setActiveFolderId(folder.id); setFolderFilterOpen(false); }}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-primary)', paddingLeft: `${12 + (folder.parent_id ? 16 : 0)}px` }}>{folder.name}</button>)}
        </div>}
        {tags.map(tag => <button key={tag.id} type="button" onClick={() => setActiveTagId(prev => prev === tag.id ? null : tag.id)}
          aria-pressed={activeTagId === tag.id}
          className={`flex items-center gap-1.5 min-h-11 px-3 rounded-xl border text-[13px] font-medium shrink-0 ${FOCUS_RING_CLASSES}`}
          style={{ background: activeTagId === tag.id ? `${tag.color}18` : 'var(--surface-base)', borderColor: activeTagId === tag.id ? tag.color : 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: tag.color }} />{tag.name}
        </button>)}
        <button type="button" onClick={() => setShowNewTag(value => !value)} title={t('sidebar.addTag')} aria-label={t('sidebar.addTag')}
          className={`min-w-11 min-h-11 flex items-center justify-center rounded-full ${FOCUS_RING_CLASSES}`}
          style={{ color: 'var(--text-secondary)' }}><Plus size={20} /></button>
      </div>}

      {!mobileScreen && tags.length > 0 && (
        <div className="px-2 py-1.5 border-b shrink-0 flex flex-wrap gap-1 items-center" style={{ borderColor: 'var(--border-subtle)' }}>
          {tags.map(t => (
            <button key={t.id} onClick={() => setActiveTagId(prev => prev === t.id ? null : t.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-150"
              style={{
                background: activeTagId === t.id ? t.color + '22' : 'transparent',
                borderColor: activeTagId === t.id ? t.color : 'var(--border-subtle)',
                color: activeTagId === t.id ? t.color : 'var(--text-tertiary)',
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
          <button onClick={() => setShowNewTag(v => !v)} title={t('sidebar.addTag')} aria-label={t('sidebar.addTag')}
            className="p-0.5 rounded-full transition-colors hover:bg-[var(--hover)]"
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
            className={`w-full px-2 rounded-sm border outline-hidden ${mobileScreen ? 'py-2.5 text-sm h-11' : 'py-1 text-xs'}`}
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} />
          <div className={`flex items-center ${mobileScreen ? 'gap-2.5' : 'gap-1'}`}>
            {TAG_COLORS.map(c => (
              <button key={c} onClick={() => setNewTagColor(c)} aria-label={t('sidebar.addTag')}
                className={`${mobileScreen ? 'w-8 h-8' : 'w-4 h-4'} rounded-full transition-transform ${FOCUS_RING_CLASSES}`}
                style={{ background: c, outline: newTagColor === c ? `2px solid ${c}` : undefined, outlineOffset: '1px', transform: newTagColor === c ? 'scale(1.2)' : undefined }} />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={handleCreateTag} className={`${mobileScreen ? 'px-4 min-h-[44px] text-sm' : 'px-2 py-1 text-[11px]'} font-medium rounded-sm ${FOCUS_RING_CLASSES}`} style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>{t('common.save')}</button>
            <button onClick={() => setShowNewTag(false)} className={`${mobileScreen ? 'px-4 min-h-[44px] text-sm' : 'px-2 py-1 text-[11px]'} rounded-sm ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--text-secondary)' }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="px-2 py-2 border-b shrink-0 animate-fade-in" style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedIds.size} {selectedIds.size === 1 ? t('sidebar.diagramSelected') : t('sidebar.diagramsSelected')}
            </span>
            <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }} aria-label={t('common.close')} className="p-0.5 rounded-sm hover:bg-[var(--hover)]" style={{ color: 'var(--text-secondary)' }}>
              <X size={12} />
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setDeleteConfirm({ ids: Array.from(selectedIds) })}
              className="flex-1 flex items-center justify-center gap-1 px-2 min-h-[44px] text-xs font-medium rounded-sm"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              <Trash2 size={11} /> {t('sidebar.deleteSelected')}
            </button>
            <button onClick={() => { setPickerDiagramIds(Array.from(selectedIds)); setShowFolderPicker(true); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 min-h-[44px] text-xs font-medium rounded-sm border"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <FolderOpenIcon size={11} /> {t('sidebar.moveToFolder')}
            </button>
          </div>
        </div>
      )}

      {!mobileScreen && tags.length === 0 && (
        <div className="px-2 py-1.5 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <button onClick={() => setShowNewTag(true)}
            className="flex items-center gap-1.5 text-[11px] w-full px-2 py-1 rounded-sm transition-colors hover:bg-[var(--hover)]"
            style={{ color: 'var(--text-tertiary)' }}>
            <TagIcon size={10} /> {t('sidebar.addTags')}
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${mobileScreen ? 'px-2 pt-2 pb-24 space-y-2' : 'p-2 space-y-0.5'}`}>
        {!mobileScreen && !isFiltering && rootFolders.map(f => renderFolder(f))}
        {mobileScreen ? visibleDiagrams.map(d => renderDiagramItem(d, 0, tags.filter(tag => allDiagramTags.some(relation => relation.diagram_id === d.id && relation.tag_id === tag.id)))) : isFiltering ? filtered.map(d => renderDiagramItem(d, 0, [])) : rootDiagrams.map(d => renderDiagramItem(d, 0, []))}
        {(mobileScreen ? visibleDiagrams.length : filtered.length) === 0 && isFiltering && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Search size={16} className="mb-2 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{t('sidebar.noMatchingDiagrams')}</p>
            {/* Dead-end exit: an empty filter state without a way out reads as
                a bug (critique iter-5 P2, Riley). */}
            <button onClick={() => { setSearch(''); setActiveTagId(null); setActiveFolderId(null); }}
              className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
              {t('sidebar.clearFilters')}
            </button>
          </div>
        )}
        {allDiagrams.length === 0 && !isFiltering && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--accent-dim)' }}>
              <FileText size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('sidebar.noDiagrams')}</p>
            <button onClick={() => newDiagram(null)} className={`text-sm px-4 min-h-[44px] rounded-lg hover:underline ${FOCUS_RING_CLASSES}`} style={{ color: 'var(--accent)' }}>
              {t('sidebar.createFirst')}
            </button>
          </div>
        )}
      </div>

      {mobileScreen && <button type="button" onClick={() => newDiagram(activeFolderId === ROOT_FOLDER_FILTER_ID ? null : activeFolderId)}
        aria-label={t('sidebar.newDiagram')}
        className={`absolute right-4 z-10 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${FOCUS_RING_CLASSES}`}
        style={{ bottom: 'calc(var(--ms-ad-banner-height, 0px) + 16px)', background: 'var(--accent)', color: 'var(--on-accent)' }}><Plus size={30} strokeWidth={1.8} /></button>}

      {ctx && <ContextMenu {...ctx} touch={mobileScreen} onClose={() => setCtx(null)} />}

      {/* Folder Picker Modal — shared Modal gives trap, focus restore, Escape */}
      {showFolderPicker && (
        <Modal isOpen onClose={() => { setShowFolderPicker(false); setPickerDiagramIds([]); }} title={t('sidebar.selectFolder')} size="sm">
          <div className="p-2 max-h-80 overflow-y-auto">
            <button onClick={() => handleMoveToFolder(null)}
              className="w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-left transition-colors hover:bg-[var(--hover)]"
              style={{ color: 'var(--text-secondary)' }}>
              <FolderOpen size={14} />
              <span className="text-xs">{t('sidebar.rootFolder')}</span>
            </button>
            {allFolders.filter(f => f.parent_id === null).map(f => (
              <div key={f.id}>
                <button onClick={() => handleMoveToFolder(f.id)}
                  className="w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-left transition-colors hover:bg-[var(--hover)]"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Folder size={14} />
                  <span className="text-xs truncate">{f.name}</span>
                </button>
                {allFolders.filter(sub => sub.parent_id === f.id).map(sub => (
                  <button key={sub.id} onClick={() => handleMoveToFolder(sub.id)}
                    className="w-full flex items-center gap-2 px-3 min-h-[44px] rounded-lg text-left transition-colors hover:bg-[var(--hover)]"
                    style={{ color: 'var(--text-secondary)', paddingLeft: '2rem' }}>
                    <Folder size={14} />
                    <span className="text-xs truncate">{sub.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal — shared Modal gives trap, focus restore, Escape */}
      {deleteConfirm && (
        <Modal isOpen onClose={() => setDeleteConfirm(null)} title={
          deleteConfirm.folder
            ? t('sidebar.deleteFolderConfirmTitle')
            : deleteConfirm.isSingle
              ? t('sidebar.deleteConfirmTitle')
              : t('sidebar.deleteMultipleConfirmTitle', { count: deleteConfirm.ids.length })
        } size="sm">
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 mx-auto" style={{ background: deleteConfirm.folder ? 'rgba(59,130,246,0.1)' : 'var(--danger-dim)' }}>
              {deleteConfirm.folder
                ? <Folder size={20} style={{ color: '#3b82f6' }} />
                : <Trash2 size={20} style={{ color: 'var(--danger)' }} />}
            </div>
            <p className="text-xs text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
              {deleteConfirm.folder
                ? t('sidebar.deleteFolderConfirmMessage', {
                    name: deleteConfirm.folder.name,
                    count: allDiagrams.filter(d => d.folder_id === deleteConfirm.folder!.id).length,
                  })
                : t('sidebar.deleteConfirmMessage')}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleDeleteConfirm}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: deleteConfirm.folder ? 'var(--accent)' : 'var(--danger)', color: deleteConfirm.folder ? 'var(--on-accent)' : '#ffffff' }}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
