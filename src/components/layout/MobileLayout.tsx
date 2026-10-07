import { lazy, Suspense, useState, type ReactNode } from 'react';
import { MobileMenuSheet } from '@/components/mobile/MobileMenuSheet';
import { useTranslation } from 'react-i18next';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { useMobileShellContext, type MobileShellApi } from '@/hooks/useMobileShell';
import { Modal } from '@/components/shared/Modal';
import { MobileWorkspace } from '@/components/layout/MobileWorkspace';

// Lazy load AIPanel to preserve chunk-split strategy (matches desktop pattern)
const LazyAIPanel = lazy(() => import('@/ai/AIPanel').then(m => ({ default: m.AIPanel })));

// Lazy load style panels to preserve chunk-split strategy (Phase 17)
const LazyDiagramColorsPanel = lazy(() => import('@/components/modals/settings/DiagramColorsPanel').then(m => ({ default: m.DiagramColorsPanel })));
const LazyAdvancedStylePanel = lazy(() => import('@/components/modals/settings/AdvancedStylePanel').then(m => ({ default: m.AdvancedStylePanel })));

interface MobileLayoutProps {
  theme: 'light' | 'dark';
  // TopBar actions
  onNewDiagram?: () => void;
  onSave: () => void;
  onShowExport?: () => void;
  onOpenCommandPalette: () => void;
  onToggleTheme?: () => void;
  onOpenAbout?: () => void;  // optional — surfaced as the MobileTopBar theme toggle (G-26-3)
  onOpenBackup?: () => void;
  onOpenReleaseNotes?: () => void;
  /** Active tab dirty state, surfaced by the TopBar Save button. */
  isDirty?: boolean;
  /** Last real persist timestamp — drives the TopBar saved-flash. */
  lastSavedAt?: string;
  /** Active diagram's title — shown in the menu sheet so the editor names
   *  what you are editing (iter-11 wayfinding: no surface named it). */
  activeDiagramTitle?: string;
  // Files view props
  onOpenDiagram: (id: string) => void;
  activeDiagramId?: string | null;
  onRefresh: () => void;
  onDiagramDeleted?: (diagramIds: string[]) => void;
  refreshKey: number;
  // AI drawer props
  currentContent: string;
  onApply: (content: string) => void;
  onOpenSettings: () => void;
  settingsKey: number;
  fixMode?: boolean;
  fixTrigger?: number;
  previewError?: string | null;
  // Workspace props (Phase 16 integration)
  value: string;
  onContentChange: (content: string) => void;
  onSaveTab: () => void;
  themeId?: string;
  onPreviewError?: (error: string | null) => void;
  // Phase 17 style panel props
  defaultThemeId?: string;
  onSetDefaultTheme?: (theme: any) => void;
  onThemeIdChange?: (themeId: string | null) => void;
}

