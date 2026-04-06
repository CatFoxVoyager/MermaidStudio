// src/components/modals/settings/ThemeEditorPanel.tsx
// Theme editor sidebar panel for creating and editing custom Mermaid themes

import { useState, useEffect, useRef } from 'react';
import { Palette, X, RotateCcw, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from '@/components/visual/ColorPicker';
import { THEME_SLOT_GROUPS } from '@/constants/themes';
import { deriveThemeVariables } from '@/constants/themeDerivation';
import { renderDiagram } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import type { MermaidTheme, ThemeCoreColors } from '@/types';

interface ThemeEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  initialTheme: MermaidTheme | null;
  onSave: (theme: MermaidTheme) => void;
}

const defaultCoreColors: ThemeCoreColors = {
  primaryColor: '#ECECFF',
  secondaryColor: '',
  tertiaryColor: '',
  lineColor: '',
  arrowheadColor: '',
  background: '#ffffff',
  noteBkgColor: '',
  clusterBkg: '',
  primaryTextColor: '',
  secondaryTextColor: '',
  tertiaryTextColor: '',
  successColor: '',
  warningColor: '',
  errorColor: '',
  infoColor: '',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '18px',
};

const SAMPLE_DIAGRAM = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;

import { FONT_FAMILY_OPTIONS } from '@/constants/fonts';

export function ThemeEditorPanel({
  isOpen,
  onClose,
  theme,
  initialTheme,
  onSave,
}: ThemeEditorPanelProps) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const [localColors, setLocalColors] = useState<ThemeCoreColors>(
    initialTheme?.coreColors ?? { ...defaultCoreColors }
  );
  const [themeName, setThemeName] = useState(initialTheme?.name ?? '');
  const [previewSvg, setPreviewSvg] = useState('');
  const previewIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleColorChange = (key: keyof ThemeCoreColors, value: string) => {
    setLocalColors(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const id = ++previewIdRef.current;
      const vars = deriveThemeVariables(localColors, isDark);

      const frontmatter = `---
config:
  theme: 'base'
  themeVariables:
${Object.entries(vars)
  .filter(([k, v]) => v !== undefined && v !== '')
  .map(([k, v]) => `    ${k}: '${v}'`)
  .join('\n')}
---

${SAMPLE_DIAGRAM}`;

      renderDiagram(frontmatter, `theme_preview_${id}_${Date.now()}`).then(({ svg }) => {
        if (svg && id === previewIdRef.current) {
          setPreviewSvg(svg);
        }
      }).catch(err => {
        console.error('Preview render failed:', err);
      });
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [localColors, isDark]);

  const handleReset = () => {
    setLocalColors({ ...defaultCoreColors });
    setThemeName('');
  };

  const handleCancel = () => {
    setLocalColors(initialTheme?.coreColors ?? { ...defaultCoreColors });
    setThemeName(initialTheme?.name ?? '');
    onClose();
  };

  const handleSave = () => {
    const newTheme: MermaidTheme = {
      id: initialTheme?.id || `custom-${Date.now()}`,
      name: themeName.trim() || `Custom ${new Date().toLocaleDateString()}`,
      description: initialTheme?.description || t('themeEditor.customThemeDescription') || 'Custom theme',
      isBuiltin: false,
      coreColors: { ...localColors },
    };
    onSave(newTheme);
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="theme-editor-panel"
      className="flex flex-col h-full border-l"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <Palette size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('themeEditor.title')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)' }}
            title={t('themeEditor.saveTheme')}
          >
            <Check size={10} />
            Save
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}
            title={t('themeEditor.resetToDefault')}
          >
            <RotateCcw size={12} />
          </button>
          <button
            data-testid="close-theme-editor"
            onClick={onClose}
            className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('themeEditor.themeName')}
          </label>
          <input
            type="text"
            value={themeName}
            onChange={e => setThemeName(e.target.value)}
            placeholder={t('themeEditor.themeNamePlaceholder')}
            className="w-full px-2 py-1.5 rounded-md border text-xs"
            style={{
              background: 'var(--surface-base)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {THEME_SLOT_GROUPS.map(group => (
          <div key={group.id} className="space-y-2">
            <h3 className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {t(group.labelKey)}
            </h3>
            {group.slots.map(slot => {
              if (slot.key === 'fontFamily') {
                return (
                  <div key={slot.key} className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>
                      {t(slot.labelKey)}
                    </label>
                    <select
                      value={localColors.fontFamily}
                      onChange={e => handleColorChange('fontFamily', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-md border text-xs"
                      style={{
                        background: 'var(--surface-base)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {FONT_FAMILY_OPTIONS.map(f => (
                        <option key={f} value={f} style={{ fontFamily: f }}>
                          {f.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              
              if (slot.key === 'fontSize') {
                return (
                  <div key={slot.key} className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>
                      {t(slot.labelKey)}
                    </label>
                    <input
                      type="text"
                      value={localColors.fontSize}
                      onChange={e => handleColorChange('fontSize', e.target.value)}
                      placeholder="18px"
                      className="w-full px-2 py-1.5 rounded-md border text-xs"
                      style={{
                        background: 'var(--surface-base)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                );
              }

              return (
                <ColorPicker
                  key={slot.key}
                  label={t(slot.labelKey)}
                  value={localColors[slot.key] || ''}
                  onChange={value => handleColorChange(slot.key, value)}
                />
              );
            })}
          </div>
        ))}

        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}>
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t('themeEditor.preview')}
            </span>
          </div>
          <div
            className="flex justify-center items-center overflow-auto p-2"
            style={{
              background: isDark ? '#0d1117' : '#ffffff',
              maxHeight: '100px',
            }}
          >
            {previewSvg ? (
              <div
                className="pointer-events-none"
                dangerouslySetInnerHTML={{ __html: sanitizeSVG(previewSvg) }}
              />
            ) : (
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {t('themeEditor.loadingPreview')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
