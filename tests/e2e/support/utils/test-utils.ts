import { Page, Locator } from '@playwright/test';

export const TestUtils = {
  async waitForDiagramRender(page: Page, timeout = 30000) {
    await page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="preview-panel"]');
      if (!preview) return false;

      const svg = preview.querySelector('svg');
      return svg && svg.getAttribute('data-rendered') === 'true';
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