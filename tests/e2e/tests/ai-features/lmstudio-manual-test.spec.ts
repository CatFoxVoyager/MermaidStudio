import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

/**
 * Manual test for LM Studio with thinking pattern filtering
 *
 * This test requires MANUAL configuration of LM Studio before running:
 * 1. Open http://localhost:5176
 * 2. Click Settings → AI Provider
 * 3. Configure: LM Studio, http://localhost:1234, qwen3.5-4b
 * 4. Click "Save Settings"
 * 5. Then run this test
 */

test.describe('LM Studio - Manual Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const appLayout = new AppLayoutPage(page);
    await appLayout.newDiagram();
    await page.waitForTimeout(500);

    await appLayout.workspace.editor.setCode('graph TD\n  A --> B');
    await page.waitForTimeout(2000);
    await TestUtils.waitForDiagramRender(page);
  });

  test('should filter thinking patterns from Create Diagram', async ({ page }) => {
    test.setTimeout(120000);
    const appLayout = new AppLayoutPage(page);

    // Open AI panel
    await page.locator('[data-testid="ai-button"]').click();
    await page.waitForTimeout(500);

    // Type a simple create request
    const aiInput = page.locator('[data-testid="ai-input"]');
    await aiInput.fill('Create a flowchart with 3 steps: Start, Process, End');
    await page.waitForTimeout(500);

    // Send the message
    await page.keyboard.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(Timeouts.veryLong);

    // Check for response
    const aiResponse = page.locator('[data-testid="ai-response"]');
    const responseCount = await aiResponse.count();

    if (responseCount > 0) {
      const responseText = await aiResponse.first().textContent();
      console.log('AI Response:', responseText);

      // Verify response exists
      expect(responseText).toBeDefined();
      expect(responseText).not.toBe('');

      // CRITICAL: Check that thinking patterns are filtered out
      expect(responseText?.toLowerCase()).not.toContain('<thinking>');
      expect(responseText?.toLowerCase()).not.toContain('```thinking');
      expect(responseText?.toLowerCase()).not.toContain('let me think');
      expect(responseText?.toLowerCase()).not.toContain('step 1:');

      console.log('✓ No thinking patterns found in response');

      // Look for Apply button
      const applyButton = page.locator('[data-testid="apply-ai"]');
      const applyCount = await applyButton.count();

      if (applyCount > 0) {
        console.log('✓ Apply button found - code was generated');
        await expect(applyButton.first()).toBeVisible();
      }
    } else {
      test.skip(true, 'No AI response received - check LM Studio is configured');
    }
  });

  test('should filter thinking patterns from Fix Diagram', async ({ page }) => {
    test.setTimeout(120000);
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Write a broken diagram
    await editor.setCode('graph TD\n  A[Start --> B[Process');
    await page.waitForTimeout(1000);

    // Click Fix Diagram button
    await page.locator('[data-testid="fix-diagram-button"]').click();

    // Wait for AI response
    await page.waitForTimeout(Timeouts.veryLong);

    // Check for response
    const aiResponse = page.locator('[data-testid="ai-response"]');
    const responseCount = await aiResponse.count();

    if (responseCount > 0) {
      const responseText = await aiResponse.first().textContent();
      console.log('Fix Response:', responseText);

      // Verify response exists
      expect(responseText).toBeDefined();
      expect(responseText).not.toBe('');

      // CRITICAL: Check that thinking patterns are filtered out
      expect(responseText?.toLowerCase()).not.toContain('<thinking>');
      expect(responseText?.toLowerCase()).not.toContain('```thinking');
      expect(responseText?.toLowerCase()).not.toContain('let me think');
      expect(responseText?.toLowerCase()).not.toContain('reasoning:');

      console.log('✓ No thinking patterns found in fix response');

      // Look for Apply button
      const applyButton = page.locator('[data-testid="apply-ai"]');
      const applyCount = await applyButton.count();

      if (applyCount > 0) {
        console.log('✓ Apply button found - fix code was generated');
        await expect(applyButton.first()).toBeVisible();
      }
    } else {
      test.skip(true, 'No AI response received - check LM Studio is configured');
    }
  });
});
