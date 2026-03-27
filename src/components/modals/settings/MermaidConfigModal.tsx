import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/shared/Modal';
import { builtinThemes } from '@/constants/themes';
import { applyThemeToFrontmatter, stripThemeDirective } from '@/constants/themeDerivation';
import type { MermaidTheme } from '@/types';

interface MermaidConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: MermaidConfig) => void;
  currentContent?: string;
  onContentChange?: (content: string) => void;
}

export interface MermaidConfig {
  theme: 'light' | 'dark' | 'forest' | 'neutral' | 'base';
  layout: 'dagre' | 'elk' | 'elk.stress';
  handDrawn: boolean;
  handDrawnSeed?: number;
  fontFamily?: string;
  maxTextSize?: number;
  maxEdges?: number;
  htmlLabels: boolean;
  darkMode: boolean;
  securityLevel: 'strict' | 'loose' | 'antiscript' | 'sandbox';
}

const DEFAULT_CONFIG: MermaidConfig = {
  theme: 'base',
  layout: 'dagre',
  handDrawn: false,
  fontFamily: 'Arial',
  maxTextSize: 50000,
  maxEdges: 500,
  htmlLabels: true,
  darkMode: true,
  securityLevel: 'loose',
};

export function MermaidConfigModal({ isOpen, onClose, onApply, currentContent = '', onContentChange }: MermaidConfigModalProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<MermaidConfig>(DEFAULT_CONFIG);
  const hasCustomTheme = currentContent.trimStart().startsWith('%%{init:');

  const handleThemeSelect = (theme: MermaidTheme) => {
    if (currentContent && onContentChange) {
      const cleanContent = stripThemeDirective(currentContent);
      const updatedContent = applyThemeToFrontmatter(cleanContent, theme, config.darkMode);
      onContentChange(updatedContent);
    }
  };

  const handleResetToDefault = () => {
    if (currentContent && onContentChange) {
      onContentChange(currentContent.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/i, '').trim());
    }
  };

  const handleApply = () => {
    onApply(config);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('mermaidConfig.title')}
      size="full"
      footer={
        <div className="flex gap-3 justify-end px-5 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('mermaidConfig.applyConfiguration')}
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mermaidConfig.theme')}
              </label>
              <select
                value={config.theme}
                onChange={(e) => setConfig({ ...config, theme: e.target.value as MermaidConfig['theme'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="forest">Forest</option>
                <option value="neutral">Neutral</option>
                <option value="base">Base</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mermaidConfig.layoutAlgorithm')}
              </label>
              <select
                value={config.layout}
                onChange={(e) => setConfig({ ...config, layout: e.target.value as MermaidConfig['layout'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="dagre">Dagre</option>
                <option value="elk">ELK</option>
                <option value="elk.stress">ELK Stress</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mermaidConfig.fontFamily')}
              </label>
              <input
                type="text"
                value={config.fontFamily}
                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Arial, sans-serif"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mermaidConfig.securityLevel')}
              </label>
              <select
                value={config.securityLevel}
                onChange={(e) => setConfig({ ...config, securityLevel: e.target.value as MermaidConfig['securityLevel'] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="strict">Strict</option>
                <option value="loose">Loose</option>
                <option value="antiscript">Antiscript</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mermaidConfig.maxTextSize')}
              </label>
              <input
                type="number"
                value={config.maxTextSize}
                onChange={(e) => setConfig({ ...config, maxTextSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1000"
                max="100000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('mermaidConfig.maxEdges')}
              </label>
              <input
                type="number"
                value={config.maxEdges}
                onChange={(e) => setConfig({ ...config, maxEdges: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="10"
                max="10000"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.handDrawn}
                onChange={(e) => setConfig({ ...config, handDrawn: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">{t('mermaidConfig.handDrawn')}</span>
            </label>

            {config.handDrawn && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('mermaidConfig.randomSeed')}
                </label>
                <input
                  type="number"
                  value={config.handDrawnSeed || 1}
                  onChange={(e) => setConfig({ ...config, handDrawnSeed: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.htmlLabels}
                onChange={(e) => setConfig({ ...config, htmlLabels: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">{t('mermaidConfig.htmlLabels')}</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.darkMode}
                onChange={(e) => setConfig({ ...config, darkMode: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">{t('mermaidConfig.darkMode')}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('mermaidConfig.colorPalettes')}
            </label>
            {hasCustomTheme && (
              <button
                onClick={handleResetToDefault}
                className="w-full mb-3 p-3 rounded-lg border border-red-200 dark:border-red-800/40 hover:border-red-400 dark:hover:border-red-600 transition-colors text-left flex items-center gap-2.5 bg-red-50 dark:bg-red-900/10"
              >
                <RotateCcw size={14} className="text-red-500 dark:text-red-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">{t('mermaidConfig.resetToDefault')}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('mermaidConfig.removeCustomPalette')}</p>
                </div>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {builtinThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme)}
                  className="p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
                  title={theme.description}
                >
                  <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                    {theme.name}
                  </p>
                  <div className="flex gap-1">
                    <div
                      className="w-4 h-4 rounded-sm border border-gray-400 dark:border-gray-500"
                      style={{ backgroundColor: theme.coreColors.primaryColor }}
                      title="Primary"
                    />
                    <div
                      className="w-4 h-4 rounded-sm border border-gray-400 dark:border-gray-500"
                      style={{ backgroundColor: theme.coreColors.background }}
                      title="Background"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
    </Modal>
  );
}
