import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { TestUtils } from '../../support/utils/test-utils';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';

// Desktop viewport, short on purpose: the 0.8-scale height regression
// (root painting 512px instead of 640px) is easiest to catch at low height.
test.use({ viewport: { width: 1280, height: 640 } });

test.beforeEach(async ({ page }) => {
  await TestUtils.pinUIScale(page, '1');
  await page.goto('/');
  await TestUtils.waitForApp(page);
  const appLayout = new AppLayoutPage(page);
  await appLayout.newDiagram();
  // The fresh-profile empty state opens the "New Diagram" modal instead of
  // creating silently — complete it so the editor stays reachable. The
  // top-bar path (tab already open) creates directly, hence the try/catch.
  const createModal = page.getByTestId('modal');
  try {
    await createModal.waitFor({ state: 'visible', timeout: 3000 });
    await page.getByPlaceholder('E.g. Network map').fill('ui-scale-alignment');
    await page.getByRole('button', { name: 'Create' }).click();
    await createModal.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // No modal — the diagram was created directly.
  }
  await appLayout.workspace.editor.setCode('graph TD\n A --> B\n B --> C');
  await TestUtils.waitForDiagramRender(page);
});

test("l'appli remplit le viewport à l'échelle 0.8", async ({ page }) => {
  await TestUtils.setUiScale(page, 0.8);
  const root = await page.evaluate(() => {
    const b = document.querySelector('#root > div')!.getBoundingClientRect();
    return { w: b.width, h: b.height };
  });
  expect(root).toEqual({ w: 1280, h: 640 }); // 512 en hauteur avant correction
});

test("une modale peut occuper 90 % du viewport à l'échelle 0.8", async ({ page }) => {
  await TestUtils.setUiScale(page, 0.8);
  await page.keyboard.press('Control+k');
  const maxH = await page.getByTestId('modal').evaluate(el =>
    parseFloat(getComputedStyle(el).maxHeight)
  );
  expect(maxH).toBe(720); // px locaux : 90 % de 640 / 0,8
});

test.describe('éditeur visuel', () => {
  const CANVAS = '[data-testid="visual-editor-canvas"]';

  test.beforeEach(async ({ page }) => {
    await page.getByTestId('workspace-view-visual').click();
    await page.waitForSelector(CANVAS);
    await page.waitForSelector('.visual-node-overlay');
  });

  for (const scale of [0.8, 1.25]) {
    test(`surcouches de nœuds alignées à l'échelle ${scale}`, async ({ page }) => {
      await TestUtils.setUiScale(page, scale);
      await page.getByTestId('visual-fit-button').click(); await page.waitForTimeout(400);
      expect(await TestUtils.worstOverlayOffset(page, '.visual-node-overlay', 'body')).toBeLessThanOrEqual(1);
      const before = await TestUtils.overlayCenter(page, '.visual-node-overlay >> nth=0');
      await TestUtils.dragPreview(page, 60, 20, CANVAS);       // sur la grille vide
      const after = await TestUtils.overlayCenter(page, '.visual-node-overlay >> nth=0');
      expect(Math.abs(after.x - before.x - 60)).toBeLessThanOrEqual(1);   // le canevas suit le pointeur 1:1
      expect(Math.abs(after.y - before.y - 20)).toBeLessThanOrEqual(1);
      expect(await TestUtils.worstOverlayOffset(page, '.visual-node-overlay', 'body')).toBeLessThanOrEqual(1);
    });
  }

  test("la molette déplace le canevas de sa valeur en px écran", async ({ page }) => {
    await TestUtils.setUiScale(page, 0.8);
    const node = page.locator('.visual-node-overlay').first();
    const before = await TestUtils.overlayCenter(page, node);
    const p = await TestUtils.pointOnGrid(page, CANVAS);
    await page.mouse.move(p.x, p.y); await page.mouse.wheel(0, 80); await page.waitForTimeout(300);
    const after = await TestUtils.overlayCenter(page, node);
    expect(before.y - after.y).toBeGreaterThanOrEqual(79); expect(before.y - after.y).toBeLessThanOrEqual(81);
  });

  test("la ligne de connexion part du centre du nœud à l'échelle 0.8", async ({ page }) => {
    await TestUtils.setUiScale(page, 0.8);
    const c = await TestUtils.overlayCenter(page, page.locator('.visual-node-overlay').first());
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    const tip = { x: c.x + 40, y: c.y + 30 };
    await page.mouse.move(tip.x, tip.y, { steps: 5 });
    const [x1, y1, x2, y2] = await page.locator('[data-testid="drag-connect-indicator"] line')
      .evaluate(el => {
        // The line attributes are LOCAL px (SVG user units sit under the
        // html zoom); multiply by --ui-scale to compare against the screen-px
        // pointer coordinates.
        const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')) || 1;
        return ['x1', 'y1', 'x2', 'y2'].map(a => Number(el.getAttribute(a)) * s);
      });
    expect(Math.max(Math.abs(x1 - c.x), Math.abs(y1 - c.y), Math.abs(x2 - tip.x), Math.abs(y2 - tip.y))).toBeLessThanOrEqual(1);
    await page.mouse.up();
  });

  for (const scale of [0.8, 1.25]) {
    test(`le sélecteur de formes reste sous son déclencheur à l'échelle ${scale}`, async ({ page }) => {
      await TestUtils.setUiScale(page, scale);
      const more = page.getByRole('button', { name: 'More', exact: true }).first();
      await more.click();
      const picker = await page.locator('[data-shape-picker]').boundingBox();
      const btn = await more.boundingBox();
      expect(picker).not.toBeNull();
      expect(btn).not.toBeNull();
      expect(Math.abs(picker!.y - (btn!.y + btn!.height + 8))).toBeLessThanOrEqual(1);
      expect(Math.abs((picker!.x + picker!.width) - (btn!.x + btn!.width))).toBeLessThanOrEqual(1);
      expect(picker!.x).toBeGreaterThanOrEqual(0);
      expect(picker!.y + picker!.height).toBeLessThanOrEqual(640);
    });
  }
});

