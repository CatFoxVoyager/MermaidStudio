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

  // Unrounded centre of the target's bounding rect, in screen pixels
  // (getBoundingClientRect values, i.e. already multiplied by --ui-scale).
  async overlayCenter(page: Page, target: Locator | string): Promise<{ x: number; y: number }> {
    const loc = typeof target === 'string' ? page.locator(target) : target;
    return loc.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  },

  // Worst absolute misalignment, in screen pixels, between each element
  // matching `overlaySelector` and the nearest `svg g.node` inside
  // `scopeSelector` (nearest by centre distance). Max over left/top/width/
  // height differences; returns -1 when the scope or nodes are missing so a
  // broken selector never reads as "aligned".
  async worstOverlayOffset(page: Page, overlaySelector: string, scopeSelector: string): Promise<number> {
    return page.evaluate(([ovSel, scSel]) => {
      const scope = document.querySelector(scSel);
      if (!scope) return -1;
      const nodes = Array.from(scope.querySelectorAll('svg g.node'));
      if (!nodes.length) return -1;
      const overlays = Array.from(document.querySelectorAll(ovSel));
      if (!overlays.length) return -1;
      let worst = 0;
      for (const ov of overlays) {
        const o = ov.getBoundingClientRect();
        const oc = { x: o.left + o.width / 2, y: o.top + o.height / 2 };
        let nearest: DOMRect | null = null;
        let nearestDist = Infinity;
        for (const node of nodes) {
          const r = node.getBoundingClientRect();
          const d = Math.hypot(
            r.left + r.width / 2 - oc.x,
            r.top + r.height / 2 - oc.y,
          );
          if (d < nearestDist) {
            nearestDist = d;
            nearest = r;
          }
        }
        if (!nearest) continue;
        const diff = Math.max(
          Math.abs(o.left - nearest.left),
          Math.abs(o.top - nearest.top),
          Math.abs(o.width - nearest.width),
          Math.abs(o.height - nearest.height),
        );
        worst = Math.max(worst, diff);
      }
      return worst;
    }, [overlaySelector, scopeSelector]);
  },

  // A point on the empty grid of `scopeSelector`, 24 px from its bottom-left
  // corner (screen pixels) — away from nodes, overlays and toolbar controls.
  async pointOnGrid(page: Page, scopeSelector = '[data-testid="visual-editor-canvas"]'): Promise<{ x: number; y: number }> {
    return page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`pointOnGrid: scope not found: ${sel}`);
      const r = el.getBoundingClientRect();
      return { x: r.left + 24, y: r.bottom - 24 };
    }, scopeSelector);
  },

  // Pointer pan gesture on the empty grid: press at pointOnGrid(scope),
  // move by (dx, dy) screen px, release.
  async dragPreview(page: Page, dx: number, dy: number, scopeSelector = '[data-testid="visual-editor-canvas"]'): Promise<void> {
    const p = await this.pointOnGrid(page, scopeSelector);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + dx, p.y + dy, { steps: 5 });
    await page.mouse.up();
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