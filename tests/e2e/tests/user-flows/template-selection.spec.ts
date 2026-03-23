import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TemplatesPage } from '../../support/page-objects/ModalPages';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';
import { diagramTemplates } from '../../fixtures/basic-diagrams';

test.describe('Template Selection Flow', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should open templates modal', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);

    // Open templates modal
    await appLayout.openTemplates();

    // Verify modal is visible
    await expect(templatesPage.modal).toBeVisible();
  });

  test('should display template list', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);

    // Open templates modal
    await appLayout.openTemplates();

    // Verify templates are loaded
    const count = await templatesPage.getTemplateCount();
    expect(count).toBeGreaterThan(0);

    // Verify first template has expected content
    const firstTemplateName = await page.locator('[data-testid="template-name"]').first().textContent();
    expect(firstTemplateName).toBeDefined();
  });

  test('should select and load template', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);
    const editor = appLayout.workspace.editor;

    // Open templates modal
    await appLayout.openTemplates();

    // Select flowchart template
    await templatesPage.selectTemplate();

    // Verify modal is closed
    await expect(templatesPage.modal).not.toBeVisible();

    // Verify template content is loaded
    const code = await editor.getCode();
    expect(code).toContain('graph TD');
    expect(code).toContain('Start');
  });

  test('should preview template before selection', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);
    const preview = appLayout.workspace.preview;

    // Open templates modal
    await appLayout.openTemplates();

    // Hover over template to preview
    await page.locator('[data-testid="template-item"]').first().hover();

    // Wait for preview to update
    await TestUtils.waitForDiagramRender(page);

    // Verify preview shows template
    await expect(preview.preview).toBeVisible();
  });

  test('should search and filter templates', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);

    // Open templates modal
    await appLayout.openTemplates();

    // Search for sequence
    await page.locator('[data-testid="search-input"]').fill('sequence');
    await page.waitForTimeout(Timeouts.short);

    // Verify filtered results
    const items = await page.locator('[data-testid="template-item"]').count();
    expect(items).toBeGreaterThan(0);

    // Verify sequence template is visible
    await expect(page.locator('text=sequence').first()).toBeVisible();
  });

  test('should close template modal without selection', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);
    const editor = appLayout.workspace.editor;

    // Write some content first
    await editor.setCode('original content');

    // Open templates modal
    await appLayout.openTemplates();

    // Close modal without selection
    await templatesPage.close();

    // Verify content remains unchanged
    const code = await editor.getCode();
    expect(code).toBe('original content');
  });

  test('should handle template selection with keyboard', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);

    // Open templates modal
    await appLayout.openTemplates();

    // Use keyboard to navigate
    await page.locator('[data-testid="template-item"]').first().focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Verify template was selected
    const count = await templatesPage.getTemplateCount();
    await expect(templatesPage.modal).not.toBeVisible();
  });
});