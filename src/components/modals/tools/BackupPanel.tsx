import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, X, HardDrive } from 'lucide-react';
import { exportBackup, importBackup } from '@/services/storage/database';
import type { BackupData } from '@/types';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  onImported: (msg: string) => void;
}

export function BackupPanel({ isOpen = true, onClose, onImported }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

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
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string) as BackupData;
        if (!data.diagrams || !Array.isArray(data.diagrams)) {
          onImported(t('backup.invalidFile'));
          return;
        }
        const result = await importBackup(data);
        const parts = [];
        if (result.diagrams > 0) {parts.push(`${result.diagrams} diagram${result.diagrams > 1 ? 's' : ''}`);}
        if (result.folders > 0) {parts.push(`${result.folders} folder${result.folders > 1 ? 's' : ''}`);}
        if (data.settings) {parts.push('settings');}
        onImported(`Imported ${parts.join(', ')}`);
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
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <HardDrive size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('backup.title')}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <button onClick={handleExport}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left border transition-all duration-150"
          style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
          <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Download size={18} />
          </span>
          <div>
            <p className="text-sm font-medium">{t('backup.exportAll')}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('backup.exportAllDesc')}</p>
          </div>
        </button>

        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left border transition-all duration-150"
          style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle')}>
          <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
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
  );
}
