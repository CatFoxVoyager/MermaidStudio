import { lazy, Suspense } from 'react';
import { CommandPalette } from '@/components/modals/tools/CommandPalette';
import { BackupPanel } from '@/components/modals/tools/BackupPanel';
import { SaveTemplateModal } from '@/components/modals/diagram/SaveTemplateModal';
import { FullscreenPreview } from '@/preview/FullscreenPreview';
import { AISettingsModal } from '@/ai/AISettingsModal';
import { KeyboardShortcuts } from '@/components/modals/tools/KeyboardShortcuts';
import { Toast } from '@/components/shared/Toast';
import type { Diagram, Template } from '@/types';

// Lazy load heavy modal components
const LazyTemplateLibrary = lazy(() => import('@/components/modals/diagram/TemplateLibrary').then(m => ({ default: m.TemplateLibrary })));
const LazyVersionHistory = lazy(() => import('@/components/modals/diagram/VersionHistory').then(m => ({ default: m.VersionHistory })));
const LazyExportModal = lazy(() => import('@/components/modals/diagram/ExportModal').then(m => ({ default: m.ExportModal })));

interface ModalProviderProps {
  // Modal states
  showTemplates: boolean;
  showHistory: boolean;
  showExport: boolean;
  showPalette: boolean;
  showBackup: boolean;
  showSaveTemplate: boolean;
  showAISettings: boolean;
  showHelp: boolean;
  showFullscreen: boolean;
  // Callbacks
  onCloseTemplates: () => void;
  onCloseHistory: () => void;
  onCloseExport: () => void;
  onClosePalette: () => void;
  onCloseBackup: () => void;
  onCloseSaveTemplate: () => void;
  onCloseAISettings: () => void;
  onCloseHelp: () => void;
  onCloseFullscreen: () => void;
  // Modal-specific props
  activeTab?: { id: string; title: string; content: string; diagram_id: string; themeId?: string } | null;
  handleTemplateSelect?: (template: Template) => void;
  handleRestore?: (content: string) => void;
  handleCopyLink?: () => void;
  newDiagram?: () => void;
  handleNewFolder?: () => void;
  diagrams?: Diagram[];
  onOpenDiagram?: (id: string) => void;
  toggleAI?: () => void;
  toggleTheme?: () => void;
  theme?: 'light' | 'dark';
  aiSettingsKey?: number;
  setAiSettingsKey?: (k: number | ((prev: number) => number)) => void;
  refresh?: () => void;
  showToast?: (msg: string) => void;
  toasts?: Array<{ id: string; message: string; type: string }>;
  dismiss?: (id: string) => void;
}

export function ModalProvider({
  showTemplates,
  showHistory,
  showExport,
  showPalette,
  showBackup,
  showSaveTemplate,
  showAISettings,
  showHelp,
  showFullscreen,
  onCloseTemplates,
  onCloseHistory,
  onCloseExport,
  onClosePalette,
  onCloseBackup,
  onCloseSaveTemplate,
  onCloseAISettings,
  onCloseHelp,
  onCloseFullscreen,
  activeTab,
  handleTemplateSelect,
  handleRestore,
  handleCopyLink,
  newDiagram,
  handleNewFolder,
  diagrams,
  onOpenDiagram,
  toggleAI,
  toggleTheme,
  theme,
  setAiSettingsKey,
  refresh,
  showToast,
  toasts,
  dismiss,
}: ModalProviderProps) {
  return (
    <>
      {showTemplates && handleTemplateSelect && (
        <Suspense fallback={null}>
          <LazyTemplateLibrary
            isOpen
            onSelect={handleTemplateSelect}
            onClose={onCloseTemplates}
          />
        </Suspense>
      )}
      {showHistory && activeTab && handleRestore && (
        <Suspense fallback={null}>
          <LazyVersionHistory
            diagramId={activeTab.diagram_id}
            currentContent={activeTab.content}
            onRestore={handleRestore}
            onClose={onCloseHistory}
          />
        </Suspense>
      )}
      {showPalette && newDiagram && handleNewFolder && diagrams && onOpenDiagram && toggleTheme && (
        <CommandPalette
          onClose={onClosePalette}
          onNewDiagram={newDiagram}
          onNewFolder={handleNewFolder}
          onOpenTemplates={() => { onClosePalette(); onCloseTemplates(); }}
          onToggleHistory={() => { onClosePalette(); onCloseHistory(); }}
          onToggleAI={toggleAI}
          onToggleTheme={toggleTheme}
          theme={theme}
          diagrams={diagrams}
          onOpenDiagram={onOpenDiagram}
        />
      )}
      {showExport && activeTab && handleCopyLink && (
        <Suspense fallback={null}>
          <LazyExportModal
            isOpen
            diagramTitle={activeTab.title}
            diagramContent={activeTab.content}
            onClose={onCloseExport}
            onCopyLink={handleCopyLink}
          />
        </Suspense>
      )}
      {showAISettings && setAiSettingsKey && (
        <AISettingsModal
          onClose={() => { onCloseAISettings(); setAiSettingsKey(k => k + 1); }}
        />
      )}
      {showHelp && (
        <KeyboardShortcuts
          onClose={onCloseHelp}
        />
      )}
      {showBackup && (
        <BackupPanel
          isOpen
          onClose={onCloseBackup}
          onImported={(msg) => { showToast?.(msg); refresh?.(); }}
        />
      )}
      {showSaveTemplate && activeTab && showToast && (
        <SaveTemplateModal
          content={activeTab.content}
          onClose={onCloseSaveTemplate}
          onSaved={() => showToast('Template saved')}
        />
      )}
      {showFullscreen && activeTab && (
        <FullscreenPreview
          content={activeTab.content}
          themeId={activeTab.themeId}
          onClose={onCloseFullscreen}
        />
      )}
      {toasts && dismiss && (
        <Toast toasts={toasts} dismiss={dismiss} />
      )}
    </>
  );
}
