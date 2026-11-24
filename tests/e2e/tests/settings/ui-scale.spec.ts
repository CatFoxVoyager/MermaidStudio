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
