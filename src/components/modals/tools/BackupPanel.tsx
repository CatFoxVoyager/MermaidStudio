import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, TriangleAlert } from 'lucide-react';
import { exportBackup, importBackup, getDiagrams, getFolders } from '@/services/storage/database';
import { validateBackupData } from '@/utils/sanitization';
import type { BackupData } from '@/types';
import { Modal } from '@/components/shared/Modal';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  onImported: (msg: string) => void;
}

/** Counts of what an import would replace, captured before confirming. */
interface ReplaceCost {
  validated: BackupData;
  currentDiagrams: number;
  currentFolders: number;
}

export function BackupPanel({ isOpen = true, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  // Import replaces the WHOLE dataset — the most destructive action in the
  // product. The validated file parks here until the user confirms the cost
  // (critique iter-5 P1: no confirmation, no way back).
  const [pendingReplace, setPendingReplace] = useState<ReplaceCost | null>(null);

  // Cancelling the confirm unmounts that view — without re-focusing the
  // import button, focus falls to BODY and Escape goes silently dead
  // (critique iter-7 P2, proven live). Mirror defect (iter-8 P2): ENTERING
  // the confirm unmounts the focused import button too — focus goes to the
  // Cancel button so Escape works from the first keystroke.
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pendingReplace) {cancelRef.current?.focus();}
    else {importBtnRef.current?.focus();}
  }, [pendingReplace]);

  async function handleExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {return;}
    // Pre-check file size before reading
    if (file.size > 10 * 1024 * 1024) {
      onImported(t('backup.invalidFile'));
      if (fileRef.current) {fileRef.current.value = '';}
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = JSON.parse(reader.result as string);
        let validated: BackupData;
        try {
          validated = validateBackupData(raw);
        } catch (validationErr) {
          onImported(validationErr instanceof Error ? validationErr.message : t('backup.invalidFile'));
          return;
        }
        // Park for confirmation — never replace silently. Capture the real
        // cost (current counts) so the dialog can name what is lost.
        const [currentDiagrams, currentFolders] = await Promise.all([getDiagrams(), getFolders()]);
        setPendingReplace({ validated, currentDiagrams: currentDiagrams.length, currentFolders: currentFolders.length });
      } catch {
        onImported(t('backup.parseFailed'));
      }
    };
    reader.readAsText(file);
    if (fileRef.current) {fileRef.current.value = '';}
  }

  async function confirmReplace() {
    if (!pendingReplace) {return;}
    const result = await importBackup(pendingReplace.validated);
    const parts = [];
    if (result.diagrams > 0) {parts.push(t('backup.partDiagrams', { count: result.diagrams }));}
    if (result.folders > 0) {parts.push(t('backup.partFolders', { count: result.folders }));}
    if (pendingReplace.validated.settings) {parts.push(t('backup.partSettings'));}
    onImported(t('backup.imported', { details: parts.join(', ') }));
    setPendingReplace(null);
    onClose();
  }

  const isMobile = useMediaQuery('(max-width: 767.98px)');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pendingReplace ? t('backup.replaceConfirmTitle') : t('backup.title')}
      size="md"
      position={isMobile ? 'bottom' : 'center'}
    >
      {pendingReplace ? (
        <div className="p-5 space-y-4" data-testid="backup-replace-confirm">
          <div className="flex items-start gap-3 rounded-xl border p-3"
            style={{ borderColor: 'var(--danger)', background: 'var(--danger-dim)' }}>
            <TriangleAlert size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {pendingReplace.currentDiagrams === 0 && pendingReplace.currentFolders === 0
                ? t('backup.replaceConfirmEmpty')
                : t('backup.replaceConfirmLead', {
                    details: [
                      t('backup.confirmDiagrams', { count: pendingReplace.currentDiagrams }),
                      t('backup.confirmFolders', { count: pendingReplace.currentFolders }),
                    ].join(', '),
                  })}
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('backup.replaceConfirmHint')}
          </p>
          <div className="flex gap-2">
            <button ref={cancelRef} onClick={() => setPendingReplace(null)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              {t('common.cancel')}
            </button>
            <button onClick={confirmReplace}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: 'var(--danger)' }}>
              {t('backup.replaceEverything')}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <button onClick={handleExport}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all duration-150"
            style={{ background: 'var(--surface-floating)', color: 'var(--text-primary)' }}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Download size={18} />
            </span>
            <div>
              <p className="text-sm font-medium">{t('backup.exportAll')}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('backup.exportAllDesc')}</p>
            </div>
          </button>

          <button ref={importBtnRef} onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-all duration-150"
            style={{ background: 'var(--surface-floating)', color: 'var(--text-primary)' }}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Upload size={18} />
            </span>
            <div>
              <p className="text-sm font-medium">{t('backup.importBackup')}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('backup.importBackupDesc')}</p>
            </div>
          </button>

          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      )}
    </Modal>
  );
}
