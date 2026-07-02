import { test, expect } from '@playwright/test';

test.describe('Mobile touch interactions — native pan + active states (MTCH-02)', () => {
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

  test('should enable native touch pan in preview at 375px', async ({ page }) => {
    // Mobile viewport: iPhone-class mobile (375×812)
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout is present
    const mobileRoot = page.getByTestId('mobile-layout-root');
    await expect(mobileRoot).toBeVisible();

    // Switch to preview tab (mobile workspace tabs)
    const previewTab = page.getByTestId('mobile-workspace-tab-preview');
    await previewTab.click();
    await page.waitForTimeout(1000);

    // Assert preview panel is visible
    const previewPanel = page.getByTestId('preview-panel');
    await expect(previewPanel).toBeVisible();

    // Assert preview-grid has touch-action enabling native pan
    const previewGrid = page.locator('[data-testid="preview-panel"] .preview-grid');
    await expect(previewGrid).toBeVisible();

    // Check computed touch-action style contains pan-x and pan-y
    const touchAction = await previewGrid.evaluate(el => {
      return window.getComputedStyle(el).touchAction;
    });

    // touch-action should include both pan-x and pan-y for native touch scrolling
    expect(touchAction).toMatch(/pan-x/);
    expect(touchAction).toMatch(/pan-y/);
  });

  test('should have active: tap states on mobile top bar buttons at 375px', async ({ page }) => {
    // Mobile viewport: iPhone-class mobile (375×812)
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout is present
    const mobileRoot = page.getByTestId('mobile-layout-root');
    await expect(mobileRoot).toBeVisible();

    // Assert top bar buttons have active: tap-equivalent class
    const topbarSave = page.getByTestId('mobile-topbar-save');
    await expect(topbarSave).toBeVisible();
    await expect(topbarSave).toHaveClass(/active:bg-white\/15/);

    const topbarOverflow = page.getByTestId('mobile-topbar-overflow');
    await expect(topbarOverflow).toBeVisible();
    await expect(topbarOverflow).toHaveClass(/active:bg-white\/15/);

    // New button only renders if onNewDiagram is provided
    const topbarNew = page.getByTestId('mobile-topbar-new');
    const newButtonCount = await topbarNew.count();
    if (newButtonCount > 0) {
      await expect(topbarNew).toHaveClass(/active:bg-white\/15/);
    }
  });

  test('should render desktop preview unchanged at 1280×800 (non-regression)', async ({ page }) => {
    // Desktop viewport: standard desktop resolution
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 800 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout is absent
    const mobileRootCount = await page.locator('[data-testid="mobile-layout-root"]').count();
    expect(mobileRootCount).toBe(0);

    // Assert preview panel is visible on desktop (desktop non-regression)
    const previewPanel = page.getByTestId('preview-panel');
    await expect(previewPanel).toBeVisible();
  });
});