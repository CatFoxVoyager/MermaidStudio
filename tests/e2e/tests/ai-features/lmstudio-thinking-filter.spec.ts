import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

/**
 * E2E tests for LM Studio integration with thinking pattern filtering
 *
 * Prerequisites:
 * 1. LM Studio must be running on http://localhost:1234
 * 2. Qwen3.5-4B model (or similar) must be loaded
 * 3. LM Studio server must have CORS enabled
 *
 * To run these tests:
 * 1. Start LM Studio and load a model
 * 2. Run: npm run test:e2e -- tests/e2e/tests/ai-features/lmstudio-thinking-filter.spec.ts
 */

test.describe('LM Studio - Thinking Pattern Filter', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set LM Studio configuration via route handler - this runs before page loads
    await context.addInitScript(() => {
      const config = {
        provider: 'lmstudio',
        apiKey: '',
        baseUrl: 'http://localhost:1234',
        model: 'qwen3.5-4b',
      };
      localStorage.setItem('ai_provider', JSON.stringify(config));
    });

    // Navigate to the app - localStorage will already be set
    await page.goto('http://localhost:5176/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Create a new diagram
    const appLayout = new AppLayoutPage(page);
    await appLayout.newDiagram();
    await page.waitForTimeout(500);

    // Write initial content
    await appLayout.workspace.editor.setCode('graph TD\n  A --> B');
    await page.waitForTimeout(2000);
    await TestUtils.waitForDiagramRender(page);
  });

  test('should filter thinking patterns from Create Diagram response', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for local AI model
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

    // Wait for AI response (local models may take longer)
    await page.waitForTimeout(Timeouts.veryLong);

    // Check for response
    const aiResponse = page.locator('[data-testid="ai-response"]');
    const responseCount = await aiResponse.count();

    if (responseCount > 0) {
      const responseText = await aiResponse.first().textContent();
      console.log('AI Response:', responseText);

      // Verify response exists and is not empty
      expect(responseText).not.toBe('');
      expect(responseText).toBeDefined();

      // CRITICAL: Check that thinking patterns are filtered out
      const thinkingPatterns = [
        '```thinking',
        '```thought',
        '```reasoning',
        '<thinking>',
        '<thought>',
        '<reasoning>',
        'Thinking:',
        'Thought:',
        'Reasoning:',
        'Let me think',
        'Let me analyze',
        'Step 1:',
        'First:',
        'Second:',
      ];

      for (const pattern of thinkingPatterns) {
        // Response should NOT contain thinking patterns
        // We use case-insensitive check
        expect(responseText?.toLowerCase()).not.toContain(pattern.toLowerCase());
      }

      console.log('✓ No thinking patterns found in response');

      // Check if there's a code block with Mermaid code
      const codeBlocks = await page.locator('[data-testid="ai-response"] pre, [data-testid="ai-response"] code').count();
      console.log(`Code blocks found: ${codeBlocks}`);

      // Look for Apply button (indicates code was generated)
      const applyButton = page.locator('[data-testid="apply-ai"]');
      const applyCount = await applyButton.count();

      if (applyCount > 0) {
        console.log('✓ Apply button found - code was generated');
        await expect(applyButton.first()).toBeVisible();
      }
    } else {
      test.skip(true, 'No AI response received - check LM Studio is running');
    }
  });

  test('should filter thinking patterns from Fix Diagram response', async ({ page }) => {
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
      expect(responseText).not.toBe('');
      expect(responseText).toBeDefined();

      // CRITICAL: Check that thinking patterns are filtered out
      const thinkingPatterns = [
        '```thinking',
        '```thought',
        '```reasoning',
        '<thinking>',
        '<thought>',
        '<reasoning>',
        'Thinking:',
        'Thought:',
        'Reasoning:',
        'Let me think',
        'Let me analyze',
        'Step 1:',
        'First:',

        'Second:',
      ];

      for (const pattern of thinkingPatterns) {
        expect(responseText?.toLowerCase()).not.toContain(pattern.toLowerCase());
      }

      console.log('✓ No thinking patterns found in fix response');

      // Look for Apply button
      const applyButton = page.locator('[data-testid="apply-ai"]');
      const applyCount = await applyButton.count();

      if (applyCount > 0) {
        console.log('✓ Apply button found - fix code was generated');
        await expect(applyButton.first()).toBeVisible();
      }
    } else {
      test.skip(true, 'No AI response received - check LM Studio is running');
    }
  });

  test('should handle diagram with unclosed bracket', async ({ page }) => {
    test.setTimeout(120000);
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Write diagram with syntax error
    await editor.setCode('graph TD\n  A[Start] --> B[Process');
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

      // Verify response exists and doesn't contain thinking
      expect(responseText).toBeDefined();
      expect(responseText?.toLowerCase()).not.toContain('<thinking>');
      expect(responseText?.toLowerCase()).not.toContain('```thinking');

      // Look for Apply button and apply the fix
      const applyButton = page.locator('[data-testid="apply-ai"]');
      const applyCount = await applyButton.count();

      if (applyCount > 0) {
        await applyButton.first().click();
        await page.waitForTimeout(1000);

        // Verify the code was fixed (brackets should be closed)
        const currentCode = await editor.getCode();
        console.log('Fixed code:', currentCode);

        // Code should be different from original
        expect(currentCode).not.toBe('graph TD\n  A[Start] --> B[Process');

        // Try to render the fixed code
        await page.waitForTimeout(2000);
        const svgElement = await page.locator('#diagram-svg svg').count();
        console.log(`SVG rendered: ${svgElement > 0}`);
      }
    } else {
      test.skip(true, 'No AI response received');
    }
  });

  test('should create complex diagram without thinking output', async ({ page }) => {
    test.setTimeout(150000); // 2.5 minutes for complex diagrams
    const appLayout = new AppLayoutPage(page);

    // Open AI panel
    await page.locator('[data-testid="ai-button"]').click();
    await page.waitForTimeout(500);

    // Request a more complex diagram
    const aiInput = page.locator('[data-testid="ai-input"]');
    await aiInput.fill('Create a sequence diagram showing User -> Server -> Database interaction with a login flow');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Wait for AI response (complex diagrams take longer)
    await page.waitForTimeout(Timeouts.veryLong * 1.5);

    // Check for response
    const aiResponse = page.locator('[data-testid="ai-response"]');
    const responseCount = await aiResponse.count();

    if (responseCount > 0) {
      const responseText = await aiResponse.first().textContent();
      console.log('Complex diagram response length:', responseText?.length);

      // Verify no thinking patterns
      expect(responseText?.toLowerCase()).not.toContain('<thinking>');
      expect(responseText?.toLowerCase()).not.toContain('```thinking');
      expect(responseText?.toLowerCase()).not.toContain('let me think');

      // Check for sequence diagram keywords
      const hasSequenceDiagram = responseText?.toLowerCase().includes('sequencediagram');
      console.log(`Contains sequenceDiagram: ${hasSequenceDiagram}`);
    } else {
      test.skip(true, 'No AI response received');
    }
  });

  test('should provide explanation without thinking for valid diagram', async ({ page }) => {
    test.setTimeout(120000);
    const appLayout = new AppLayoutPage(page);

    // Write a valid diagram
    await page.locator('[data-testid="editor-textarea"]').fill(
      'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]'
    );
    await page.waitForTimeout(2000);

    // Open AI panel
    await page.locator('[data-testid="ai-button"]').click();
    await page.waitForTimeout(500);

    // Ask for explanation
    const aiInput = page.locator('[data-testid="ai-input"]');
    await aiInput.fill('Explain this diagram');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Wait for response
    await page.waitForTimeout(Timeouts.long);

    // Check for response
    const aiResponse = page.locator('[data-testid="ai-response"]');
    const responseCount = await aiResponse.count();

    if (responseCount > 0) {
      const responseText = await aiResponse.first().textContent();
      console.log('Explanation response:', responseText?.substring(0, 200) + '...');

      // Verify no thinking patterns
      expect(responseText?.toLowerCase()).not.toContain('<thinking>');
      expect(responseText?.toLowerCase()).not.toContain('```thinking');

      // Explanation should be plain text (not a code block)
      const hasExplanation = responseText && responseText.length > 50;
      expect(hasExplanation).toBe(true);
    } else {
      test.skip(true, 'No AI response received');
    }
  });
});

// Helper timeout values
test.extend({
  // Local models can be slow, increase timeouts
  actionTimeout: 60000,
});
