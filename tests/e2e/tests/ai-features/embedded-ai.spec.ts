import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';

test.describe('Embedded AI (CPU Only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should configure and test embedded AI provider', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    
    // 1. Open AI Panel
    await appLayout.openAI();
    await expect(page.locator('[data-testid="ai-panel"]')).toBeVisible();

    // 2. Open AI Settings
    await page.locator('[data-testid="ai-settings"]').click();
    await expect(page.locator('text=AI Provider Settings')).toBeVisible();

    // 3. Select "In-Browser (CPU Only)" provider
    // Using text since it's a descriptive label in the button
    await page.locator('button:has-text("In-Browser (CPU Only)")').click();

    // 4. Verify selection (background color or check icon)
    const embeddedButton = page.locator('button:has-text("In-Browser (CPU Only)")');
    await expect(embeddedButton.locator('svg.lucide-check')).toBeVisible();

    // 5. Test Connection
    await page.locator('button:has-text("Test Connection")').click();
    await expect(page.locator('text=Embedded AI is ready!')).toBeVisible();

    // 6. Save Settings
    await page.locator('button:has-text("Save Settings")').click();
    await expect(page.locator('text=AI Provider Settings')).not.toBeVisible();

    // 7. Verify provider badge in AI Panel
    const providerBadge = page.locator('[data-testid="ai-panel"] span').filter({ hasText: 'In-Browser (CPU Only)' });
    await expect(providerBadge).toBeVisible();
  });

  test('should show download progress when sending message with embedded AI', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    
    // Setup: Configure embedded AI first
    await appLayout.openAI();
    await page.locator('[data-testid="ai-settings"]').click();
    await page.locator('button:has-text("In-Browser (CPU Only)")').click();
    await page.locator('button:has-text("Save Settings")').click();

    // Send a message
    const aiInput = page.locator('[data-testid="ai-input"]');
    await aiInput.fill('Create a flowchart');
    await page.locator('[data-testid="ai-send"]').click();

    // Since we are in a test environment, the actual download might be fast or mocked,
    // but the "Downloading Model" text should appear.
    // We use a regex to catch any percentage.
    const progressText = page.locator('text=/Downloading Model/i');
    
    // Note: In a real e2e test, the actual Wllama might fail to load if networking is restricted,
    // but we want to see the UI transition to the loading/downloading state.
    await expect(progressText).toBeVisible({ timeout: 5000 });
  });
});
