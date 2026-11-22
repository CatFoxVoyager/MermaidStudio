import { test, expect, type Page } from '@playwright/test';
import { AppLayoutPage } from '../support/page-objects/AppLayoutPage';

const SHAPE_PARITY_DIAGRAM = `flowchart TD
  BROW@{ shape: browser, label: "BrowserNode" }
  CLD@{ shape: cloud, label: "CloudNode" }
  BROW --> CLD`;

async function waitForShadowSvg(page: Page, expectedSubstring: string) {
  await page.waitForFunction(
    (expected) => {
      const err = document.querySelector('[data-testid="error-message"]');
      if (err) return false;
      const host = document.querySelector('[data-shadow-host]');
      const svg = host?.shadowRoot?.querySelector('svg');
      if (!svg || svg.outerHTML.length < 300) return false;
      return svg.outerHTML.includes(expected);
    },
    expectedSubstring,
    { timeout: 25000 },
  );
}

async function getEditorCode(page: Page): Promise<string> {
  return page.locator('[data-testid="code-editor"]').evaluate((el) => {
    const cmEditor = el.querySelector('.cm-editor') as (HTMLElement & { cmView?: any }) | null;
    return cmEditor?.cmView?.state.doc.toString() ?? '';
  });
}

test.describe('Node Styling & Border-Radius Parity — Desktop (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

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

  test('Preview NodeStylePanel hides rx/ry on non-rect shapes and applies them on rect-backed shapes', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await appLayout.workspace.editor.setCode(SHAPE_PARITY_DIAGRAM);
    await waitForShadowSvg(page, 'BrowserNode');

    // 1. Select rect-backed `browser` shape
    const browserOverlay = page.locator('.node-overlay[title*="BROW"]').first();
    await expect(browserOverlay).toBeVisible({ timeout: 10000 });
    await browserOverlay.click();

    const panel = page.locator('.style-panel').first();
    await expect(panel).toBeVisible();
    await panel.locator('button', { hasText: /Advanced|Avancé/i }).first().click();

    // Border Radius X & Y sliders must be visible for `browser`
    await expect(panel).toContainText(/Border Radius X|Rayon bordure X/i);
    await expect(panel).toContainText(/Border Radius Y|Rayon bordure Y/i);

    // Adjust rx slider and verify code + live rendered SVG <rect> rx update
    const rxSlider = panel.locator('input[type="range"]').nth(1);
    await rxSlider.fill('24');
    await rxSlider.dispatchEvent('change');
    await expect.poll(() => getEditorCode(page), { timeout: 10000 }).toMatch(/(?:style BROW|classDef \S+) .*rx:24/);

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const host = document.querySelector('[data-shadow-host]');
            const g = host?.shadowRoot?.querySelector('[id*="flowchart-BROW-"]');
            const rect = g?.querySelector('rect');
            return rect ? getComputedStyle(rect).rx : null;
          }),
        { timeout: 10000 },
      )
      .toBe('24px');

    // 2. Select non-rect `cloud` shape — rx/ry must be hidden while font controls stay visible
    const cloudOverlay = page.locator('.node-overlay[title*="CLD"]').first();
    await expect(cloudOverlay).toBeVisible();
    await cloudOverlay.click();

    await expect(panel).toContainText(/Font Weight|Graisse/i);
    await expect(panel).toContainText(/Font Size|Taille police/i);
    await expect(panel).not.toContainText(/Border Radius X|Rayon bordure X/i);
    await expect(panel).not.toContainText(/Border Radius Y|Rayon bordure Y/i);
  });

  test('Visual PropertiesPanel exposes Border Style & Advanced styling with shape-gated rx/ry', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await appLayout.workspace.editor.setCode(SHAPE_PARITY_DIAGRAM);
    await waitForShadowSvg(page, 'BrowserNode');

    // Switch to Visual editor view
    await page.locator('[data-testid="workspace-view-visual"]').click();
    const browserOverlay = page.locator('.visual-node-overlay[title="BROW"]').first();
    await expect(browserOverlay).toBeVisible({ timeout: 15000 });
    await browserOverlay.click();

    // Border Style buttons visible and interactive
    const dashedBtn = page.locator('[data-node-border-style="5 5"]').first();
    await expect(dashedBtn).toBeVisible();
    await dashedBtn.click();

    // Expand Advanced section
    const advToggle = page.locator('[data-node-advanced-toggle]').first();
    await expect(advToggle).toBeVisible();
    await advToggle.click();

    const fontWeight = page.locator('[data-node-font-weight]').first();
    const fontSize = page.locator('[data-node-font-size]').first();
    const rx = page.locator('[data-node-rx]').first();
    const ry = page.locator('[data-node-ry]').first();
    await expect(fontWeight).toBeVisible();
    await expect(fontSize).toBeVisible();
    await expect(rx).toBeVisible();
    await expect(ry).toBeVisible();

    await fontWeight.selectOption('bold');
    await fontSize.fill('22');
    await rx.fill('18');
    await rx.dispatchEvent('change');

    // Select non-rect `cloud` shape — rx/ry must hide while Font Weight & Font Size remain visible
    const cloudOverlay = page.locator('.visual-node-overlay[title="CLD"]').first();
    await expect(cloudOverlay).toBeVisible();
    await cloudOverlay.click();

    await expect(page.locator('[data-node-font-weight]')).toBeVisible();
    await expect(page.locator('[data-node-font-size]')).toBeVisible();
    await expect(page.locator('[data-node-rx]')).toHaveCount(0);
    await expect(page.locator('[data-node-ry]')).toHaveCount(0);

    // Switch back to Split view and confirm all visual mutations persisted in code
    await page.locator('[data-testid="workspace-view-split"]').click();
    await page.locator('[data-testid="code-editor"] .cm-editor').waitFor({ state: 'visible', timeout: 10000 });
    const code = await getEditorCode(page);
    expect(code).toMatch(/style BROW /);
    expect(code).toContain('stroke-dasharray:5 5');
    expect(code).toContain('font-weight:bold');
    expect(code).toContain('font-size:22px');
    expect(code).toContain('rx:18');
  });
});

