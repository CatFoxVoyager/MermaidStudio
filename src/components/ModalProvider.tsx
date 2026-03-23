import { TemplateLibrary } from '@/components/modals/diagram/TemplateLibrary';
import { VersionHistory } from '@/components/modals/diagram/VersionHistory';
import { ExportModal } from '@/components/modals/diagram/ExportModal';
import { CommandPalette } from '@/components/modals/tools/CommandPalette';
import { KeyboardShortcuts } from '@/components/modals/tools/KeyboardShortcuts';
import { BackupPanel } from '@/components/modals/tools/BackupPanel';
import { SaveTemplateModal } from '@/components/modals/diagram/SaveTemplateModal';
import { FullscreenPreview } from '@/preview/FullscreenPreview';
import { AISettingsModal } from '@/ai/AISettingsModal';
import { Toast } from '@/components/shared/Toast';
import type { Diagram } from '@/types';

interface ModalProviderProps {
  // Modal states
  showTemplates: boolean;
  showHistory: boolean;
  showExport: boolean;
  showPalette: boolean;
  showHelp: boolean;
  showBackup: boolean;
  showSaveTemplate: boolean;
  showAISettings: boolean;
  showFullscreen: boolean;
  // Callbacks
  onCloseTemplates: () => void;
  onCloseHistory: () => void;
  onCloseExport: () => void;
  onClosePalette: () => void;
  onCloseHelp: () => void;
  onCloseBackup: () => void;
  onCloseSaveTemplate: () => void;
  onCloseAISettings: () => void;
  onCloseFullscreen: () => void;
  // Modal-specific props
  activeTab?: { id: string; title: string; content: string; diagram_id: string } | null;
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
  showHelp,
  showBackup,
  showSaveTemplate,
  showAISettings,
  showFullscreen,
  onCloseTemplates,
  onCloseHistory,
  onCloseExport,
  onClosePalette,
  onCloseHelp,
  onCloseBackup,
  onCloseSaveTemplate,
  onCloseAISettings,
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
        <TemplateLibrary
          onSelect={handleTemplateSelect}
          onClose={onCloseTemplates}
        />
      )}
      {showHistory && activeTab && handleRestore && (
        <VersionHistory
          diagramId={activeTab.diagram_id}
          currentContent={activeTab.content}
          onRestore={handleRestore}
          onClose={onCloseHistory}
        />
      )}
      {showExport && activeTab && handleCopyLink && (
        <ExportModal
          diagramTitle={activeTab.title}
          diagramContent={activeTab.content}
          onClose={onCloseExport}
          onCopyLink={handleCopyLink}
        />
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
          onExport={() => { onClosePalette(); onCloseExport(); }}
          theme={theme}
          diagrams={diagrams}
          onOpenDiagram={onOpenDiagram}
        />
      )}
      {showAISettings && setAiSettingsKey && (
        <AISettingsModal
          onClose={() => { onCloseAISettings(); setAiSettingsKey(k => k + 1); }}
        />
      )}
      {showHelp && <KeyboardShortcuts onClose={onCloseHelp} />}
      {showBackup && (
        <BackupPanel
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
          onClose={onCloseFullscreen}
        />
      )}
      {toasts && dismiss && (
        <Toast toasts={toasts} dismiss={dismiss} />
      )}
    </>
  );
}
