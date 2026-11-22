import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../support/page-objects/AppLayoutPage';
import { TestUtils } from '../support/utils/test-utils';

/**
 * Milestone v1.9 (CFG-04) — Live Chromium Parity Suite for Mermaid 12.3.0
 *
 * Verifies real browser rendering (inside PreviewPanel's open Shadow DOM host
 * `[data-shadow-host]`) across all 5 v1.9 phases:
 *  - Phase 43 (FIX-01): Math/KaTeX $$...$$ survives DOMPurify
 *  - Phase 44 (THM-01..02): Native v12 themes (redux-color) & handDrawn look
 *  - Phase 45 (LAY-02..04): ELK algorithm (elk.rectpacking), tidy-tree Mindmap,
 *    on-demand Iconify packs (logos:react, mdi:home)
 *  - Phase 46 (AGF-01..02): agentflow-beta render + non-blocking CodeMirror lint warning
 *  - Phase 47 (CFG-01..02): AdvancedStylePanel per-diagram control updates frontmatter & re-renders
 */
test.describe('Milestone v1.9 — Mermaid 12.3.0 Live Parity', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const tabCount = await appLayout.tabBar.tabs.count();
    if (tabCount === 0) {
      await appLayout.newDiagram();
      await page.waitForTimeout(400);
    }
    await page.locator('[data-testid="code-editor"] .cm-editor').waitFor({ state: 'visible', timeout: 15000 });
  });

  async function setAndWaitForSvg(
    page: import('@playwright/test').Page,
    appLayout: AppLayoutPage,
    code: string,
    expectedSubstring?: string,
  ) {
    await appLayout.workspace.editor.setCode(code);
    await page.waitForTimeout(400);
    await page.waitForFunction(
      (expected) => {
        const err = document.querySelector('[data-testid="error-message"]');
        if (err) return false;
        const host = document.querySelector('[data-shadow-host]');
        const svg = host?.shadowRoot?.querySelector('svg');
        if (!svg || svg.outerHTML.length < 300) return false;
        if (expected && !svg.outerHTML.includes(expected)) return false;
        return true;
      },
      expectedSubstring ?? '',
      { timeout: 25000 },
    );
  }

  async function getDiagramSvgHtml(page: import('@playwright/test').Page): Promise<string> {
    return page.evaluate(() => {
      const host = document.querySelector('[data-shadow-host]');
      return host?.shadowRoot?.querySelector('svg')?.outerHTML ?? '';
    });
  }

  test('FIX-01: renders KaTeX math $$...$$ inside flowchart without DOMPurify stripping', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      'flowchart TD\n  A["$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"] --> B["$$E = mc^2$$"]',
    );

    await page.waitForFunction(
      () => {
        const host = document.querySelector('[data-shadow-host]');
        const svg = host?.shadowRoot?.querySelector('svg');
        return Boolean(svg?.querySelector('.katex, .katex-mathml, math'));
      },
      { timeout: 15000 },
    );

    const hasMath = await page.evaluate(() => {
      const host = document.querySelector('[data-shadow-host]');
      const svg = host?.shadowRoot?.querySelector('svg');
      return Boolean(svg?.querySelector('.katex, .katex-mathml, math'));
    });
    expect(hasMath).toBe(true);
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);
  });

  test('THM-01 & THM-02: renders native v12 redux-color theme and handDrawn look', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      `---\nconfig:\n  theme: redux-color\n  look: handDrawn\n  handDrawnSeed: 42\n---\nflowchart LR\n  A[StartRedux] --> B{Decision}\n  B --> C[DoneRedux]`,
      'StartRedux',
    );

    const svgHtml = await getDiagramSvgHtml(page);
    expect(svgHtml.length).toBeGreaterThan(2000);
    expect(svgHtml).toContain('StartRedux');
    expect(svgHtml).toContain('DoneRedux');
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);
  });

  test('LAY-02: renders flowchart with lazy ELK elk.rectpacking algorithm', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      `---\nconfig:\n  layout: elk\n  elk:\n    algorithm: elk.rectpacking\n---\nflowchart TD\n  A[ServiceElkA] --> B[ServiceElkB]\n  B --> C[DatabaseElk]`,
      'ServiceElkA',
    );

    const svgHtml = await getDiagramSvgHtml(page);
    expect(svgHtml).toContain('ServiceElkA');
    expect(svgHtml).toContain('DatabaseElk');
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);
  });

  test('LAY-03: renders Mindmap with lazy tidy-tree layout', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      `---\nconfig:\n  layout: tidy-tree\n---\nmindmap\n  root((MermaidV12Root))\n    Layouts\n      TidyTreeNode\n      ELK\n    Themes\n      Redux`,
      'TidyTreeNode',
    );

    const svgHtml = await getDiagramSvgHtml(page);
    expect(svgHtml).toContain('MermaidV12Root');
    expect(svgHtml).toContain('TidyTreeNode');
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);
  });

  test('LAY-04: renders logos:react and mdi:home icons via on-demand Iconify packs (no unknownIcon fallback)', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      `flowchart LR\n  A@{ icon: "logos:react", label: "ReactIcon" } --> B@{ icon: "mdi:home", label: "HomeIcon" }`,
      'ReactIcon',
    );

    await page.waitForFunction(
      () => {
        const host = document.querySelector('[data-shadow-host]');
        const svg = host?.shadowRoot?.querySelector('svg');
        if (!svg) return false;
        const icons = svg.querySelectorAll('.icon-shape');
        return icons.length >= 2 && !svg.outerHTML.includes('#087ebf');
      },
      { timeout: 25000 },
    );

    const result = await page.evaluate(() => {
      const host = document.querySelector('[data-shadow-host]');
      const svg = host?.shadowRoot?.querySelector('svg');
      return {
        iconCount: svg?.querySelectorAll('.icon-shape').length ?? 0,
        hasUnknownFallback: svg?.outerHTML.includes('#087ebf') ?? true,
      };
    });
    expect(result.iconCount).toBeGreaterThanOrEqual(2);
    expect(result.hasUnknownFallback).toBe(false);
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);
  });

  test('AGF-01 & AGF-02: renders agentflow-beta and surfaces non-blocking CodeMirror diagnostic warning', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      `agentflow-beta TB\n  orphan@{ shape: task, label: "Loose Task" }\n  flow main["MainAgentFlow"]\n    ticket@{ shape: input, label: "Incoming Ticket" }\n    classify@{ shape: task, label: "Classify Intent" }\n    done@{ shape: action, label: "Resolved" }\n    ticket --> classify --> done\n  end`,
      'MainAgentFlow',
    );

    const svgHtml = await getDiagramSvgHtml(page);
    expect(svgHtml).toContain('MainAgentFlow');
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);

    // CodeMirror linter attaches a warning marker in the editor gutter/range
    await page.locator('.cm-lint-marker-warning, .cm-lintRange-warning').first().waitFor({
      state: 'attached',
      timeout: 10000,
    });
    const warningCount = await page.locator('.cm-lint-marker-warning, .cm-lintRange-warning').count();
    expect(warningCount).toBeGreaterThan(0);
  });

  test('CFG-01 & CFG-02: AdvancedStylePanel per-diagram Pie controls update frontmatter and re-render', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await setAndWaitForSvg(
      page,
      appLayout,
      `pie showData\n  title MarketShareV12\n  "Alpha" : 45\n  "Beta" : 35\n  "Gamma" : 20`,
      'MarketShareV12',
    );

    // Open AdvancedStylePanel via toolbar sliders button
    await page.locator('button[title="Advanced Styling"], button:has(svg.lucide-sliders-horizontal)').first().click();

    // Locate the Pie Legend Position select inside the panel and pick "bottom"
    const legendSelect = page.locator('select').filter({ has: page.locator('option[value="bottom"]') }).first();
    await legendSelect.waitFor({ state: 'visible', timeout: 10000 });
    await legendSelect.selectOption('bottom');

    // Editor frontmatter should now contain pie.legendPosition: 'bottom'
    await expect.poll(async () => await appLayout.workspace.editor.getCode(), { timeout: 10000 }).toMatch(
      /legendPosition:\s*['"]?bottom['"]?/,
    );

    // Diagram re-renders cleanly with zero errors
    await page.waitForTimeout(500);
    expect((await getDiagramSvgHtml(page)).length).toBeGreaterThan(500);
    expect(await TestUtils.getDiagramErrors(page)).toHaveLength(0);
  });
});
