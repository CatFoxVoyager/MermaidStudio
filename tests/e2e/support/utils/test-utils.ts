import { Page, Locator } from '@playwright/test';

export const TestUtils = {
  // Wait for the desktop TopBar brand — proof that React mounted and the
  // desktop tree rendered (mobile tree has its own brand testid).
  async waitForApp(page: Page): Promise<void> {
    await page.waitForSelector('[data-testid="topbar-brand"]');
  },

  // Drive the global interface scale for the current page by writing the
  // `--ui-scale` custom property on <html> (the single source of scale).
  async setUiScale(page: Page, scale: number): Promise<void> {
    await page.evaluate(s =>
      document.documentElement.style.setProperty('--ui-scale', String(s))
    , scale);
  },

  // Pin the stored ui-scale preference before any page script runs —
  // MUST be called before `page.goto`. Key mirrors UI_SCALE_STORAGE_KEY
  // in src/utils/uiScale.ts (kept literal: e2e support does not import src).
  async pinUIScale(page: Page, pref: 'auto' | number | string): Promise<void> {
    await page.addInitScript(prefValue => {
      window.localStorage.setItem('mermaid-studio-ui-scale', String(prefValue));
    }, pref);
  },

  async waitForDiagramRender(page: Page, timeout = 30000) {
    await page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="preview-panel"]');
      if (!preview) return false;

      const svg = preview.querySelector('svg');
      // For now, just check if SVG exists - data-rendered attribute seems to have issues
      return svg !== null;
    }, { timeout });
  },

  async getDiagramErrors(page: Page) {
    return page.evaluate(() => {
      const errors = document.querySelectorAll('[data-testid="error-message"]');
      return Array.from(errors).map(error => error.textContent);
    });
  },

  async countRenderedNodes(page: Page) {
    return page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return 0;

      return svg.querySelectorAll('[data-node]').length;
    });
  },

  async countRenderedEdges(page: Page) {
    return page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return 0;

      return svg.querySelectorAll('[data-edge]').length;
    });
  },

  async getPreviewContent(page: Page) {
    return page.evaluate(() => {
      const preview = document.querySelector('[data-testid="preview-panel"]');
      return preview?.innerHTML || '';
    });
  },

  async saveScreenshotWithState(page: Page, name: string) {
    await page.screenshot({
      path: `test-results/${name}.png`,
      fullPage: true
    });

    // Also save HTML state
    await page.textContent('body').then(content => {
      require('fs').writeFileSync(
        `test-results/${name}.html`,
        content
      );
    });
  }
};

export class Timeouts {
  static short = 5000;
  static medium = 10000;
  static long = 30000;
  static veryLong = 60000;
}

export class Selectors {
  static get activeTab() {
    return '[data-testid="active-tab"]';
  }

  static get codeEditor() {
    return '[data-testid="code-editor"]';
  }

  static get previewPanel() {
    return '[data-testid="preview-panel"]';
  }

  static get renderTime() {
    return '[data-testid="render-time"]';
  }

  static get aiPanel() {
    return '[data-testid="ai-panel"]';
  }

  static get modal() {
    return '[data-testid="modal"]';
  }

  static get toast() {
    return '[data-testid="toast"]';
  }
}