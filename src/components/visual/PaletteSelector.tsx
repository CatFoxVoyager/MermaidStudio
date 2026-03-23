import { colorPalettes } from '@/constants/colorPalettes';
import type { ColorPalette } from '@/types';

interface PaletteSelectorProps {
  onSelect: (palette: ColorPalette) => void;
  selectedId?: string;
}

export function PaletteSelector({ onSelect, selectedId }: PaletteSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {colorPalettes.map((palette) => (
        <button
          key={palette.id}
          onClick={() => onSelect(palette)}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            selectedId === palette.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
            {palette.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {palette.description}
          </p>
          <div className="flex gap-2">
            {Object.values(palette.colors).map((color, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: color }}
                title={Object.keys(palette.colors)[index]}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
