import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { CodeEditor } from '@/components/editor/CodeEditor';
import type { CodeEditorRef } from '@/components/editor/CodeEditor';
import { registerCodePaneActivator, unregisterCodePaneActivator } from '@/lib/editor/codeViewRegistry';
import { ExtraKeysRow } from '@/components/editor/ExtraKeysRow';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { storage } from '@/utils/logger';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';

/**
 * D-4 (36.1.1): persisted collapsed state of the mobile code-pane chrome.
 * Absent or corrupt value reads as collapsed — the fail-safe default, so a
 * first launch opens the code pane maximized. Persisted 'false' is the ONLY
 * expanded state. Read/written through the storage abstraction (useTheme
 * idiom), never raw localStorage.
 */
const CODE_CHROME_COLLAPSED_KEY = 'mermaid-studio-mobile-code-chrome-collapsed';

interface MobileWorkspaceProps {
  value: string;
  onChange: (v: string) => void;
  theme: 'dark' | 'light';
  themeId?: string;
  onPreviewError?: (error: string | null) => void;
  onSave?: () => void;
  onOpenDiagram?: (id: string) => void;
  activeDiagramId?: string | null;
  onRefreshFiles?: () => void;
  onDiagramDeleted?: (ids: string[]) => void;
  filesRefreshKey?: number;
  /** D-2 (36.1.1): the AI segment opens the existing right AI drawer
   *  (web-mobile only — the segment itself is gated on false). */
  onOpenAIDrawer?: () => void;
  /** Device-walk 2026-09-25: switching panes while a drawer is open closes
   *  it — Code/Visual taps from the Files drawer must dismiss the drawer
   *  (the scrimless drawer leaves the segments tappable, so this is the
   *  path a user's second tap takes). */
  onCloseDrawer?: () => void;
  /** Review WR-03 (36.1.1): whether the AI drawer is currently open —
   *  drives the AI segment's active accent, mirroring filesDrawerOpen so
   *  both destination segments expose the same selected state. */
  aiDrawerOpen?: boolean;
  /** Reports the active destination upward (iter-9: MobileLayout disables
   *  top-bar undo/redo while Files is active — the editor history actions
   *  read as no-ops from there). */
  onActiveViewChange?: (view: 'files' | 'editor') => void;
}

