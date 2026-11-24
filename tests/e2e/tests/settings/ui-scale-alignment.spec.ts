import { test, expect } from '@playwright/test';
import { TestUtils } from '../../support/utils/test-utils';

// Desktop viewport, short on purpose: the 0.8-scale height regression
// (root painting 512px instead of 640px) is easiest to catch at low height.
test.use({ viewport: { width: 1280, height: 640 } });

test.beforeEach(async ({ page }) => {
  await TestUtils.pinUIScale(page, '1');
  await page.goto('/');
  await TestUtils.waitForApp(page);
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
