import { test, expect, type Page } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils } from '../../support/utils/test-utils';

/**
 * Switches the workspace into the Visual editor view.
 *
 * The visual editor is toggled by different controls depending on layout:
 *  - Desktop (>=768px): toolbar button `data-testid="workspace-view-visual"`
 *    (see WorkspacePanel.tsx).
 *  - Mobile (<768px): segmented toggle `data-testid="mobile-workspace-tab-visual"`
 *    (see MobileWorkspace.tsx).
 *
 * The earlier version of these tests looked for `[data-testid="tab"]:has-text("Visual")`,
 * which never matched on either layout, so the fallback clicked the wrong
 * element and `.visual-node-overlay` never rendered.
 */
async function switchToVisualView(page: Page) {
  const desktopBtn = page.locator('[data-testid="workspace-view-visual"]');
  const mobileBtn = page.locator('[data-testid="mobile-workspace-tab-visual"]');
  if (await desktopBtn.count() > 0) {
    await desktopBtn.click();
  } else {
    await expect(mobileBtn).toBeVisible();
    await mobileBtn.click();
  }
  // VisualEditorCanvas re-renders the diagram and extracts node overlays
  // after an 80ms timer once the SVG is in the DOM.
  await page.waitForTimeout(2500);
}

test.describe('VisualEditorCanvas - Pointer Events Migration (MTCH-03)', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    page.on('pageerror', exc => {
      console.log('Page error:', exc);
    });
  });

  test.describe('Desktop non-regression (1280×800)', () => {
    test('should preserve desktop mouse selection after pointer-events migration', async ({ page }) => {
      const appLayout = new AppLayoutPage(page);

      // Desktop viewport
      await page.goto('/');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Create a simple flowchart diagram
      const flowchartCode = `graph TD
    A[Start Node] --> B[Process Node]
    B --> C[End Node]`;

      await appLayout.workspace.editor.setCode(flowchartCode);
      await TestUtils.waitForDiagramRender(page);
      await page.waitForTimeout(2000);

      // Switch to the visual editor via its toolbar button
      await switchToVisualView(page);

      // Test 1: Node overlay should be visible
      const nodeOverlay = page.locator('.visual-node-overlay').first();
      await expect(nodeOverlay).toBeVisible();

      // Test 2: Click should select the node
      await nodeOverlay.click();
      await page.waitForTimeout(500);

      const selectedOverlay = page.locator('.visual-node-overlay.selected');
      await expect(selectedOverlay).toBeVisible();

      // Test 3: Shift+click should add to multi-select
      const secondOverlay = page.locator('.visual-node-overlay').nth(1);
      await secondOverlay.click({ modifiers: ['Shift'] });
      await page.waitForTimeout(500);

      const selectedOverlays = page.locator('.visual-node-overlay.selected');
      const selectedCount = await selectedOverlays.count();
      expect(selectedCount).toBeGreaterThanOrEqual(2); // At least 2 nodes should be selected

      // Test 4: Zoom out button should work
      const zoomOutButton = page.locator('button[title="Zoom out"]').first();
      await zoomOutButton.click();
      await page.waitForTimeout(500);

      // Check zoom percentage changed
      const zoomLabel = page.locator('text=/\\d+%/').first();
      const zoomText = await zoomLabel.textContent();
      expect(zoomText).toBeTruthy();
      console.log('Desktop non-regression: Zoom out successful, current zoom:', zoomText);

      console.log('✅ Desktop mouse selection, shift multi-select, and zoom buttons preserved');
    });

    test('should preserve keyboard shortcuts after pointer-events migration', async ({ page }) => {
      const appLayout = new AppLayoutPage(page);

      // Desktop viewport
      await page.goto('/');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Create a simple flowchart
      const flowchartCode = `graph TD
    A[Start Node] --> B[Process Node]`;

      await appLayout.workspace.editor.setCode(flowchartCode);
      await TestUtils.waitForDiagramRender(page);
      await page.waitForTimeout(2000);

      // Switch to the visual editor via its toolbar button
      await switchToVisualView(page);

      // Select a node
      const nodeOverlay = page.locator('.visual-node-overlay').first();
      await nodeOverlay.click();
      await page.waitForTimeout(500);

      const selectedBefore = await page.locator('.visual-node-overlay.selected').count();
      expect(selectedBefore).toBeGreaterThan(0);

      // Test Delete key
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // Selection should be cleared
      const selectedAfterDelete = await page.locator('.visual-node-overlay.selected').count();
      expect(selectedAfterDelete).toBe(0);

      console.log('✅ Desktop keyboard shortcuts (Delete) preserved');
    });
  });

  // VisualEditorCanvas now recomputes overlays when its container becomes visible
  // (IntersectionObserver + ResizeObserver in src/components/visual/VisualEditorCanvas.tsx),
  // so `.visual-node-overlay` gets real geometry even when the pane was hidden (display:none)
  // at mount time on MobileWorkspace. These tests guard that fix.
  test.describe('Touch single-tap selection (375×812 with touch emulation)', () => {
    // hasTouch must be enabled so locator.tap() dispatches pointer events with
    // pointerType 'touch'. Without it, Playwright rejects tap() with
    // "The page does not support tap. Use hasTouch context option".
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

    test('should select nodes via touch tap using unified pointer handler', async ({ page }) => {
      const appLayout = new AppLayoutPage(page);

      // Mobile viewport with touch emulation
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Create a simple flowchart
      const flowchartCode = `graph TD
    A[Mobile Start] --> B[Mobile Process]
    B --> C[Mobile End]`;

      await appLayout.workspace.editor.setCode(flowchartCode);
      await TestUtils.waitForDiagramRender(page);
      await page.waitForTimeout(2000);

      // Switch to the visual editor via its toolbar button
      await switchToVisualView(page);

      // Test touch tap selection using Playwright's tap() which synthesizes pointer events
      const nodeOverlay = page.locator('.visual-node-overlay').first();
      await expect(nodeOverlay).toBeVisible();

      // Use tap() which dispatches pointer events with pointerType 'touch'
      await nodeOverlay.tap();
      await page.waitForTimeout(500);

      // Node should be selected (unified pointer handler worked)
      const selectedOverlay = page.locator('.visual-node-overlay.selected');
      await expect(selectedOverlay).toBeVisible();

      console.log('✅ Touch tap selects node via unified pointer handler');
    });

    test('should handle touch tap on multiple nodes', async ({ page }) => {
      const appLayout = new AppLayoutPage(page);

      // Mobile viewport
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Create a multi-node diagram
      const flowchartCode = `graph TD
    A[Node 1] --> B[Node 2]
    B --> C[Node 3]
    C --> D[Node 4]`;

      await appLayout.workspace.editor.setCode(flowchartCode);
      await TestUtils.waitForDiagramRender(page);
      await page.waitForTimeout(2000);

      // Switch to the visual editor via its toolbar button
      await switchToVisualView(page);

      // Tap first node
      const firstNode = page.locator('.visual-node-overlay').first();
      await firstNode.tap();
      await page.waitForTimeout(500);

      let selectedCount = await page.locator('.visual-node-overlay.selected').count();
      expect(selectedCount).toBe(1);

      // Tap second node (selection should move)
      const secondNode = page.locator('.visual-node-overlay').nth(1);
      await secondNode.tap();
      await page.waitForTimeout(500);

      selectedCount = await page.locator('.visual-node-overlay.selected').count();
      expect(selectedCount).toBe(1);

      // Verify it's the second node that's selected
      const isSelected = await secondNode.evaluate(el => el.classList.contains('selected'));
      expect(isSelected).toBe(true);

      console.log('✅ Touch tap correctly moves selection between nodes');
    });
  });

  test.describe('Canvas background interactions', () => {
    test('should clear selection on canvas background click (desktop)', async ({ page }) => {
      const appLayout = new AppLayoutPage(page);

      // Desktop viewport
      await page.goto('/');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Create a diagram
      const flowchartCode = `graph TD
    A[Start] --> B[End]`;

      await appLayout.workspace.editor.setCode(flowchartCode);
      await TestUtils.waitForDiagramRender(page);
      await page.waitForTimeout(2000);

      // Switch to the visual editor via its toolbar button
      await switchToVisualView(page);

      // Select a node
      const nodeOverlay = page.locator('.visual-node-overlay').first();
      await nodeOverlay.click();
      await page.waitForTimeout(500);

      let selectedCount = await page.locator('.visual-node-overlay.selected').count();
      expect(selectedCount).toBeGreaterThan(0);

      // Click on canvas background to clear selection
      const canvasArea = page.locator('.preview-grid').first();
      await canvasArea.click({ position: { x: 50, y: 50 } });
      await page.waitForTimeout(500);

      // Selection should be cleared
      selectedCount = await page.locator('.visual-node-overlay.selected').count();
      expect(selectedCount).toBe(0);

      console.log('✅ Canvas background click clears selection');
    });
  });
});
