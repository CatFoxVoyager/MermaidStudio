import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeEditorPanel } from '../ThemeEditorPanel';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../../i18n/locales/en.json';
import fr from '../../../../i18n/locales/fr.json';

// Initialize i18n for tests
const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Mock renderDiagram to avoid Mermaid initialization in tests
vi.mock('@/lib/mermaid/core', () => ({
  renderDiagram: vi.fn().mockResolvedValue({ svg: '<svg>mock</svg>' }),
}));

// Mock ColorPicker to avoid complex component rendering
vi.mock('@/components/visual/ColorPicker', () => ({
  ColorPicker: ({ label, value, onChange }: any) => (
    <div>
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} data-testid={`color-picker-${label}`} />
    </div>
  ),
}));

const mockTheme = {
  id: 'test-theme',
  name: 'Test Theme',
  description: 'A test theme',
  isBuiltin: false,
  coreColors: {
    primaryColor: '#ECECFF',
    background: '#ffffff',
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe('ThemeEditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <ThemeEditorPanel
        isOpen={true}
        onClose={() => {}}
        theme="light"
        initialTheme={null}
        onSave={() => {}}
      />,
      { wrapper }
    );
    expect(container).toBeTruthy();
  });

  it('displays theme editor title', () => {
    const { getByText } = render(
      <ThemeEditorPanel
        isOpen={true}
        onClose={() => {}}
        theme="light"
        initialTheme={null}
        onSave={() => {}}
      />,
      { wrapper }
    );
    expect(getByText(/Theme Editor/i)).toBeTruthy();
  });

  it('shows save, reset, and close buttons', () => {
    const { container, getByText } = render(
      <ThemeEditorPanel
        isOpen={true}
        onClose={() => {}}
        theme="light"
        initialTheme={null}
        onSave={() => {}}
      />,
      { wrapper }
    );
    expect(getByText('Save')).toBeTruthy();
    expect(container.querySelector('[title="Reset to Default"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="close-theme-editor"]')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ThemeEditorPanel
        isOpen={false}
        onClose={() => {}}
        theme="light"
        initialTheme={null}
        onSave={() => {}}
      />,
      { wrapper }
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with initial theme data', () => {
    const { getByDisplayValue } = render(
      <ThemeEditorPanel
        isOpen={true}
        onClose={() => {}}
        theme="light"
        initialTheme={mockTheme}
        onSave={() => {}}
      />,
      { wrapper }
    );
    expect(getByDisplayValue('Test Theme')).toBeTruthy();
  });
});
