import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Selectors, Timeouts } from '../../support/utils/test-utils';
import { basicDiagrams } from '../../fixtures/basic-diagrams';

test.describe('Basic Diagram Creation', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should create a new diagram tab', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const tabBar = appLayout.tabBar;

    // Check initial state
    await expect(tabBar.tabs).toHaveCount(1);

    // Create new diagram
    await appLayout.newDiagram();

    // Verify new tab is created
    await expect(tabBar.tabs).toHaveCount(2);
    await expect(tabBar.activeTab).toHaveText(/Diagram 2/);
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

    // Create multiple diagrams
    await appLayout.newDiagram();
    await editor.setCode(basicDiagrams.simpleFlow);

    // Switch back to first tab
    await tabBar.switchTab(0);

    // Switch to second tab
    await tabBar.switchTab(1);

    // Verify content is preserved
    await expect(editor.getCode()).toBe(basicDiagrams.simpleFlow);
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

    // Write some content
    await editor.setCode('graph TD\n  A --> B');

    // Create new diagram
    await appLayout.newDiagram();

    // Verify editor is empty
    const code = await editor.getCode();
    expect(code).toBe('');
  });
});