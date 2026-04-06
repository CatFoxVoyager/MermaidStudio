// Test setup file for Vitest
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import 'vitest-canvas-mock';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock react-i18next globally
vi.mock('react-i18next', () => {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      'themeEditor.title': 'Theme Editor',
      'themeEditor.saveTheme': 'Save Theme',
      'themeEditor.resetToDefault': 'Reset to Default',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.close': 'Close',
    };
    return translations[key] || key;
  };

  return {
    useTranslation: () => ({
      t,
      i18n: {
        changeLanguage: vi.fn(() => Promise.resolve()),
        language: 'en',
      },
    }),
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    Trans: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Ensure SVG elements are available in JSDOM environment
if (typeof window !== 'undefined') {
  if (!window.SVGPathElement) {
    (window as any).SVGPathElement = class SVGPathElement extends window.Element {};
  }
  if (!window.SVGRectElement) {
    (window as any).SVGRectElement = class SVGRectElement extends window.Element {};
  }
  if (!window.SVGSVGElement) {
    (window as any).SVGSVGElement = class SVGSVGElement extends window.Element {};
  }
  
  // Mock getBBox for all elements (required by Mermaid)
  if (!window.Element.prototype.getBBox) {
    window.Element.prototype.getBBox = function() {
      return {
        x: 0,
        y: 0,
        width: parseFloat(this.getAttribute('width') || '100'),
        height: parseFloat(this.getAttribute('height') || '50'),
        top: 0,
        left: 0,
        right: 100,
        bottom: 50
      };
    };
  }
}

// Mock IndexedDB for tests that use localStorage fallback
global.indexedDB = {
  open: vi.fn().mockImplementation(() => {
    const request: any = {
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
    };
    // Trigger error immediately to force localStorage fallback in tests
    setTimeout(() => {
      if (request.onerror) {
        request.error = new Error('IndexedDB not supported in test environment');
        request.onerror();
      }
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn().mockImplementation(() => {
    const request: any = {
      onerror: null,
      onsuccess: null,
    };
    setTimeout(() => {
      if (request.onsuccess) {request.onsuccess();}
    }, 0);
    return request;
  }),
  databases: vi.fn().mockResolvedValue([]),
} as any;
