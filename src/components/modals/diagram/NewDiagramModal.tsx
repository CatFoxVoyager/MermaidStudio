import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/shared/Modal';
import type { NewDiagramDraft } from '@/hooks/app/useDiagramActions';

export interface NewDiagramModalProps {
  draft: NewDiagramDraft;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

// Mounted only while a naming draft exists — App conditions the render and
// passes key={draft.id}, so the field resets on every new request without
// any local reset logic.
export function NewDiagramModal({ draft, onConfirm, onCancel }: NewDiagramModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canCreate = name.trim().length > 0;

  useEffect(() => {
    // Parent-of-Modal effect: runs after Modal's own panel-focus effect, so
    // the caret lands in the name field, not on the panel container.
    inputRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {return;}
    onConfirm(trimmed);
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        data-testid="new-diagram-cancel"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg text-xs font-medium border transition-colors"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        data-testid="new-diagram-create"
        onClick={submit}
        disabled={!canCreate}
        className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)' }}
      >
        {t('newDiagramDialog.create')}
      </button>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onCancel} title={t('newDiagramDialog.title')} size="sm" footer={footer}>
      <form
        className="p-5 space-y-3"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label
            htmlFor="new-diagram-name-input"
            className="text-[11px] uppercase tracking-wider font-semibold mb-1 block"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('newDiagramDialog.nameLabel')}
          </label>
          <input
            id="new-diagram-name-input"
            ref={inputRef}
            data-testid="new-diagram-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('newDiagramDialog.namePlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-hidden transition-colors"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>

        <button
          type="button"
          data-testid="new-diagram-default-name"
          onClick={() => {
            setName(draft.defaultName);
            inputRef.current?.focus();
          }}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150"
          style={{ background: 'var(--surface-floating)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          {draft.defaultName}
        </button>
      </form>
    </Modal>
  );
}
