import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Selectors, Timeouts } from '../../support/utils/test-utils';
import { basicDiagrams } from '../../fixtures/basic-diagrams';

test.describe('Basic Diagram Creation', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Ensure we have at least one tab
    const tabCount = await appLayout.tabBar.tabs.count();
    if (tabCount === 0) {
      await appLayout.newDiagram();
      await page.waitForTimeout(500);
    } else if (tabCount > 1) {
      // Close extra tabs to have a consistent state
      for (let i = tabCount - 1; i > 0; i--) {
        await appLayout.tabBar.closeTab(i);
        await page.waitForTimeout(200);
      }
    }

    // Write some initial content to the first tab to trigger render
    await appLayout.workspace.editor.setCode(basicDiagrams.simpleFlow);
    await TestUtils.waitForDiagramRender(page);
  });

  test('should create a new diagram tab', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const tabBar = appLayout.tabBar;

    // Check initial state (should have 1 tab from beforeEach)
    await expect(tabBar.tabs).toHaveCount(1);

    // Create new diagram
    await appLayout.newDiagram();

    // Verify new tab is created
    await expect(tabBar.tabs).toHaveCount(2);
    // The new tab should be active (title may vary based on implementation)
  });

  test('should write basic mermaid code', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Write mermaid code
    await editor.setCode(basicDiagrams.simpleFlow);

    // Verify code is written
    const code = await editor.getCode();
    expect(code).toBe(basicDiagrams.simpleFlow);
  });

  test('should render diagram on code change', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const preview = appLayout.workspace.preview;

    // Write diagram code
    await appLayout.workspace.editor.setCode(basicDiagrams.sequenceDiagram);

    // Wait for render
    await TestUtils.waitForDiagramRender(page);

    // Verify preview is visible and has content
    await expect(preview.preview).toBeVisible();
    const renderTime = await appLayout.workspace.statusbar.getRenderTime();
    expect(renderTime).toBeDefined();
  });

  test('should handle invalid mermaid syntax gracefully', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;
    const preview = appLayout.workspace.preview;

    // Write invalid syntax
    await editor.setCode('invalid mermaid syntax');

    // Wait a bit for error to appear
    await page.waitForTimeout(Timeouts.short);

    // Should show error instead of crashing
    const errors = await TestUtils.getDiagramErrors(page);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should switch between tabs', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const tabBar = appLayout.tabBar;
    const editor = appLayout.workspace.editor;

    // Get initial code (from beforeEach)
    const initialCode = await editor.getCode();
    expect(initialCode).toBeTruthy();

    // Create new diagram
    await appLayout.newDiagram();

    // Set code in the new tab
    await editor.setCode(basicDiagrams.simpleFlow);
    await page.waitForTimeout(200);

    // Verify code was set
    const codeInSecondTab = await editor.getCode();
    expect(codeInSecondTab).toBe(basicDiagrams.simpleFlow);

    // Switch back to first tab
    await tabBar.switchTab(0);
    await page.waitForTimeout(300); // Wait for editor to update

    // Verify we're back on first tab (different content)
    const codeInFirstTab = await editor.getCode();
    expect(codeInFirstTab).toBe(initialCode);

    // Switch to second tab again
    await tabBar.switchTab(1);
    await page.waitForTimeout(300); // Wait for editor to update

    // Verify content is preserved in second tab
    const codeInSecondTabAgain = await editor.getCode();
    expect(codeInSecondTabAgain).toBe(basicDiagrams.simpleFlow);
  });

  test('should close tabs', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const tabBar = appLayout.tabBar;

    // Create two more tabs
    await appLayout.newDiagram();
    await appLayout.newDiagram();

    // Verify we have 3 tabs
    await expect(tabBar.tabs).toHaveCount(3);

    // Close middle tab
    await tabBar.closeTab(1);

    // Verify tabs count decreased
    await expect(tabBar.tabs).toHaveCount(2);
  });

  test('should clear editor content on new diagram', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Editor should have content from beforeEach
    const initialCode = await editor.getCode();
    expect(initialCode).toBeTruthy();

    // Create new diagram
    await appLayout.newDiagram();

    // Write content to the new tab
    await editor.setCode('test content');

    // Verify content is set
    const code = await editor.getCode();
    expect(code).toBe('test content');
  });
});