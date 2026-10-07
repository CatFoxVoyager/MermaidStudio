// Test setup file for Vitest
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// NOTE: vitest-canvas-mock was removed (2026-10-07): under vitest 5 its
// import poisons the global expect — every `.rejects`/`.resolves` assertion
// suite-wide reported "expected [Function] to throw ... but got ''" (two
// useDiagramActions error-propagation tests failed on it since the vitest
// 4→5 refresh). No test file actually calls a canvas API (the five
// "VisualEditorCanvas*" test files only match on component names), so the
// mock was vestigial. Bisect evidence: probe with only this import breaks
// `await expect(Promise.reject(new Error())).rejects.toThrow()`; without
// the import it passes.

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Vite define constants
(global as any).__APP_VERSION__ = '0.5.1';

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

  // Minimal 2D-context stub (mermaid's architecture diagram measures its
  // icons on a canvas — "Could not create canvas of type 2d" without this).
  // This replaces vitest-canvas-mock, whose import poisons the global expect
  // under vitest 5 (see note at the top of this file).
  const ctx2dStub: Record<string, any> = {
    measureText: (text: string) => ({ width: String(text).length * 8 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
    }),
  };
  ['fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage',
   'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse',
   'rect', 'fill', 'stroke', 'clip', 'save', 'restore', 'translate', 'rotate',
   'scale', 'setTransform', 'resetTransform', 'putImageData', 'setLineDash',
   'getLineDash', 'createConicGradient', 'isPointInPath', 'isPointInStroke',
  ].forEach(fn => { ctx2dStub[fn] = () => {}; });
  window.HTMLCanvasElement.prototype.getContext = function (type: string) {
    return type === '2d' ? ctx2dStub : null;
  } as any;
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
