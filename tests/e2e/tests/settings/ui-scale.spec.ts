import { test, expect } from '@playwright/test';
import { TestUtils } from '../../support/utils/test-utils';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await TestUtils.waitForApp(page);
});

test('défaut auto : 80 % à 1280×720, sans rien mémoriser', async ({ page }) => {
  await TestUtils.expectZoom(page, 0.8);
  expect(await page.evaluate(() => localStorage.getItem('mermaid-studio-ui-scale'))).toBeNull();
});

test("l'échelle suit la fenêtre en direct", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 800 });
  await TestUtils.expectZoom(page, 1);
  await page.setViewportSize({ width: 1024, height: 700 });
  await TestUtils.expectZoom(page, 0.67);
  await page.setViewportSize({ width: 767, height: 800 });
  await TestUtils.expectZoom(page, 1);
});

test.describe('écran large', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('1440×900 par défaut : échelle 1', async ({ page }) => {
    await TestUtils.expectZoom(page, 1);
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('390×844 : échelle 1 et mise en page mobile', async ({ page }) => {
    await TestUtils.expectZoom(page, 1);
    await expect(page.getByTestId('mobile-layout-root')).toBeVisible();
    await expect(page.getByTestId('ui-scale-button')).toHaveCount(0); // vrai dès la tâche 8
  });
});

test('réglage manuel : 100 % puis rechargement, puis retour à Auto', async ({ page }) => {
  await page.getByTestId('ui-scale-button').click();
  await page.getByTestId('ui-scale-option-100').click();
  await TestUtils.expectZoom(page, 1);
  await page.reload();
  await TestUtils.waitForApp(page);
  await TestUtils.expectZoom(page, 1);
  await page.getByTestId('ui-scale-button').click();
  await page.getByTestId('ui-scale-option-auto').click();
  await TestUtils.expectZoom(page, 0.8);
});

test('curseur continu (10 % à 200 %) : valeur personnalisée mémorisée au rechargement', async ({ page }) => {
  await page.getByTestId('ui-scale-button').click();
  const slider = page.getByTestId('ui-scale-slider');
  await expect(slider).toHaveAttribute('min', '10');
  await expect(slider).toHaveAttribute('max', '200');
  await slider.fill('42');
  await TestUtils.expectZoom(page, 0.42);
  await expect(page.getByTestId('ui-scale-menu')).toBeVisible();
  await page.reload();
  await TestUtils.waitForApp(page);
  await TestUtils.expectZoom(page, 0.42);
  await page.getByTestId('ui-scale-button').click();
  await page.getByTestId('ui-scale-option-200').click();
  await TestUtils.expectZoom(page, 2);
});

test('125 % sur 1280 px : le bouton reste utilisable', async ({ page }) => {
  await page.getByTestId('ui-scale-button').click();
  await page.getByTestId('ui-scale-option-125').click();
  await TestUtils.expectZoom(page, 1.25);
  await expect(page.getByTestId('ui-scale-button')).toBeVisible();
  await page.getByTestId('ui-scale-button').click();
  await expect(page.getByTestId('ui-scale-menu')).toBeVisible();
});

test("raccourcis : Alt+−, Alt++, Alt+0, focus dans l'éditeur", async ({ page }) => {
  // Desktop Safari carries a Mac UA, where the primary shortcut modifier is
  // Ctrl (keeping Option+- free for typing en-dash); Windows/Linux use Alt.
  const mod = await page.evaluate(() =>
    navigator.userAgent.includes('Mac') ? 'Control' : 'Alt'
  );
  // Wait for initial render + auto-fit (node overlays appear after auto-fit
  // settles), then nudge diagram zoom off 100% so that Minus, Equal, and Digit0
  // would all visibly mutate the canvas if UI scale shortcuts leaked into PreviewPanel.
  await page.locator('.node-overlay').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const getDiagramTransform = () =>
    page.locator('[data-shadow-host]').evaluate(el => (el as HTMLElement).style.transform);
  const initialDiagramTransform = await getDiagramTransform();
  expect(initialDiagramTransform).toMatch(/^scale\(/);

  await page.locator('.cm-content').click();
  await page.keyboard.press(`${mod}+Minus`);
  await TestUtils.expectZoom(page, 0.75);
  expect(await getDiagramTransform()).toBe(initialDiagramTransform);
  await page.keyboard.press(`${mod}+Equal`);
  await TestUtils.expectZoom(page, 0.8);
  expect(await getDiagramTransform()).toBe(initialDiagramTransform);
  await page.keyboard.press(`${mod}+Digit0`);
  await TestUtils.expectZoom(page, 1);
  expect(await getDiagramTransform()).toBe(initialDiagramTransform);
  expect(await page.evaluate(() => document.querySelector('.cm-content')!.textContent)).not.toContain('–');
});

test("la palette ouvre le menu d'échelle et rend le focus au bouton", async ({ page }) => {
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('Search commands…').fill('scale');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ui-scale-menu')).toBeVisible();
  await expect(page.getByTestId('ui-scale-button')).toBeFocused();
});

test('notice une seule fois, avec son action', async ({ page }) => {
  const notice = page.getByText(/Interface adjusted to 80/);
  await expect(notice).toBeVisible({ timeout: 5000 });
  await page.getByTestId('toast-action').click();
  await expect(page.getByTestId('ui-scale-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await TestUtils.waitForApp(page);
  await page.waitForTimeout(2500); // au-delà du délai d'affichage
  await expect(page.getByText(/Interface adjusted to/)).toHaveCount(0);
});
