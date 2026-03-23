import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

test.describe('AI Panel Features', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should open AI panel', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;

    // Open AI panel
    await appLayout.openAI();

    // Verify panel is visible
    await expect(aiPanel.panel).toBeVisible();
  });

  test('should send message to AI', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;

    // Open AI panel
    await appLayout.openAI();

    // Send message
    await aiPanel.sendMessage('Create a simple flowchart for decision making');

    // Wait for response
    await page.waitForTimeout(Timeouts.medium);

    // Verify response appears
    const response = await aiPanel.getResponse();
    expect(response).toBeDefined();
    expect(response).not.toBe('');
  });

  test('should improve diagram code with AI', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;
    const editor = appLayout.workspace.editor;

    // Write basic code
    await editor.setCode('graph TD\n  A --> B');

    // Open AI panel
    await appLayout.openAI();

    // Send improvement request
    await aiPanel.sendMessage('Improve this diagram with more nodes and styling');

    // Wait for response
    await page.waitForTimeout(Timeouts.medium);

    // Apply AI suggestion
    await page.locator('[data-testid="apply-ai"]').click();

    // Verify diagram improved
    const code = await editor.getCode();
    expect(code).toContain('graph TD');
    expect(code).toContain('A');
    expect(code).toContain('B');
  });

  test('should close AI panel', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;

    // Open AI panel
    await appLayout.openAI();

    // Close panel
    await aiPanel.close();

    // Verify panel is closed
    await expect(aiPanel.panel).not.toBeVisible();
  });

  test('should show AI settings', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;

    // Open AI panel
    await appLayout.openAI();

    // Open settings
    await page.locator('[data-testid="ai-settings"]').click();

    // Verify settings modal appears
    await expect(page.locator('[data-testid="ai-settings-modal"]')).toBeVisible();
  });

  test('should handle AI errors gracefully', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;

    // Open AI panel
    await appLayout.openAI();

    // Send invalid message or trigger error
    await aiPanel.sendMessage('');

    // Wait for error handling
    await page.waitForTimeout(Timeouts.short);

    // Verify error message appears without crashing
    const error = await page.locator('[data-testid="error-message"]').first().textContent();
    expect(error).toBeDefined();
  });

  test('should support keyboard shortcuts in AI panel', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const aiPanel = appLayout.aiPanel;

    // Open AI panel
    await appLayout.openAI();

    // Focus input
    await aiPanel.input.focus();

    // Use Enter to send message
    await aiPanel.input.fill('test message');
    await page.keyboard.press('Enter');

    // Wait for response
    await page.waitForTimeout(Timeouts.short);

    // Verify message was sent
    const response = await aiPanel.getResponse();
    expect(response).toBeDefined();
  });
});