import { RotateCcw, X, Palette, Check, Plus, Pencil, Star, Trash2 } from 'lucide-react';
import { builtinThemes, getThemeById } from '@/constants/themes';
import { applyC4FromTheme, stripThemeDirective, getSwatchColors, applyThemeToFrontmatter } from '@/constants/themeDerivation';
import type { MermaidTheme, DiagramType } from '@/types';
import { getStylingCapabilities } from '@/types';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useMemo } from 'react';
import { renderDiagram, detectDiagramType, setDiagramTheme } from '@/lib/mermaid/core';
import { sanitizeSVG } from '@/utils/sanitization';
import { ThemeEditorPanel } from './ThemeEditorPanel';
import { updatePresetColors } from '@/lib/mermaid/codeUtils';

interface DiagramColorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onContentChange: (content: string) => void;
  theme: 'dark' | 'light';
  currentThemeId?: string;
  onThemeIdChange?: (themeId: string | null) => void;
  defaultThemeId?: string;
  onSetDefaultTheme?: (theme: MermaidTheme) => void;
}

// Check if a diagram type uses C4-specific styling (UpdateElementStyle/UpdateRelStyle)
function isC4DiagramType(content: string): boolean {
  const body = content.replace(/^\s*---[\s\S]*?---\s*/i, '').trim();
  const type = detectDiagramType(body) as DiagramType;
  return getStylingCapabilities(type).supportsC4Style;
}

const SAMPLE_DIAGRAM = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;

