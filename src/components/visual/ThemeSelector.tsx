import { builtinThemes } from '@/constants/themes';
import type { MermaidTheme } from '@/types';

interface ThemeSelectorProps {
  onSelect: (theme: MermaidTheme) => void;
  selectedId?: string;
}

export function ThemeSelector({ onSelect, selectedId }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {builtinThemes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onSelect(theme)}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            selectedId === theme.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
            {theme.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {theme.description}
          </p>
          <div className="flex gap-2">
            <div
              className="w-6 h-6 rounded-sm border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: theme.coreColors.primaryColor }}
              title="Primary Color"
            />
            <div
              className="w-6 h-6 rounded-sm border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: theme.coreColors.background }}
              title="Background"
            />
          </div>
        </button>
      ))}
    </div>
  );
}
