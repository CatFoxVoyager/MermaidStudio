import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { PreviewPanel } from '@/components/preview/PreviewPanel';

interface MobileWorkspaceProps {
  value: string;
  onChange: (v: string) => void;
  theme: 'dark' | 'light';
  themeId?: string;
  onPreviewError?: (error: string | null) => void;
  onSave?: () => void;
}

export function MobileWorkspace({
  value,
  onChange,
  theme,
  themeId,
  onPreviewError,
  onSave,
}: MobileWorkspaceProps) {
  const { t } = useTranslation();
  const [activePane, setActivePane] = useState<'code' | 'preview'>('code');

  // Scroll container refs
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Scroll position refs
  const codeScrollPos = useRef(0);
  const previewScrollPos = useRef(0);

  // Save scroll when leaving code pane
  useEffect(() => {
    if (activePane === 'preview' && codeContainerRef.current) {
      codeScrollPos.current = codeContainerRef.current.scrollTop;
    }
  }, [activePane]);

  // Restore scroll when entering code pane
  useEffect(() => {
    if (activePane === 'code' && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeScrollPos.current;
    }
  }, [activePane]);

  // Save scroll when leaving preview pane
  useEffect(() => {
    if (activePane === 'code' && previewContainerRef.current) {
      previewScrollPos.current = previewContainerRef.current.scrollTop;
    }
  }, [activePane]);

  // Restore scroll when entering preview pane
  useEffect(() => {
    if (activePane === 'preview' && previewContainerRef.current) {
      previewContainerRef.current.scrollTop = previewScrollPos.current;
    }
  }, [activePane]);

  return (
    <div data-testid="mobile-workspace" className="flex flex-col h-full">
      {/* Segmented toggle */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          data-testid="mobile-workspace-tab-code"
          className={`flex-1 py-3 text-sm font-medium transition-colors max-mobile-split:text-[13px] ${
            activePane === 'code'
              ? 'text-[var(--accent)] border-b-2'
              : 'text-[var(--text-secondary)]'
          }`}
          style={{ borderColor: activePane === 'code' ? 'var(--accent)' : undefined }}
          aria-pressed={activePane === 'code'}
          aria-label={t('workspace.toggle.code')}
          onClick={() => setActivePane('code')}
        >
          {t('workspace.toggle.code')}
        </button>
        <button
          data-testid="mobile-workspace-tab-preview"
          className={`flex-1 py-3 text-sm font-medium transition-colors max-mobile-split:text-[13px] ${
            activePane === 'preview'
              ? 'text-[var(--accent)] border-b-2'
              : 'text-[var(--text-secondary)]'
          }`}
          style={{ borderColor: activePane === 'preview' ? 'var(--accent)' : undefined }}
          aria-pressed={activePane === 'preview'}
          aria-label={t('workspace.toggle.preview')}
          onClick={() => setActivePane('preview')}
        >
          {t('workspace.toggle.preview')}
        </button>
      </div>

      {/* Panes - keep-alive via CSS hidden, NOT conditional rendering */}
      <div className="flex-1 relative">
        <div
          ref={codeContainerRef}
          className={`absolute inset-0 overflow-auto max-mobile-split:text-[14px] ${
            activePane === 'code' ? '' : 'hidden'
          }`}
        >
          <CodeEditor value={value} onChange={onChange} theme={theme} onSave={onSave} />
        </div>
        <div
          ref={previewContainerRef}
          className={`absolute inset-0 overflow-auto ${
            activePane === 'preview' ? '' : 'hidden'
          }`}
        >
          <PreviewPanel content={value} theme={theme} themeId={themeId} onError={onPreviewError} />
        </div>
      </div>
    </div>
  );
}
