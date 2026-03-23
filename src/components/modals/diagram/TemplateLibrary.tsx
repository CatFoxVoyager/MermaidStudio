import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X, LayoutTemplate } from 'lucide-react';
import { TEMPLATES, CATEGORIES } from '@/constants/templates';
import { getUserTemplates, deleteUserTemplate } from '@/services/storage/database';
import { renderDiagram } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import type { Template, UserTemplate } from '@/types';

const COMPLEXITY_COLORS = {
  simple: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  moderate: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  advanced: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

interface Props {
  isOpen?: boolean;
  onSelect: (template: Template) => void;
  onClose: () => void;
}

function TemplateCard({ template, onSelect, onDelete }: { template: Template | UserTemplate; onSelect: () => void; onDelete?: () => void }) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const c = COMPLEXITY_COLORS[template.complexity];

  useEffect(() => {
    renderDiagram(template.content, `tmpl_${template.id}_${Date.now()}`).then(({ svg }) => { if (svg) {setSvg(svg);} });
  }, [template]);

  return (
    <div onClick={onSelect} className="group cursor-pointer rounded-xl overflow-hidden border transition-all duration-200 hover:scale-[1.02] relative"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-floating)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
      <div className="h-28 overflow-hidden flex items-center justify-center relative preview-grid"
        style={{ background: 'var(--surface-base)' }}>
        {svg ? (
          <div className="mermaid-container pointer-events-none"
            style={{ transform: 'scale(0.35)', transformOrigin: 'center center', maxWidth: '280%' }}
            dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }} />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--border-strong)', borderTopColor: 'transparent' }} />
        )}
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: c.bg, color: c.color }}>{t(`templates.${template.complexity}`)}</span>
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 left-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
            <Trash2 size={10} />
          </button>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{template.title}</p>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{template.description}</p>
      </div>
    </div>
  );
}

export function TemplateLibrary({ isOpen = true, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [cat, setCat] = useState('All');
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);

  useEffect(() => {
    getUserTemplates().then(setUserTemplates);
  }, []);

  const allCategories = [...new Set([t('templates.myTemplates'), ...CATEGORIES])];
  const totalCount = TEMPLATES.length + userTemplates.length;

  async function handleDeleteUserTemplate(id: string) {
    await deleteUserTemplate(id);
    setUserTemplates(await getUserTemplates());
  }

  const displayTemplates: (Template | UserTemplate)[] = cat === 'All'
    ? [...userTemplates, ...TEMPLATES]
    : cat === t('templates.myTemplates')
      ? userTemplates
      : [
          ...userTemplates.filter(t => t.category === cat),
          ...TEMPLATES.filter(t => t.category === cat),
        ];

  if (!isOpen) {return null;}

  return (
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <LayoutTemplate size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>{t('templates.title')}</span>
            <span className="text-[10px] block" style={{ color: 'var(--text-tertiary)' }}>{totalCount} {t('templates.templates')}{userTemplates.length > 0 ? ` (${userTemplates.length} ${t('templates.custom')})` : ''}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 overflow-x-auto"
        style={{ borderColor: 'var(--border-subtle)' }}>
        {['All', ...allCategories].map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all duration-150 border"
            style={cat === c
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
              : { background: 'var(--surface-floating)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
            {c}{c === t('templates.myTemplates') && userTemplates.length > 0 ? ` (${userTemplates.length})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {displayTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('templates.noTemplates')}</p>
            {cat === t('templates.myTemplates') && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('templates.noTemplatesHint')}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {displayTemplates.map(t => (
              <TemplateCard key={t.id} template={t as Template}
                onSelect={() => onSelect(t as Template)}
                onDelete={'created_at' in t ? () => handleDeleteUserTemplate(t.id) : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
