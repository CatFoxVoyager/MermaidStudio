import { test, expect, Page } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TemplatesPage } from '../../support/page-objects/ModalPages';
import { CANONICAL_SHAPES } from '../../../../src/lib/mermaid/shapes';
import { TEMPLATES } from '../../../../src/constants/templates';
import { DIAGRAM_LABELS } from '../../../../src/constants/diagramLabels';

const TEMPLATE_MARKERS: Record<string, string> = {
  'flowchart-basic': 'Process',
  'flowchart-cicd': 'Docker Build',
  'sequence-api': 'API Gateway',
  'sequence-oauth': 'Resource Server',
  'class-ecommerce': 'OrderItem',
  'er-blog': 'COMMENT',
  'state-order': 'Fulfillment',
  'gantt-sprint': 'UI Wireframes',
  'pie-market': 'Chrome',
  'mindmap-product': 'Auth System',
  'git-feature': 'Initial commit',
  'journey-onboarding': 'Email verification',
  'quadrant-priorities': 'Crisis Management',
  'requirement-system': 'Authenticate every API request',
  'timeline-product': 'MVP Release',
  'sankey-traffic': 'Landing',
  'xy-scatter': 'Performance vs Load',
  'kanban-sprint': 'Implement login',
  'architecture-system': 'API Gateway',
  'block-network': 'Load Balancer',
  'class-animals': 'Manufacturer',
  'c4-system-context': 'Online Store',
  'packet-udp': 'Destination Port',
  'requirement-auth': 'user_service',
  'usecase-system': 'View dashboard',
  'flowchart-v12-shapes': 'Event Queue',
  'flowchart-v12-icons': 'Client App',
  'flowchart-v12-edges': 'API Ingress',
  'flowchart-v12-collapsed': 'Platform Services',
  'ishikawa-root-cause': 'Blurry Photo',
  'radar-skills': 'Team Alpha',
  'treemap-budget': 'Engineering',
  'eventmodeling-checkout': 'ShopUI',
  'venn-product-fit': 'Desirable',
  'treeview-repo': 'PreviewPanel.tsx',
  'wardley-tea-shop': 'Cup of Tea',
  'cynefin-incident': 'Restart service',
  'railroad-grammar': 'expression',
  'swimlane-support': 'Request service',
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  test('renders all 53 canonical shapes and switches through all 53 shapes in Visual Editor', async ({ page }) => {
    test.setTimeout(120_000);
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

    // 3. Switch to Visual Editor, select standalone node A, and interactively switch through ALL 53 shapes via PropertiesPanel
    await appLayout.workspace.editor.setCode('flowchart LR\n  A[Start]\n  B[End]\n  A --> B');
    await expect
      .poll(async () => (await getShadowSvgInfo(page))?.nodeCount ?? 0, { timeout: 15_000 })
      .toBe(2);

    await page.locator('[data-testid="workspace-view-visual"]').click();
    const visualNode = page.locator('.visual-node-overlay').first();
    await visualNode.waitFor({ state: 'visible', timeout: 10_000 });
    await visualNode.click();

    const shapeTrigger = page.locator('[data-shape-trigger]').first();
    await expect(shapeTrigger).toBeVisible({ timeout: 5_000 });

    // Order so 'rect' is tested too by starting from 'rounded' -> ... -> 'rect' at the end
    const shapeOrder = [
      ...CANONICAL_SHAPES.filter((s) => s.shortName !== 'rect'),
      ...CANONICAL_SHAPES.filter((s) => s.shortName === 'rect'),
    ];

    for (const shape of shapeOrder) {
      const prevTriggerLabel = (await shapeTrigger.innerText()).trim();
      await shapeTrigger.click();
      const panelPicker = page.locator('[data-shape-picker]').first();
      await expect(panelPicker).toBeVisible({ timeout: 5_000 });

      const cell = panelPicker.locator(`[data-shape-cell="${shape.shortName}"]`);
      await cell.scrollIntoViewIfNeeded();
      await cell.click();
      await expect(panelPicker).not.toBeVisible({ timeout: 5_000 });
      await expect
        .poll(async () => (await shapeTrigger.innerText()).trim(), {
          timeout: 5_000,
          message: `Trigger label did not change after picking shape: ${shape.shortName}`,
        })
        .not.toBe(prevTriggerLabel);

      // Ensure VisualEditorCanvas re-renders without Parse Error and keeps 2 nodes
      await expect
        .poll(
          async () => page.locator('.mermaid-container svg g.node').count(),
          { timeout: 10_000, message: `Visual Editor failed to render shape: ${shape.shortName}` }
        )
        .toBe(2);
      await expect(page.getByText('Parse Error')).toHaveCount(0);
    }

    // Verify classic delimiter emission ('hex') and v12 directive emission ('hourglass') in code
    await shapeTrigger.click();
    await page.locator(`[data-shape-picker] [data-shape-cell="hex"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-shape-picker] [data-shape-cell="hex"]`).click();
    await page.locator('[data-testid="workspace-view-split"]').click();
    await expect
      .poll(() => appLayout.workspace.editor.getCode(), { timeout: 5_000 })
      .toContain('A{{"Start"}}');

    await page.locator('[data-testid="workspace-view-visual"]').click();
    await visualNode.waitFor({ state: 'visible', timeout: 10_000 });
    await visualNode.click();
    await shapeTrigger.click();
    await page.locator(`[data-shape-picker] [data-shape-cell="hourglass"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-shape-picker] [data-shape-cell="hourglass"]`).click();

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

  test('loads and renders ALL 39 templates via TemplateLibrary without errors', async ({ page }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissWelcomeIfOpen(page);
    await appLayout.newDiagram();
    await page.waitForSelector('.cm-editor', { timeout: 10_000 });

    for (const tpl of TEMPLATES) {
      const marker = TEMPLATE_MARKERS[tpl.id];
      expect(marker, `Missing marker mapping for template ${tpl.id}`).toBeTruthy();

      await appLayout.openTemplates();
      await templatesPage.waitForVisible();

      const modal = templatesPage.modal;
      await modal.locator('[data-testid="search-input"]').fill(tpl.title);

      const exactTitle = new RegExp(`^${escapeRegExp(tpl.title)}$`);
      const card = modal
        .locator('[data-testid="template-item"]')
        .filter({ has: page.locator('[data-testid="template-name"]', { hasText: exactTitle }) })
        .first();
      await expect(card, `Template card not found: ${tpl.title}`).toBeVisible({ timeout: 5_000 });
      await card.click();
      await expect(modal).not.toBeVisible({ timeout: 5_000 });

      await expect
        .poll(() => appLayout.workspace.editor.getCode(), { timeout: 8_000 })
        .toContain(tpl.content.split('\n').at(-1)!.trim());

      // Wait for StatusBar to show the right diagram family label
      const expectedLabel = DIAGRAM_LABELS[tpl.type];
      await expect(appLayout.workspace.statusbar.status).toContainText(expectedLabel, { timeout: 5_000 });

      // Wait for real SVG inside [data-shadow-host] shadowRoot containing this template's rendered text & features
      const normalizedMarker = marker.replace(/\s+/g, '');
      await expect
        .poll(
          async () => {
            const info = await getShadowSvgInfo(page);
            if (!info || info.width <= 30 || info.height <= 30) return false;
            if (!info.text.replace(/\s+/g, '').includes(normalizedMarker)) return false;
            if (tpl.id === 'flowchart-v12-icons') {
              return info.iconNodes > 0 && info.imageNodes > 0;
            }
            if (tpl.id === 'flowchart-v12-collapsed') {
              return info.collapsedGroups > 0;
            }
            return true;
          },
          { timeout: 25_000, message: `Waiting for SVG render of template ${tpl.id} (marker: "${marker}")` }
        )
        .toBe(true);

      await expect(page.locator('[data-testid="error-message"]')).toHaveCount(0);

      // Keep tab bar tidy
      const closeBtn = page.locator('[data-testid="close-tab"]').last();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
      }
    }

    expect(pageErrors).toEqual([]);
  });
});
