import { lazy, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useMobileShell } from '@/hooks/useMobileShell';
import { Modal } from '@/components/shared/Modal';
import { Sidebar } from '@/sidebar/Sidebar';
import { MobileWorkspace } from '@/components/layout/MobileWorkspace';

// Lazy load AIPanel to preserve chunk-split strategy (matches desktop pattern)
const LazyAIPanel = lazy(() => import('@/ai/AIPanel').then(m => ({ default: m.AIPanel })));

interface MobileLayoutProps {
  theme: 'light' | 'dark';
  // TopBar actions
  onNewDiagram?: () => void;
  onSave: () => void;
  onOpenCommandPalette: () => void;
  // Sidebar drawer props
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
}

export function MobileLayout({
  theme,
  onNewDiagram,
  onSave,
  onOpenCommandPalette,
  onOpenDiagram,
  activeDiagramId,
  onRefresh,
  onDiagramDeleted,
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
}: MobileLayoutProps): ReactNode {
  const { t } = useTranslation();
  const { activeView, openDrawer, setActiveView, setActiveDrawer, closeDrawer } = useMobileShell();

  return (
    <div
      className={`flex flex-col h-dvh overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
      data-testid="mobile-layout-root"
    >
      {/* TopBar slot - safe-area applied per-zone (Phase 15 fills this) */}
      <div className="safe-top border-b" style={{ borderColor: 'var(--border-subtle)' }} data-testid="mobile-topbar-slot">
        <MobileTopBar
          onNewDiagram={onNewDiagram}
          onSave={onSave}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      </div>

      {/* Workspace slot - flexible middle area (Phase 16 fills this) */}
      <div className="flex-1 min-h-0" data-testid="mobile-workspace-slot">
        <MobileWorkspace
          value={value}
          onChange={onContentChange}
          theme={theme}
          themeId={themeId}
          onSave={onSaveTab}
          onPreviewError={onPreviewError}
        />
      </div>

      {/* Bottom nav slot - safe-area + z-index token (Phase 15 fills this) */}
      <div
        className="safe-bottom z-[var(--z-bottom-nav)]"
        data-testid="mobile-bottomnav-slot"
      >
        <MobileBottomNav activeView={activeView} setActiveView={setActiveView} setActiveDrawer={setActiveDrawer} />
      </div>

      {/* Files drawer - Sidebar in Modal position=right */}
      {openDrawer === 'files' && (
        <Modal
          isOpen={openDrawer === 'files'}
          onClose={closeDrawer}
          title={t('sidebar.explorer')}
          position="right"
        >
          <Sidebar
            onOpenDiagram={onOpenDiagram}
            activeDiagramId={activeDiagramId ?? undefined}
            onRefresh={onRefresh}
            onDiagramDeleted={onDiagramDeleted}
            key={refreshKey}
          />
        </Modal>
      )}

      {/* AI drawer - AIPanel in Modal position=right */}
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
    </div>
  );
}
