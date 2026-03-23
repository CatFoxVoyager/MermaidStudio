import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { colorPalettes, applyPaletteToContent } from '@/constants/colorPalettes';
import type { ColorPalette } from '@/types';

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
  const [config, setConfig] = useState<MermaidConfig>(DEFAULT_CONFIG);
  const hasCustomTheme = currentContent.trimStart().startsWith('%%{init:');

  const handlePaletteSelect = (palette: ColorPalette) => {
    if (currentContent && onContentChange) {
      const updatedContent = applyPaletteToContent(currentContent, palette);
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
      title="Mermaid Diagram Configuration"
      size="full"
      footer={
        <div className="flex gap-3 justify-end px-5 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Configuration
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
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
                Layout Algorithm
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
                Font Family
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
                Security Level
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
                Max Text Size
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
                Max Edges
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
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">Hand-drawn Style</span>
            </label>

            {config.handDrawn && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Random Seed
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
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">HTML Labels</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.darkMode}
                onChange={(e) => setConfig({ ...config, darkMode: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">Dark Mode</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Diagram Color Palettes
            </label>
            {hasCustomTheme && (
              <button
                onClick={handleResetToDefault}
                className="w-full mb-3 p-3 rounded-lg border border-red-200 dark:border-red-800/40 hover:border-red-400 dark:hover:border-red-600 transition-colors text-left flex items-center gap-2.5 bg-red-50 dark:bg-red-900/10"
              >
                <RotateCcw size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">Reset to Default</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Remove custom palette</p>
                </div>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {colorPalettes.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() => handlePaletteSelect(palette)}
                  className="p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
                  title={palette.description}
                >
                  <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                    {palette.name}
                  </p>
                  <div className="flex gap-1">
                    {Object.values(palette.colors).slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded border border-gray-400 dark:border-gray-500"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
    </Modal>
  );
}
