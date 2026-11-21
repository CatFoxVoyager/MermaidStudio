import { test, expect, Page } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TemplatesPage } from '../../support/page-objects/ModalPages';
import { CANONICAL_SHAPES } from '../../../../src/lib/mermaid/shapes';
import { TEMPLATES } from '../../../../src/constants/templates';
import { DIAGRAM_LABELS } from '../../../../src/constants/diagramLabels';

const V18_TEMPLATES: ReadonlyArray<{
  id: string;
  marker: string;
  checkExtra?: (info: NonNullable<Awaited<ReturnType<typeof getShadowSvgInfo>>>) => boolean;
}> = [
  { id: 'flowchart-v12-shapes', marker: 'Event Queue' },
  {
    id: 'flowchart-v12-icons',
    marker: 'Client App',
    checkExtra: (info) => info.iconNodes > 0 && info.imageNodes > 0,
  },
  { id: 'flowchart-v12-edges', marker: 'API Ingress' },
  {
    id: 'flowchart-v12-collapsed',
    marker: 'Platform Services',
    checkExtra: (info) => info.collapsedGroups > 0,
  },
  { id: 'ishikawa-root-cause', marker: 'Blurry Photo' },
  { id: 'radar-skills', marker: 'Team Alpha' },
  { id: 'treemap-budget', marker: 'Engineering' },
  { id: 'eventmodeling-checkout', marker: 'ShopUI' },
  { id: 'venn-product-fit', marker: 'Desirable' },
  { id: 'treeview-repo', marker: 'PreviewPanel.tsx' },
  { id: 'wardley-tea-shop', marker: 'Cup of Tea' },
  { id: 'cynefin-incident', marker: 'Restart service' },
  { id: 'railroad-grammar', marker: 'expression' },
  { id: 'swimlane-support', marker: 'Request service' },
];

async function dismissWelcomeIfOpen(page: Page) {
  const modalClose = page.locator('button[aria-label="Close modal"]');
  if (await modalClose.isVisible().catch(() => false)) {
    await modalClose.click();
    await page.waitForTimeout(200);
  }
}

async function getShadowSvgInfo(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-shadow-host]');
    const svg = host?.shadowRoot?.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      nodeCount: svg.querySelectorAll('g.node').length,
      iconNodes: svg.querySelectorAll('.icon-shape').length,
      imageNodes: svg.querySelectorAll('.image-shape').length,
      collapsedGroups: svg.querySelectorAll('.collapsed-group').length,
      htmlLen: svg.outerHTML.length,
      text: svg.textContent || '',
    };
  });
}

