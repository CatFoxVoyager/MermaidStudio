import { RotateCcw, X, Palette } from 'lucide-react';
import { colorPalettes, applyPaletteToContent } from '@/constants/colorPalettes';
import type { ColorPalette } from '@/types';

interface DiagramColorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onContentChange: (content: string) => void;
  theme: 'dark' | 'light';
}

function stripThemeDirective(content: string): string {
  return content.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim();
}

function extractCurrentPalette(content: string): ColorPalette | null {
  const match = content.match(/'primaryColor'\s*:\s*'([^']+)'/);
  if (!match) {return null;}
  const primaryColor = match[1].toUpperCase();
  return colorPalettes.find(p => p.colors.primary.toUpperCase() === primaryColor) || null;
}

export function DiagramColorsPanel({ isOpen, onClose, currentContent, onContentChange, theme }: DiagramColorsPanelProps) {
  const isDark = theme === 'dark';
  const hasCustomTheme = currentContent.trimStart().startsWith('%%{init:');
  const activePalette = hasCustomTheme ? extractCurrentPalette(currentContent) : null;

  const handlePaletteSelect = (palette: ColorPalette) => {
    if (currentContent) {
      const updatedContent = applyPaletteToContent(currentContent, palette);
      onContentChange(updatedContent);
    }
  };

  const handleResetToDefault = () => {
    if (currentContent) {
      onContentChange(stripThemeDirective(currentContent));
    }
  };

  if (!isOpen) {return null;}

  return (
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <Palette size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Diagram Colors</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-white/8"
          style={{ color: 'var(--text-secondary)' }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {hasCustomTheme && (
          <button
            onClick={handleResetToDefault}
            className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
            style={{
              background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
              borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)';
            }}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}>
              <RotateCcw size={14} style={{ color: isDark ? '#f87171' : '#dc2626' }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>
                Reset to Default
              </p>
              <p className="text-[9px] mt-0.5 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                Remove custom palette and use theme colors
              </p>
            </div>
          </button>
        )}

        {colorPalettes.map((palette) => {
          const isActive = activePalette?.id === palette.id;
          return (
            <button
              key={palette.id}
              onClick={() => handlePaletteSelect(palette)}
              className="w-full p-3 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isActive
                  ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                  : 'var(--surface-base)',
                borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-floating)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-base)';
                }
              }}
              title={palette.description}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {palette.name}
                </p>
                {isActive && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ color: 'var(--accent)', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.primary, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Primary</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.secondary, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Secondary</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.accent, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Accent</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.success, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Success</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.warning, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Warning</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.error, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Error</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.neutral_light, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Light</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-6 rounded border" style={{ backgroundColor: palette.colors.neutral_dark, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>Dark</span>
                </div>
              </div>
              <p className="text-[9px] mt-2 leading-snug" style={{ color: 'var(--text-tertiary)' }}>
                {palette.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
