import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { saveUserTemplate } from '@/services/storage/database';
import { detectDiagramType } from '@/lib/mermaid/core';
import { CATEGORIES } from '@/constants/templates';
import { ThemeSelector } from '@/visual/ThemeSelector';
import { Modal } from '@/components/shared/Modal';
import type { DiagramType, MermaidTheme } from '@/types';

interface Props {
  content: string;
  onClose: () => void;
  onSaved: () => void;
}

const ALL_CATS = ['My Templates', ...CATEGORIES];

export function SaveTemplateModal({ content, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'advanced'>('simple');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<MermaidTheme | null>(null);

  async function handleSave() {
    if (!title.trim()) {return;}
    const type = detectDiagramType(content) as DiagramType;
    await saveUserTemplate({ title: title.trim(), description: description.trim(), category, complexity, content, type });
    onSaved();
    onClose();
  }

  const footer = (
    <div className="flex justify-end gap-2">
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium border transition-colors"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>{t('common.cancel')}</button>
      <button onClick={handleSave} disabled={!title.trim()}
        className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)' }}>{t('templates.saveTemplate')}</button>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={t('templates.saveAsTemplate')} size="sm" footer={footer}>
      <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>{t('templates.templateTitle')}</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={t('templates.templateTitlePlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-hidden transition-colors"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>{t('templates.templateDescription')}</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder={t('templates.templateDescPlaceholder')}
            className="w-full px-3 py-2 text-sm rounded-lg border outline-hidden transition-colors"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>{t('templates.templateCategory')}</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATS.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150"
                style={category === c
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
                  : { background: 'var(--surface-floating)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>{t('templates.templateComplexity')}</label>
          <div className="flex gap-2">
            {(['simple', 'moderate', 'advanced'] as const).map(c => (
              <button key={c} onClick={() => setComplexity(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150"
                style={complexity === c
                  ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
                  : { background: 'var(--surface-floating)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                {t(`templates.${c}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium border transition-all"
            style={showThemeSelector
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
              : { background: 'var(--surface-floating)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
            {selectedTheme ? t('templates.selectedPalette', { name: selectedTheme.name }) : t('templates.chooseColorPalette')}
          </button>
          {showThemeSelector && (
            <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--surface-base)' }}>
              <ThemeSelector onSelect={(theme) => { setSelectedTheme(theme); setShowThemeSelector(false); }} selectedId={selectedTheme?.id} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