test.describe('v1.8 Shapes & Templates Live Verification', () => {
  test('renders all 53 canonical shapes and supports ShapePicker shape switching', async ({ page }) => {
    test.setTimeout(60_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissWelcomeIfOpen(page);
    await appLayout.newDiagram();
    await page.waitForSelector('.cm-editor', { timeout: 10_000 });

    // 1. Render all 53 canonical shapes in a single Flowchart via CodeMirror
    const nodeLines = CANONICAL_SHAPES.map(
      (s, i) => `  N${i}@{ shape: ${s.shortName}, label: "Shape_${s.shortName}" }`
    );
    const edgeLines = CANONICAL_SHAPES.slice(0, -1).map((_, i) => `  N${i} --> N${i + 1}`);
    const full53Code = ['flowchart LR', ...nodeLines, ...edgeLines].join('\n');

    await appLayout.workspace.editor.setCode(full53Code);

    await expect
      .poll(async () => (await getShadowSvgInfo(page))?.nodeCount ?? 0, { timeout: 25_000 })
      .toBe(53);
    await expect(page.locator('[data-testid="error-message"]')).toHaveCount(0);

    const svgInfo53 = await getShadowSvgInfo(page);
    expect(svgInfo53!.width).toBeGreaterThan(100);
    expect(svgInfo53!.height).toBeGreaterThan(50);

    // 2. Verify ShapeToolbar "More" -> ShapePicker lists all 53 cells and supports alias search ('pill' -> 'stadium')
    const moreBtn = page.locator('button[aria-label="More"]').first();
    await expect(moreBtn).toBeVisible({ timeout: 10_000 });
    await moreBtn.click();

    const picker = page.locator('[data-shape-picker]').first();
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-shape-cell]')).toHaveCount(53);

    const searchInput = picker.locator('input[type="text"]').first();
    await searchInput.fill('pill');
    await expect(picker.locator('[data-shape-cell="stadium"]')).toBeVisible();
    await page.keyboard.press('Escape');

    // 3. Switch to Visual Editor, select node A, and change its shape to "hex" via PropertiesPanel
    await appLayout.workspace.editor.setCode('flowchart LR\n  A[Start] --> B[End]');
    await expect
      .poll(async () => (await getShadowSvgInfo(page))?.nodeCount ?? 0, { timeout: 15_000 })
      .toBe(2);

    await page.locator('[data-testid="workspace-view-visual"]').click();
    const visualNode = page.locator('.visual-node-overlay').first();
    await visualNode.waitFor({ state: 'visible', timeout: 10_000 });
    await visualNode.click();

    const shapeTrigger = page.locator('[data-shape-trigger]').first();
    await expect(shapeTrigger).toBeVisible({ timeout: 5_000 });
    await shapeTrigger.click();

    const panelPicker = page.locator('[data-shape-picker]').first();
    await expect(panelPicker).toBeVisible();
    await panelPicker.locator('input[type="text"]').first().fill('hex');
    await panelPicker.locator('[data-shape-cell="hex"]').click();

    await page.locator('[data-testid="workspace-view-split"]').click();
    await expect
      .poll(() => appLayout.workspace.editor.getCode(), { timeout: 5_000 })
      .toContain('A{{Start}}');

    // Switch back to Visual Editor and pick a v12-only shape ("hourglass") to verify @{ shape: ... } emission
    await page.locator('[data-testid="workspace-view-visual"]').click();
    await visualNode.waitFor({ state: 'visible', timeout: 10_000 });
    await visualNode.click();
    await shapeTrigger.click();

    const hourglassPicker = page.locator('[data-shape-picker]').first();
    await expect(hourglassPicker).toBeVisible();
    await hourglassPicker.locator('input[type="text"]').first().fill('hourglass');
    await hourglassPicker.locator('[data-shape-cell="hourglass"]').click();

    await page.locator('[data-testid="workspace-view-split"]').click();
    await expect
      .poll(() => appLayout.workspace.editor.getCode(), { timeout: 5_000 })
      .toContain('@{ shape: "hourglass"');
    await expect
      .poll(async () => (await getShadowSvgInfo(page))?.nodeCount ?? 0, { timeout: 15_000 })
      .toBe(2);
    await expect(page.locator('[data-testid="error-message"]')).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  });

  test('loads and renders all 14 curated v1.8 templates via TemplateLibrary without errors', async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissWelcomeIfOpen(page);
    await appLayout.newDiagram();
    await page.waitForSelector('.cm-editor', { timeout: 10_000 });

    const v18Templates = V18_TEMPLATES.map((spec) => {
      const tpl = TEMPLATES.find((t) => t.id === spec.id);
      if (!tpl) throw new Error(`Missing template fixture: ${spec.id}`);
      return { ...spec, tpl };
    });

    for (const { tpl, marker, checkExtra } of v18Templates) {
      await appLayout.openTemplates();
      await templatesPage.waitForVisible();

      const modal = templatesPage.modal;
      await modal.locator('[data-testid="search-input"]').fill(tpl.title);

      const card = modal.locator('[data-testid="template-item"]').filter({ hasText: tpl.title }).first();
      await expect(card).toBeVisible({ timeout: 5_000 });
      await card.click();
      await expect(modal).not.toBeVisible({ timeout: 5_000 });

      await expect
        .poll(() => appLayout.workspace.editor.getCode(), { timeout: 8_000 })
        .toContain(tpl.content.split('\n').at(-1)!.trim());

      // Wait for StatusBar to show the right diagram family label
      const expectedLabel = DIAGRAM_LABELS[tpl.type];
      await expect(appLayout.workspace.statusbar.status).toContainText(expectedLabel, { timeout: 5_000 });

      // Wait for real SVG inside [data-shadow-host] shadowRoot containing this template's rendered text & features
      await expect
        .poll(
          async () => {
            const info = await getShadowSvgInfo(page);
            if (!info || info.width <= 30 || info.height <= 30) return false;
            if (!info.text.includes(marker)) return false;
            if (checkExtra && !checkExtra(info)) return false;
            return true;
          },
          { timeout: 25_000, message: `Waiting for SVG render of template ${tpl.id} (marker: "${marker}")` }
        )
        .toBe(true);

      await expect(page.locator('[data-testid="error-message"]')).toHaveCount(0);

      // Extra explicit v1.8 feature assertions for Showcase templates
      const info = await getShadowSvgInfo(page);
      expect(info, `Missing shadow SVG for ${tpl.id}`).not.toBeNull();
      if (tpl.id === 'flowchart-v12-icons') {
        expect(info!.iconNodes).toBeGreaterThan(0);
        expect(info!.imageNodes).toBeGreaterThan(0);
      } else if (tpl.id === 'flowchart-v12-collapsed') {
        expect(info!.collapsedGroups).toBeGreaterThan(0);
      }

      // Keep tab bar tidy
      const closeBtn = page.locator('[data-testid="close-tab"]').last();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
      }
    }

    expect(pageErrors).toEqual([]);
  });
});
