import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

test.describe('Theme Settings', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should toggle theme using button', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // Toggle theme
    await topBar.toggleTheme();

    // Verify theme changed
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(newTheme).toBe(initialTheme === 'dark' ? 'light' : 'dark');
  });

  test('should persist theme selection', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Toggle theme
    await topBar.toggleTheme();

    // Reload page
    await page.reload();

    // Verify theme is preserved
    const theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('dark'); // Assuming it was toggled to dark
  });

  test('should display theme indicator in top bar', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Check theme toggle button exists
    await expect(topBar.themeToggle).toBeVisible();

    // Check button reflects current theme
    const buttonClass = await topBar.themeToggle.getAttribute('class');
    expect(buttonClass).toContain('theme-toggle');
  });

  test('should handle theme change during editing', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;
    const editor = appLayout.workspace.editor;

    // Write some code
    await editor.setCode('graph TD\n  A --> B');

    // Toggle theme
    await topBar.toggleTheme();

    // Verify editor content is preserved
    const code = await editor.getCode();
    expect(code).toBe('graph TD\n  A --> B');

    // Verify preview still works
    await TestUtils.waitForDiagramRender(page);
    expect(appLayout.workspace.preview.preview).toBeVisible();
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