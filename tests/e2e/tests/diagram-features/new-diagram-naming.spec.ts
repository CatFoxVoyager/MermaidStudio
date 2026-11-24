import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TemplatesPage } from '../../support/page-objects/ModalPages';

test.describe('New diagram naming dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('opens with an empty name, Create disabled, and Escape creates nothing', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const before = await appLayout.tabBar.tabs.count();
    await page.getByTestId('new-diagram-button').click();
    await expect(page.getByTestId('new-diagram-name')).toHaveValue('');
    await expect(page.getByTestId('new-diagram-create')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('new-diagram-name')).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(await appLayout.tabBar.tabs.count()).toBe(before);
  });

  test('creates a diagram named from the field when Enter is pressed', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const before = await appLayout.tabBar.tabs.count();
    await page.getByTestId('new-diagram-button').click();
    await page.getByTestId('new-diagram-name').fill('Network map');
    await page.getByTestId('new-diagram-name').press('Enter');
    await expect(appLayout.tabBar.tabs).toHaveCount(before + 1);
    await expect(appLayout.tabBar.tabs.last()).toContainText('Network map');
  });

  test('the default-name button creates an untitled diagram', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const before = await appLayout.tabBar.tabs.count();
    await appLayout.newDiagram();
    await expect(appLayout.tabBar.tabs).toHaveCount(before + 1);
  });

  test('proposes the template title when a template is picked', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const templatesPage = new TemplatesPage(page);
    await appLayout.openTemplates();
    await templatesPage.waitForVisible();
    const title = (await page.locator('[data-testid="template-name"]').first().textContent())?.trim();
    await page.locator('[data-testid="template-name"]').first().click();
    await expect(page.getByTestId('new-diagram-default-name')).toHaveText(title!);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('new-diagram-name')).toHaveCount(0);
  });
});