test.describe('Node Styling & Border-Radius Parity — Mobile (375×812 touch)', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });

  test('Mobile Preview bottom sheet gates rx/ry by shape, mutates styles, and stays free of horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="mobile-layout-root"]').waitFor({ state: 'visible', timeout: 15000 });

    // Enter code via mobile Code tab
    await page.locator('[data-testid="mobile-workspace-tab-code"]').click();
    await page.locator('[data-testid="code-editor"] .cm-editor').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[data-testid="code-editor"]').evaluate((el, newContent) => {
      const cmEditor = el.querySelector('.cm-editor') as (HTMLElement & { cmView?: any }) | null;
      if (cmEditor?.cmView) {
        const view = cmEditor.cmView;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.toString().length, insert: newContent },
        });
      }
    }, SHAPE_PARITY_DIAGRAM);

    // Switch to mobile Visual tab
    await page.locator('[data-testid="mobile-workspace-tab-visual"]').click();
    await waitForShadowSvg(page, 'BrowserNode');

    // 1. Tap `browser` node -> open NodeStylePanel bottom sheet
    const browserOverlay = page.locator('.node-overlay[title*="BROW"]').first();
    await expect(browserOverlay).toBeVisible({ timeout: 10000 });
    await browserOverlay.tap();

    const panel = page.locator('.style-panel').first();
    await expect(panel).toBeVisible();

    // Expand Advanced section inside the mobile bottom sheet
    const advBtn = panel.locator('button', { hasText: /Advanced|Avancé/i }).first();
    await advBtn.scrollIntoViewIfNeeded();
    await advBtn.tap();

    await expect(panel).toContainText(/Border Radius X|Rayon bordure X/i);
    await expect(panel).toContainText(/Border Radius Y|Rayon bordure Y/i);

    // Check zero horizontal overflow on page & bottom sheet
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const panelOverflow = await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(pageOverflow).toBe(false);
    expect(panelOverflow).toBe(false);

    // Mutate Font Size on mobile and verify persistence
    const fontSizeInput = panel.locator('input[type="number"]').last();
    await fontSizeInput.scrollIntoViewIfNeeded();
    await fontSizeInput.fill('20');

    // Close bottom sheet, tap `cloud` node -> rx/ry must be hidden
    await panel.locator('button').first().tap();
    await expect(panel).toHaveCount(0);

    const cloudOverlay = page.locator('.node-overlay[title*="CLD"]').first();
    await expect(cloudOverlay).toBeVisible();
    await cloudOverlay.tap();

    await expect(panel).toBeVisible();
    const advBtn2 = panel.locator('button', { hasText: /Advanced|Avancé/i }).first();
    await advBtn2.scrollIntoViewIfNeeded();
    await advBtn2.tap();

    await expect(panel).toContainText(/Font Weight|Graisse/i);
    await expect(panel).toContainText(/Font Size|Taille police/i);
    await expect(panel).not.toContainText(/Border Radius X|Rayon bordure X/i);
    await expect(panel).not.toContainText(/Border Radius Y|Rayon bordure Y/i);

    const panelOverflowCloud = await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(panelOverflowCloud).toBe(false);

    // Confirm mobile edit persisted in Code tab
    await page.locator('[data-testid="mobile-workspace-tab-code"]').click();
    await expect.poll(() => getEditorCode(page), { timeout: 10000 }).toMatch(/style BROW .*font-size:20px/);
  });
});
