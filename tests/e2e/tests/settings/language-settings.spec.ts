import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils } from '../../support/utils/test-utils';

test.describe('Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    // Clear state to ensure consistent tab count
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Reload after clearing to get clean state
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Create a new diagram first since app starts with no tabs
    await appLayout.newDiagram();
    // Wait for tab to be created
    await page.waitForTimeout(500);
  });

  test('should change language via globe menu', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    
    // Check initial language (should be English default)
    // We check the text of the "New Diagram" button
    const newDiagramButton = page.locator('[data-testid="new-diagram-button"]');
    await expect(newDiagramButton).toContainText('New Diagram');

    // Change language to French
    await appLayout.topBar.changeLanguage('fr');

    // Verify language change by checking button text
    await expect(newDiagramButton).toContainText('Nouveau');
  });

  test('should persist language selection after reload', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    
    // Change language to French
    await appLayout.topBar.changeLanguage('fr');
    await expect(page.locator('[data-testid="new-diagram-button"]')).toContainText('Nouveau');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify language is still French
    // Note: reload might have closed tabs, let's create one if needed
    if (await page.locator('[data-testid="tab"]').count() === 0) {
      await appLayout.newDiagram();
    }
    await expect(page.locator('[data-testid="new-diagram-button"]')).toContainText('Nouveau');
  });

  test('should toggle between languages', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const newDiagramButton = page.locator('[data-testid="new-diagram-button"]');

    // Switch to French
    await appLayout.topBar.changeLanguage('fr');
    await expect(newDiagramButton).toContainText('Nouveau');

    // Switch back to English
    await appLayout.topBar.changeLanguage('en');
    await expect(newDiagramButton).toContainText('New Diagram');
  });

  test('should handle language change with diagram content', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Write some code
    const testCode = 'graph TD\n  A --> B';
    await editor.setCode(testCode);

    // Change language
    await appLayout.topBar.changeLanguage('fr');

    // Verify diagram content is preserved
    const codeAfter = await editor.getCode();
    expect(codeAfter).toBe(testCode);
    
    // Verify UI is in French
    await expect(page.locator('[data-testid="new-diagram-button"]')).toContainText('Nouveau');
  });
});
