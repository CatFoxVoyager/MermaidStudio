import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

test.describe('Theme Settings', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    // Wait a bit for React to mount
    await page.waitForTimeout(1000);
    // Create a new diagram first since app starts with no tabs
    await appLayout.newDiagram();
    // Wait for tab to be created
    await page.waitForTimeout(500);
    // Write some initial content to trigger render
    await appLayout.workspace.editor.setCode('graph TD\n  A --> B');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should toggle theme using button', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Get initial theme state
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });

    // Toggle theme
    await topBar.toggleTheme();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Verify theme changed
    const newTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(newTheme).toBe(!initialTheme);
  });

  test('should persist theme selection', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });

    // Toggle theme
    await topBar.toggleTheme();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Verify theme is preserved (should be opposite of initial)
    const preservedTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(preservedTheme).toBe(!initialTheme);
  });

  test('should display theme indicator in top bar', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Check theme toggle button exists
    await expect(topBar.themeToggle).toBeVisible();

    // Check button has the correct data-testid attribute
    const dataTestId = await topBar.themeToggle.getAttribute('data-testid');
    expect(dataTestId).toBe('theme-toggle');
  });

  test('should handle theme change during editing', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;
    const editor = appLayout.workspace.editor;

    // Write some code
    await editor.setCode('graph TD\n  A --> B');

    // Toggle theme
    await topBar.toggleTheme();

    // Wait for theme change to apply
    await page.waitForTimeout(500);

    // Verify editor content is preserved
    const code = await editor.getCode();
    expect(code).toBe('graph TD\n  A --> B');

    // Verify preview still works after theme change
    await TestUtils.waitForDiagramRender(page);
    await expect(appLayout.workspace.preview.preview).toBeVisible();
  });

  test('should have appropriate theme colors', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Get background color in light theme
    const initialBg = await page.locator('body').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Toggle to dark
    await topBar.toggleTheme();

    // Verify background color changed
    const newBg = await page.locator('body').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(newBg).not.toBe(initialBg);

    // Toggle back to light
    await topBar.toggleTheme();

    // Verify it changed back
    const finalBg = await page.locator('body').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(finalBg).toBe(initialBg);
  });
});