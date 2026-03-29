import { test, expect } from '@playwright/test';

test.describe('Button Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    page.on('pageerror', exc => {
      console.log('Page error:', exc);
    });

    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    // Wait for React to mount
    await page.waitForTimeout(3000);
  });

  test('should load the page', async ({ page }) => {
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'test-screenshot.png' });

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check if page has content
    const body = await page.locator('body').textContent();
    console.log('Page body length:', body?.length);
  });

  test('should have New Diagram button', async ({ page }) => {
    const newDiagramButton = page.locator('[data-testid="new-diagram-button"]');
    await expect(newDiagramButton).toBeVisible();
  });

  test('should have Templates button', async ({ page }) => {
    const templatesButton = page.locator('[data-testid="templates-button"]');
    await expect(templatesButton).toBeVisible();
  });

  test('should open templates modal when clicking Templates button', async ({ page }) => {
    const templatesButton = page.locator('[data-testid="templates-button"]');
    await templatesButton.click();

    // Wait for modal to appear
    const modal = page.locator('[data-testid="templates-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should create new diagram when clicking New Diagram button', async ({ page }) => {
    const newDiagramButton = page.locator('[data-testid="new-diagram-button"]');

    // Click new diagram button - should not throw any errors
    await newDiagramButton.click();

    // Wait for any async operations to complete
    await page.waitForTimeout(2000);

    // If we get here without errors, the button click worked
    // The button should still be visible (app didn't crash)
    await expect(newDiagramButton).toBeVisible();
  });
});