test.describe('menu contextuel', () => {
  // Standard desktop height so the 8-item Welcome Diagram menu (~376 screen px
  // at 1.25x) fits below the row without triggering the viewport bottom clamp
  // (which is verified independently in ContextMenu.uiscale.test.tsx).
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const scale of [0.8, 1.25]) {
    test(`le menu contextuel reste accroché à sa rangée à l'échelle ${scale}`, async ({ page }) => {
      await TestUtils.setUiScale(page, scale);
      const row = page.getByText('Welcome Diagram', { exact: true }).first();
      const geo = await row.evaluate(el => {
        const r = (el.closest('.group') ?? el.closest('button') ?? el).getBoundingClientRect();
        return { x: r.left, y: r.top, h: r.height, bottom: r.bottom };
      });
      await page.mouse.click(geo.x + 60, geo.y + geo.h / 2, { button: 'right' });
      const menu = await page.getByRole('menu').boundingBox();
      expect(menu).not.toBeNull();
      expect(Math.abs(menu!.x - geo.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(menu!.y - (geo.bottom + 4))).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
    });
  }
});

for (const scale of [0.8, 1.25]) {
  test(`surcouches de l'aperçu alignées à l'échelle ${scale}`, async ({ page }) => {
    await page.waitForSelector('.node-overlay');
    await TestUtils.setUiScale(page, scale);
    await page.getByTestId('fit-button').click(); await page.waitForTimeout(400);
    expect(await TestUtils.worstOverlayOffset(page, '.node-overlay', '[data-testid="preview-panel"]')).toBeLessThanOrEqual(1);
    const before = await TestUtils.overlayCenter(page, '.node-overlay >> nth=0');
    await TestUtils.dragPreview(page, 50, 30, '[data-testid="preview-panel"]');
    const after = await TestUtils.overlayCenter(page, '.node-overlay >> nth=0');
    expect(Math.abs(after.x - before.x - 50)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y - 30)).toBeLessThanOrEqual(1);
    expect(await TestUtils.worstOverlayOffset(page, '.node-overlay', '[data-testid="preview-panel"]')).toBeLessThanOrEqual(1);
  });
}

for (const scale of [0.8, 1.25]) {
  test(`l'autocomplétion reste collée sous la ligne à l'échelle ${scale}`, async ({ page }) => {
    await TestUtils.setUiScale(page, scale);
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+End'); await page.keyboard.press('Enter');
    await page.keyboard.type('sub', { delay: 50 }); await page.waitForTimeout(800);
    const gap = await page.evaluate(() => document.querySelector('.cm-tooltip')!.getBoundingClientRect().top
      - document.querySelector('.cm-activeLine')!.getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(-6); expect(gap).toBeLessThanOrEqual(2);   // −33 avant correction
    const fills = await page.evaluate(() => Math.abs(document.querySelector('.cm-editor')!.getBoundingClientRect().height
      - document.querySelector('[data-testid="code-editor"]')!.getBoundingClientRect().height));
    expect(fills).toBeLessThanOrEqual(1);
  });
}

test("l'export PNG garde les mêmes dimensions à l'échelle 1 et à 0.8", async ({ page }) => {
  async function exportPngDimensions(): Promise<{ width: number; height: number }> {
    await page.keyboard.press('Control+e');
    const modal = page.getByTestId('modal');
    await expect(modal).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await modal.getByRole('button', { name: /Export PNG/i }).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const bytes = await readFile(filePath!);
    // PNG IHDR chunk starts at byte 8 (4-byte length + 4-byte "IHDR");
    // big-endian width and height occupy bytes 16..19 and 20..23.
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    return { width, height };
  }

  await TestUtils.setUiScale(page, 1);
  const atOne = await exportPngDimensions();
  expect(atOne.width).toBeGreaterThan(0);
  expect(atOne.height).toBeGreaterThan(0);

  await TestUtils.setUiScale(page, 0.8);
  const atPointEight = await exportPngDimensions();
  expect(atPointEight).toEqual(atOne);
});