export function MobileLayout({
  theme,
  onNewDiagram,
  onSave,
  onShowExport,
  onOpenCommandPalette,
  onToggleTheme,
  onOpenDiagram,
  activeDiagramId,
  onRefresh,
  onDiagramDeleted,
  onOpenAbout,
  onOpenBackup,
  onOpenReleaseNotes,
  isDirty,
  lastSavedAt,
  activeDiagramTitle,
  refreshKey,
  currentContent,
  onApply,
  onOpenSettings,
  settingsKey,
  fixMode,
  fixTrigger,
  previewError,
  value,
  onContentChange,
  onSaveTab,
  themeId,
  onPreviewError,
  defaultThemeId,
  onSetDefaultTheme,
  onThemeIdChange,
}: MobileLayoutProps): ReactNode {
  const { t } = useTranslation();
  const { openDrawer, setActiveDrawer, closeDrawer } = useMobileShellContext();
  const [menuOpen, setMenuOpen] = useState(false);
  // Mirrors MobileWorkspace's active destination so the top bar can disable
  // undo/redo while Files is active (iter-9: invisible no-ops there).
  const [activeView, setActiveView] = useState<'files' | 'editor'>('files');
  // Phase 32 banner bridge (BAN-01..03): view transitions -> facade calls.
  // Mobile-only by construction — desktop never mounts MobileLayout.
  // Phase 33 interstitial bridge (INT-01..INT-05): the edit -> files view
  // edge is the only counted transition — persist-confirmed (the autosave
  // settles first), post-arrival, fire-and-forget (D-04). Mobile-only by
  // construction — desktop never mounts MobileLayout.

  return (
    <div
      className={`flex flex-col h-dvh overflow-hidden antialiased ${theme === 'dark' ? 'dark' : ''}`}
      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
      data-testid="mobile-layout-root"
    >
      {/* TopBar slot - safe-area applied per-zone (Phase 15 fills this) */}
      <div className="safe-top" data-testid="mobile-topbar-slot">
        <MobileTopBar
          onToggleTheme={onToggleTheme}
          onSave={onSave}
          onExport={onShowExport}
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenAbout={onOpenAbout}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          historyUnavailable={activeView === 'files'}
        />
      </div>

      {/* Workspace slot - flexible middle area (Phase 16 fills this) */}
      <div className="flex-1 min-h-0 safe-bottom" data-testid="mobile-workspace-slot">
        <MobileWorkspace
          value={value}
          onChange={onContentChange}
          theme={theme}
          themeId={themeId}
          onSave={onSaveTab}
          onPreviewError={onPreviewError}
          onOpenDiagram={onOpenDiagram}
          activeDiagramId={activeDiagramId}
          onRefreshFiles={onRefresh}
          onDiagramDeleted={onDiagramDeleted}
          filesRefreshKey={refreshKey}
          onOpenAIDrawer={() => setActiveDrawer('ai')}
          onCloseDrawer={closeDrawer}
          aiDrawerOpen={openDrawer === 'ai'}
          onActiveViewChange={setActiveView}
        />
      </div>

      {/* Banner slot — RETIRED from the layout flow (device-walk 2026-09-25:
          BANNER_MARGIN_DP=0 makes the native AdView an overlay on the
          WebView's bottom edge; an in-flow reserve band made the whole
          workspace jump whenever the adaptive banner loaded or resized —
          the prev/next chrome visibly moved). The banner overlays content
          now; overlays that must clear it (FAB, Snackbar, Toast, sheets)
          keep consuming --ms-ad-banner-height read-only. The element stays
          mounted as a 0px no-op only to preserve the Phase 32 testid
          contract; it must never regain height in the flow. */}
      <div
        className="w-full flex-none"
        style={{ height: '0px' }}
        data-testid="mobile-ad-banner-slot"
      />

      {/* AI drawer - AIPanel in Modal position=right. Web-only in v1
          (PLAT-05): on native the drawer can never open, so the lazy panel
          never mounts. */}
      {openDrawer === 'ai' && (
        <Suspense fallback={null}>
          <Modal
            isOpen={openDrawer === 'ai'}
            onClose={closeDrawer}
            title={t('ai.panelTitle')}
            position="right"
          >
            <LazyAIPanel
              currentContent={currentContent}
              onApply={onApply}
              onClose={closeDrawer}
              onOpenSettings={onOpenSettings}
              settingsKey={settingsKey}
              fixMode={fixMode}
              fixTrigger={fixTrigger}
              previewError={previewError}
            />
          </Modal>
        </Suspense>
      )}

      {/* Colors drawer - DiagramColorsPanel in Modal position=right (Phase 17) */}
      {openDrawer === 'colors' && (
        <Suspense fallback={null}>
          <Modal
            isOpen={openDrawer === 'colors'}
            onClose={closeDrawer}
            title={t('editor.diagramColors')}
            position="right"
          >
            <LazyDiagramColorsPanel
              isOpen
              onClose={closeDrawer}
              currentContent={value}
              onContentChange={onContentChange}
              theme={theme}
              currentThemeId={themeId}
              onThemeIdChange={onThemeIdChange}
              defaultThemeId={defaultThemeId}
              onSetDefaultTheme={onSetDefaultTheme}
            />
          </Modal>
        </Suspense>
      )}

      {/* AdvancedStyle drawer - AdvancedStylePanel in Modal position=right (Phase 17) */}
      {openDrawer === 'advanced' && (
        <Suspense fallback={null}>
          <Modal
            isOpen={openDrawer === 'advanced'}
            onClose={closeDrawer}
            title={t('editor.advancedStyling')}
            position="right"
          >
            <LazyAdvancedStylePanel
              isOpen
              onClose={closeDrawer}
              currentContent={value}
              onContentChange={onContentChange}
              theme={theme}
            />
          </Modal>
        </Suspense>
      )}

      {/* Mobile Menu Sheet (Figma Screen E) */}
      <MobileMenuSheet
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeTitle={activeDiagramTitle}
        onOpenCommands={() => {
          setMenuOpen(false);
          onOpenCommandPalette();
        }}
        onOpenBackup={() => {
          setMenuOpen(false);
          onOpenBackup?.();
        }}
        onOpenReleaseNotes={() => {
          setMenuOpen(false);
          onOpenReleaseNotes?.();
        }}
        onOpenAbout={() => {
          setMenuOpen(false);
          onOpenAbout?.();
        }}
        onOpenSettings={() => {
          setMenuOpen(false);
          onOpenSettings();
        }}
        onOpenAI={() => {
          setMenuOpen(false);
          setActiveDrawer('ai');
        }}
      />
    </div>
  );
}