export function MobileWorkspace({
  value,
  onChange,
  theme,
  themeId,
  onPreviewError,
  onSave,
  onOpenDiagram,
  activeDiagramId,
  onRefreshFiles,
  onDiagramDeleted,
  filesRefreshKey,
  onOpenAIDrawer,
  onCloseDrawer,
  aiDrawerOpen,
  onActiveViewChange,
}: MobileWorkspaceProps) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<'files' | 'editor'>('files');
  const [activePane, setActivePane] = useState<'code' | 'preview'>('code');

  // D-4: collapsible code chrome (ExtraKeysRow enclosure). Iter-10 P2
  // reversal of the default: "absent -> collapsed" hid the app's most
  // mobile-specific affordance from every first-session editor (soft-keyboard
  // fights with no visible help). Absent/corrupt now reads EXPANDED; an
  // explicit 'true' (user collapsed it) is still honored. The persisted
  // state covers only the ExtraKeysRow enclosure.
  const [chromeCollapsed, setChromeCollapsed] = useState<boolean>(
    () => storage.getItem(CODE_CHROME_COLLAPSED_KEY) === 'true',
  );

  const toggleChromeCollapsed = () => {
    const next = !chromeCollapsed;
    setChromeCollapsed(next);
    // No side effects in updaters: the write happens in the handler with the
    // render-closure value (fresh per render), 'true' = collapsed.
    storage.setItem(CODE_CHROME_COLLAPSED_KEY, next ? 'true' : 'false');
  };

  // Scroll container refs
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // EDIT-02: imperative handle to the live CodeEditor view so the extra-keys
  // row can dispatch insertions without re-rendering through the value prop.
  const codeEditorRef = useRef<CodeEditorRef>(null);

  // Scroll position refs
  const codeScrollPos = useRef(0);
  const previewScrollPos = useRef(0);

  // Save the LEAVING pane's scroll synchronously in the switch path, BEFORE
  // the `hidden` class commits. A passive effect runs after the commit, when
  // the leaving pane is display:none — an element without a layout box reads
  // scrollTop as 0 — so an effect-based save always stored 0 and every pane
  // switch reset scroll to the top (27-REVIEW WR-01). Restore stays in
  // effects: the entering pane is visible again by the time they run.
  // (Declared above its registry/back-surface consumers so nothing accesses
  // it before declaration — react-hooks/immutability.)
  const switchPane = (pane: 'code' | 'preview') => {
    if (activePane === 'code') {
      // The code pane's real scroll surface is CM6's internal scroller: its
      // wrapper's only child is height-locked to fill it (CodeEditor renders
      // `h-full` and the CM theme pins the editor to 100%), so the wrapper
      // itself never overflows. Preserve view.scrollDOM.scrollTop, falling
      // back to the wrapper when the view is not mounted (tests mock the
      // editor without a ref).
      const view = (codeEditorRef.current as any)?.getView?.() ?? null;
      codeScrollPos.current = view
        ? view.scrollDOM.scrollTop
        : codeContainerRef.current?.scrollTop ?? 0;
    } else {
      previewScrollPos.current = previewContainerRef.current?.scrollTop ?? 0;
    }
    setActiveView('editor');
    setActivePane(pane);
  };

  // Device-walk 2026-09-25: a pane SWITCH closes any open drawer, and so
  // does re-tapping the already-active segment (Code twice, Visual twice) —
  // the scrimless Files drawer leaves the segments tappable, so segment
  // taps are the natural "leave the drawer" gesture in every case.
  const closeDrawerOnSegmentTap = () => {
    onCloseDrawer?.();
  };
  const switchPaneAndCloseDrawer = (pane: 'code' | 'preview') => {
    closeDrawerOnSegmentTap();
    switchPane(pane);
  };

  // Device-walk 2026-09-25: topbar buttons dispatch through the codeViewRegistry
  // (they render outside this component's tree). The VIEW accessor itself is
  // registered by CodeEditor on mount (covers every host); this component only
  // owns the pane activator: a topbar tap made while Visual is active first
  // surfaces Code so the caret/command lands on a visible pane.
  useEffect(() => {
    registerCodePaneActivator(() => switchPane('code'));
    return () => {
      unregisterCodePaneActivator();
    };
    // [activePane] keeps the registered switchPane closure current, exactly
    // like the back-surface hook below.
  }, [activePane]);

  // D-15 (SHELL-03): while the preview pane is the active view it is a back
  // surface — Android back returns to Code via the same switchPane path as
  // the segmented toggle (scroll save included), never the coordinator's
  // minimizeApp floor. The [activePane] dep is what keeps the captured
  // switchPane closure reading the CURRENT pane — a [] memo would save the
  // code pane's scroll on back-exit instead of the preview pane's.
  
  // Restore scroll when entering code pane
  useEffect(() => {
    if (activePane === 'code' && codeContainerRef.current) {
      const view = (codeEditorRef.current as any)?.getView?.() ?? null;
      if (view) {
        view.scrollDOM.scrollTop = codeScrollPos.current;
      } else {
        codeContainerRef.current.scrollTop = codeScrollPos.current;
      }
    }
  }, [activePane]);

  // Restore scroll when entering preview pane
  useEffect(() => {
    if (activePane === 'preview' && previewContainerRef.current) {
      previewContainerRef.current.scrollTop = previewScrollPos.current;
    }
  }, [activePane]);

  const paneSegmentSelected = activeView === 'editor' && !aiDrawerOpen;
  const codeSegmentSelected = paneSegmentSelected && activePane === 'code';
  const previewSegmentSelected = paneSegmentSelected && activePane === 'preview';

  // Report the active destination upward for the top-bar history buttons.
  useEffect(() => {
    onActiveViewChange?.(activeView);
  }, [activeView, onActiveViewChange]);

  return (
    <div data-testid="mobile-workspace" className="flex flex-col h-full bg-[var(--surface-raised)]">
      {/* Segmented toggle — tablist semantics (iter-14 P2: three unrelated
          buttons announced nothing about the destination model). */}
      <div className="mx-3 mb-2 mt-3 flex rounded-[14px] border p-1" role="tablist" aria-label={t('workspace.viewLabel', 'View')} style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}>
        <button
          data-testid="mobile-workspace-tab-files"
          role="tab"
          aria-selected={activeView === 'files'}
          className={`relative flex-1 min-h-[48px] rounded-[12px] px-2 text-sm font-medium transition-[color,background-color,box-shadow] max-mobile-split:text-[13px] ${FOCUS_RING_CLASSES} ${
            activeView === 'files'
              ? 'text-[var(--accent)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold after:absolute after:bottom-[3px] after:left-1/2 after:h-[2px] after:w-[49px] after:-translate-x-1/2 after:rounded-full after:bg-[var(--accent)]'
              : 'text-[var(--text-secondary)]'
          }`}
          aria-label={t('nav.files')}
          onClick={() => { onCloseDrawer?.(); setActiveView('files'); }}
        >
          {t('nav.files')}
        </button>
        <button
          data-testid="mobile-workspace-tab-code"
          role="tab"
          aria-selected={codeSegmentSelected}
          className={`relative flex-1 min-h-[48px] rounded-[12px] px-2 text-sm font-medium transition-[color,background-color,box-shadow] max-mobile-split:text-[13px] ${FOCUS_RING_CLASSES} ${
            codeSegmentSelected
              ? 'text-[var(--accent)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold after:absolute after:bottom-[3px] after:left-1/2 after:h-[2px] after:w-[49px] after:-translate-x-1/2 after:rounded-full after:bg-[var(--accent)]'
              : 'text-[var(--text-secondary)]'
          }`}
          aria-label={t('workspace.toggle.code')}
          onClick={() => switchPaneAndCloseDrawer('code')}
        >
          {t('workspace.toggle.code')}
        </button>
        <button
          data-testid="mobile-workspace-tab-visual"
          role="tab"
          aria-selected={previewSegmentSelected}
          className={`relative flex-1 min-h-[48px] rounded-[12px] px-2 text-sm font-medium transition-[color,background-color,box-shadow] max-mobile-split:text-[13px] ${FOCUS_RING_CLASSES} ${
            previewSegmentSelected
              ? 'text-[var(--accent)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold after:absolute after:bottom-[3px] after:left-1/2 after:h-[2px] after:w-[49px] after:-translate-x-1/2 after:rounded-full after:bg-[var(--accent)]'
              : 'text-[var(--text-secondary)]'
          }`}
          aria-label={t('workspace.toggle.visual')}
          onClick={() => switchPaneAndCloseDrawer('preview')}
        >
          {t('workspace.toggle.visual')}
        </button>
        {/* AI remains available through the app menu; these three segments
            mirror the Files / Code / Visual destinations in the mobile UI. */}
        {/* oxlint-disable-next-line eslint/no-constant-condition */}
        {false ? (
          <button
            data-testid="mobile-workspace-tab-ai"
            aria-pressed={aiDrawerOpen}
            className={`relative flex-1 min-h-[48px] rounded-[12px] px-2 text-sm font-medium transition-[color,background-color,box-shadow] max-mobile-split:text-[13px] ${FOCUS_RING_CLASSES} ${
              aiDrawerOpen
                ? 'text-[var(--accent)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold after:absolute after:bottom-[3px] after:left-1/2 after:h-[2px] after:w-[49px] after:-translate-x-1/2 after:rounded-full after:bg-[var(--accent)]'
                : 'text-[var(--text-secondary)]'
            }`}
            aria-label={t('nav.ai')}
            onClick={() => onOpenAIDrawer?.()}
          >
            {t('nav.ai')}
          </button>
        ) : null}
      </div>

      <div className={`flex-1 min-h-0 relative ${activeView === 'files' ? '' : 'hidden'}`} data-testid="mobile-files-screen">
        <Sidebar
          mobileScreen
          activeDiagramId={activeDiagramId}
          onOpenDiagram={(id) => { onOpenDiagram?.(id); setActivePane('code'); setActiveView('editor'); }}
          onRefresh={onRefreshFiles ?? (() => {})}
          onDiagramDeleted={onDiagramDeleted}
          key={filesRefreshKey}
        />
      </div>

      {/* Editor panes stay mounted while Files is visible to preserve editor state. */}
      <div className={`flex-1 min-h-0 relative ${activeView === 'editor' ? '' : 'hidden'}`}>
        {/* Code pane: flex column; the editor scroll area fills the pane and
            the persisted collapsible chrome sits fixed at the pane bottom,
            outside the scroll. The scroll restore effect and the switch-path
            save (switchPane) both target the inner wrapper via the same ref;
            the wrapper itself never scrolls (see switchPane). EDIT-02
            mobile-tree-only affordance (D-08). */}
        <div
          className={`absolute inset-0 flex flex-col max-mobile-split:text-[14px] ${
            activePane === 'code' ? '' : 'hidden'
          }`}
        >
          {/* CR-01 (36.1.1 review): content region = everything ABOVE the
              collapsible chrome. This wrapper wraps the editor scroll child
              and sizes the region above the chrome block (collapsed chevron
              row or expanded ExtraKeysRow). The scroll child sizes with
              h-full: the wrapper owns the flex sizing. */}
          <div className="relative flex-1 min-h-0">
            <div ref={codeContainerRef} className="h-full overflow-auto">
              <CodeEditor
                ref={codeEditorRef}
                value={value}
                onChange={onChange}
                theme={theme}
                onSave={onSave}
              />
            </div>
            {/* D-4 history: the floating undo/redo pill was removed at the
                2026-09-25 device walk (commit d1a62c2) and undo/redo went
                keyboard-only; the 2026-09-25 topbar cursor-arrow siblings were
                removed at the user's request (2026-10-04) when dedicated
                undo/redo buttons were restored to the topbar. Undo/redo now
                dispatch through the shared historyActions seam (see
                MobileTopBar and the codeViewRegistry header). */}
          </div>
          {/* D-4: persisted collapsible enclosure around the REMAINING
              fixed-bottom chrome (ExtraKeysRow only). Collapsed by default;
              the chevron carries aria-expanded + a stable accessible name;
              the fold is a CSS `hidden` class toggle (the file's keep-alive
              idiom) — no fold animation (prefers-reduced-motion trivially
              honored); the chevron's 150ms rotate matches the Sidebar idiom. */}
          <div
            className="shrink-0 border-t"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-base)',
              // Reserve ONLY the native ad overlay's height here: the parent
              // workspace slot already carries the safe-area inset via
              // .safe-bottom (MobileLayout), so adding it again doubled the
              // dead band between the shortcuts band and the banner (critique
              // session gap report).
              paddingBottom: 'var(--ms-ad-banner-height, 0px)',
            }}
          >
            <button
              type="button"
              data-testid="code-chrome-collapse-toggle"
              aria-expanded={!chromeCollapsed}
              aria-controls="code-chrome-collapsible"
              aria-label={t('workspace.chromeShortcuts')}
              onClick={toggleChromeCollapsed}
              className={`group relative flex w-full items-center justify-between px-4 min-h-[52px] min-w-[48px] text-[13px] font-medium ${FOCUS_RING_CLASSES}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-100"
                style={{ background: 'var(--state-pressed)' }}
              />
              <span className="relative" style={{ color: 'var(--text-tertiary)' }}>
                {t('workspace.chromeShortcuts')}
              </span>
              <ChevronDown
                size={20}
                aria-hidden="true"
                className={`shrink-0 transition-transform duration-150 ${chromeCollapsed ? '' : 'rotate-180'}`}
                style={{ color: 'var(--text-tertiary)' }}
              />
            </button>
            <div
              id="code-chrome-collapsible"
              data-testid="code-chrome-collapsible"
              className={chromeCollapsed ? 'hidden' : ''}
            >
              <ExtraKeysRow getView={() => codeEditorRef.current?.getView() ?? null} />
            </div>
          </div>
        </div>
        {/* overflow-x-hidden (device walk 2026-10-07): this pane is the
            preview's VERTICAL scroller only — the diagram canvas owns
            horizontal pan in its own inner scroller. Any horizontal spill
            inside the preview (e.g. an absolutely-positioned strip escaping
            its clip) used to make the whole pane touch-pannable sideways,
            dragging the workspace with a toolbar swipe. */}
        <div
          ref={previewContainerRef}
          className={`absolute inset-0 overflow-y-auto overflow-x-hidden ${
            activePane === 'preview' ? '' : 'hidden'
          }`}
        >
          <PreviewPanel content={value} theme={theme} themeId={themeId} onError={onPreviewError} onChange={onChange} onOpenCode={() => switchPane('code')} />
        </div>
      </div>
    </div>
  );
}
