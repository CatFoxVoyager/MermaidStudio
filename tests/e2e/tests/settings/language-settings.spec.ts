import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { SettingsPage } from '../../support/page-objects/ModalPages';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

test.describe('Language Settings', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should open settings modal', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);

    // Open settings modal
    await appLayout.openSettings();

    // Verify modal is visible
    await expect(settingsPage.modal).toBeVisible();
  });

  test('should change language in settings', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);

    // Open settings modal
    await appLayout.openSettings();

    // Change language to French
    await settingsPage.setLanguage('French');

    // Verify language change
    const languageSelect = await page.locator('[data-testid="language-select"]').inputValue();
    expect(languageSelect).toContain('fr');
  });

  test('should persist language selection', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);

    // Open settings modal
    await appLayout.openSettings();

    // Change language
    await settingsPage.setLanguage('Spanish');

    // Close modal
    await settingsPage.close();

    // Reload page
    await page.reload();

    // Verify language is preserved
    const language = await page.evaluate(() => {
      return document.documentElement.getAttribute('lang');
    });
    expect(language).toContain('es');
  });

  test('should show appropriate UI text based on language', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);

    // Open settings modal
    await appLayout.openSettings();

    // Get original text
    const originalTitle = await page.locator('[data-testid="settings-title"]').textContent();

    // Change language
    await settingsPage.setLanguage('Spanish');

    // Verify text changed
    const newTitle = await page.locator('[data-testid="settings-title"]').textContent();
    expect(newTitle).not.toBe(originalTitle);
  });

  test('should close settings modal', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);

    // Open settings modal
    await appLayout.openSettings();

    // Close modal
    await settingsPage.close();

    // Verify modal is closed
    await expect(settingsPage.modal).not.toBeVisible();
  });

  test('should handle language change with unsaved diagram', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);
    const editor = appLayout.workspace.editor;

    // Write some code
    await editor.setCode('graph TD\n  A --> B');

    // Open settings modal
    await appLayout.openSettings();

    // Change language
    await settingsPage.setLanguage('French');

    // Close modal
    await settingsPage.close();

    // Verify diagram content is preserved
    const code = await editor.getCode();
    expect(code).toBe('graph TD\n  A --> B');
  });

  test('should have available language options', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const settingsPage = new SettingsPage(page);

    // Open settings modal
    await appLayout.openSettings();

    // Get language options
    const options = await page.locator('[data-testid="language-select"] option').all();

    // Verify common languages are available
    const optionTexts = options.map(opt => opt.textContent());
    expect(optionTexts).toContain('English');
    expect(optionTexts).toContain('French');
    expect(optionTexts).toContain('Spanish');
    expect(optionTexts).toContain('German');
  });
});