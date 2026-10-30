import { useTranslation } from 'react-i18next';

// The ONE chunk-error surface (29-02): rendered as the explicit fallback of
// every ErrorBoundary wrapping a lazy boundary. An uncaught lazy rejection
// unmounts up to the nearest boundary (a blank surface, T-29-05); this keeps
// reload one click away. No auto-retry — manual reload matches the boot
// splash's 12s convention, and tabs persist in IndexedDB so a reload loses
// nothing. Ink-on-surface, no headings: the error line renders at the Small
// role (14px/400), the button label at 14px/600 (UI-SPEC Typography).
export function ChunkErrorFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
      <span className="text-sm leading-normal opacity-80">{t('common.chunkLoadError')}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-sm font-semibold underline-offset-2 hover:underline"
      >
        {t('update.reload')}
      </button>
    </div>
  );
}
