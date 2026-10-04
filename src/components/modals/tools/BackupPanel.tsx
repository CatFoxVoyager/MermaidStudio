import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, X, HardDrive } from 'lucide-react';
import { exportBackup, importBackup } from '@/services/storage/database';
import { validateBackupData } from '@/utils/sanitization';
import type { BackupData } from '@/types';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  onImported: (msg: string) => void;
}

export function BackupPanel({ isOpen = true, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Pull focus into the dialog on open — without this, Escape and Tab stay
  // attached to the page behind the modal (critique iter-4 P1, proven live).
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

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

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
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
        const result = await importBackup(validated);
        const parts = [];
        if (result.diagrams > 0) {parts.push(t('backup.partDiagrams', { count: result.diagrams }));}
        if (result.folders > 0) {parts.push(t('backup.partFolders', { count: result.folders }));}
        if (validated.settings) {parts.push(t('backup.partSettings'));}
        onImported(t('backup.imported', { details: parts.join(', ') }));
        onClose();
      } catch {
        onImported(t('backup.parseFailed'));
      }
    };
    reader.readAsText(file);
    if (fileRef.current) {fileRef.current.value = '';}
  }

  if (!isOpen) {return null;}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') {onClose();} }}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-panel-title"
        className="w-full max-w-md flex flex-col rounded-xl shadow-2xl overflow-hidden outline-hidden"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <HardDrive size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span id="backup-panel-title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('backup.title')}</span>
        </div>
        <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 rounded-sm transition-colors hover:bg-[var(--hover)]"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

        <button onClick={() => fileRef.current?.click()}
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
      </div>
    </div>
  );
}