export function DiagramColorsPanel({ isOpen, onClose, currentContent, onContentChange, theme, currentThemeId, onThemeIdChange, defaultThemeId, onSetDefaultTheme }: DiagramColorsPanelProps) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Theme editor state (preserved from Plan 02)
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<MermaidTheme | null>(null);
  const [customThemes, setCustomThemes] = useState<MermaidTheme[]>(() => {
    try {
      const stored = localStorage.getItem('mermaid-studio-custom-themes');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Combine builtin and custom themes
  const allThemes = useMemo(() => [...builtinThemes, ...customThemes], [customThemes]);

  // Preview state
  const [previewSvg, setPreviewSvg] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<MermaidTheme | null>(null);
  const previewIdRef = useRef(0);

  // Generate preview for selected theme
  useEffect(() => {
    const theme = selectedTheme;
    if (theme) {
      const id = ++previewIdRef.current;
      // Use render-time theming for preview
      setDiagramTheme(theme.id);
      renderDiagram(SAMPLE_DIAGRAM, `theme_preview_${id}_${Date.now()}`, theme.id).then(({ svg }) => {
        if (svg && id === previewIdRef.current) {
          setPreviewSvg(svg);
        }
      });
    } else {
      setPreviewSvg('');
    }
  }, [selectedTheme?.id, isDark]);

  // Apply theme
  const handleApplyTheme = (theme: MermaidTheme) => {
    if (!currentContent) return;

    const cleanContent = stripThemeDirective(currentContent);

    let newContent: string;
    if (isC4DiagramType(cleanContent)) {
      // C4 diagrams use UpdateElementStyle/UpdateRelStyle AND store themeId
      newContent = applyC4FromTheme(cleanContent, theme);
    } else {
      // Other diagrams: generate YAML frontmatter with filtered themeVariables
      newContent = applyThemeToFrontmatter(cleanContent, theme, isDark);
    }

    // Update preset colors if there are any preset classDef lines
    const hasPresets = /\bclassDef\s+preset(?:Primary|Success|Warning|Danger|Info)\b/.test(newContent);
    if (hasPresets) {
      // Update preset colors to match the new theme
      newContent = updatePresetColors(newContent, theme.coreColors);
    }

    onContentChange(newContent);
    onThemeIdChange?.(theme.id);
    setSelectedTheme(null);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (currentContent) {
      let cleanContent = currentContent;
      if (isC4DiagramType(currentContent)) {
        cleanContent = stripThemeDirective(currentContent);
      }
      // Strip theme YAML frontmatter and %% @theme comment
      cleanContent = stripThemeDirective(cleanContent);
      onContentChange(cleanContent);
      onThemeIdChange?.(null);
      setSelectedTheme(null);
      setShowThemeEditor(false);
    }
  };

  // Handle saving a custom theme (preserved from Plan 02)
  const handleSaveTheme = (theme: MermaidTheme) => {
    const updated = [...customThemes];
    const idx = updated.findIndex(t => t.id === theme.id);
    if (idx >= 0) {
      updated[idx] = theme;
    } else {
      updated.push({ ...theme, id: `custom-${Date.now()}`, isBuiltin: false });
    }
    setCustomThemes(updated);
    localStorage.setItem('mermaid-studio-custom-themes', JSON.stringify(updated));
    setShowThemeEditor(false);
  };

  // Handle editing a custom theme
  const handleEditTheme = (theme: MermaidTheme) => {
    if (!theme.isBuiltin) {
      setEditingTheme(theme);
      setShowThemeEditor(true);
    }
  };

  // Handle deleting a custom theme
  const handleDeleteTheme = (e: React.MouseEvent, themeId: string) => {
    e.stopPropagation();
    const updated = customThemes.filter(t => t.id !== themeId);
    setCustomThemes(updated);
    localStorage.setItem('mermaid-studio-custom-themes', JSON.stringify(updated));

    // If the deleted theme was active, reset to default
    if (currentThemeId === themeId) {
      handleResetToDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div data-testid="settings-modal theme-modal" className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <Palette size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }} data-testid="settings-title">{t('editor.diagramColors')}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingTheme(null); setShowThemeEditor(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title={t('themeEditor.createTheme')}
          >
            <Plus size={12} />
            {t('themeEditor.createTheme')}
          </button>
          <button
            data-testid="close-theme close-settings"
            onClick={onClose}
            className="p-1.5 rounded-sm transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {!showThemeEditor && (
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Reset Button */}
        {currentThemeId && (
          <button
            onClick={handleResetToDefault}
            className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
            style={{
              background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
            }}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}>
              <RotateCcw size={14} style={{ color: isDark ? '#f87171' : '#dc2626' }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>
                Reset to Default
              </p>
              <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                Remove custom theme and use default
              </p>
            </div>
          </button>
        )}

        {/* Themes List */}
        {allThemes.map((themeItem) => {
          const isActive = currentThemeId === themeItem.id;
          const isSelected = selectedTheme?.id === themeItem.id;
          const showPreview = isSelected && previewSvg;
          const swatchColors = getSwatchColors(themeItem.coreColors, isDark);

          return (
            <div
              key={themeItem.id}
              data-testid="theme-item"
              onClick={() => setSelectedTheme(themeItem)}
              className="rounded-lg border transition-all overflow-hidden cursor-pointer"
              style={{
                background: isActive
                  ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                  : (isSelected ? 'var(--surface-floating)' : 'var(--surface-base)'),
                borderColor: isActive ? 'var(--accent)' : (isSelected ? 'var(--accent)' : 'var(--border-subtle)'),
              }}
              title={themeItem.description}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {themeItem.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ color: 'var(--accent)', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        Active
                      </span>
                    )}
                    {!themeItem.isBuiltin && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTheme(themeItem);
                          }}
                          className="p-1 rounded transition-colors hover:bg-white/10"
                          style={{ color: 'var(--text-secondary)' }}
                          title={t('themeEditor.editTheme')}
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTheme(e, themeItem.id)}
                          className="p-1 rounded transition-colors hover:bg-red-500/20 hover:text-red-500"
                          style={{ color: 'var(--text-tertiary)' }}
                          title="Delete theme"
                        >
                          <Trash2 size={10} />
                        </button>
                      </>
                    )}
                    {isSelected && !isActive && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTheme(themeItem);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium text-white transition-colors hover:opacity-90"
                          style={{ background: 'var(--accent)' }}
                        >
                          <Check size={10} />
                          Apply
                        </button>
                        {onSetDefaultTheme && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetDefaultTheme(themeItem);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-colors ${
                              defaultThemeId === themeItem.id
                                ? 'text-green-400 bg-green-500/10'
                                : 'hover:bg-white/5'
                            }`}
                            style={{ color: defaultThemeId === themeItem.id ? '#4ade80' : 'var(--text-secondary)' }}
                            title={defaultThemeId === themeItem.id ? 'Current default theme' : 'Set as app default'}
                          >
                            <Star size={10} />
                            {defaultThemeId === themeItem.id ? 'Default' : 'Set Default'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {swatchColors.map((color, i) => (
                    <div
                      key={i}
                      className="h-5 rounded-sm border"
                      style={{ backgroundColor: color, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview Section - Below the theme colors, shown on click */}
              {showPreview && (
                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Preview
                    </span>
                  </div>
                  <div className="relative">
                    {/* Preview Diagram */}
                    <div
                      className="flex justify-center items-center overflow-auto"
                      style={{
                        background: themeItem.coreColors.background,
                        maxHeight: '180px'
                      }}
                    >
                      <div
                        className="pointer-events-none p-2"
                        dangerouslySetInnerHTML={{ __html: sanitizeSVG(previewSvg) }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Theme Editor Panel (preserved from Plan 02) */}
      {showThemeEditor && (
        <ThemeEditorPanel
          isOpen={showThemeEditor}
          onClose={() => setShowThemeEditor(false)}
          theme={theme}
          initialTheme={editingTheme}
          onSave={handleSaveTheme}
        />
      )}
    </div>
  );
}
