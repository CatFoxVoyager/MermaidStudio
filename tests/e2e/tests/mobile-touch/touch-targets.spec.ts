import { test, expect } from '@playwright/test';

test.describe('Mobile touch targets — ≥44px tap size audit (MTCH-01)', () => {
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

  test('should have ≥44×44px tap targets on all mobile shell controls at 375px', async ({ page }) => {
    // Mobile viewport: iPhone-class mobile (375×812)
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout is present
    const mobileRoot = page.getByTestId('mobile-layout-root');
    await expect(mobileRoot).toBeVisible();

    // Test MobileTopBar buttons (all 3 should be present)
    const topbarNew = page.getByTestId('mobile-topbar-new');
    const topbarSave = page.getByTestId('mobile-topbar-save');
    const topbarOverflow = page.getByTestId('mobile-topbar-overflow');

    // New button only renders if onNewDiagram is provided (optional prop)
    const newButtonCount = await topbarNew.count();
    if (newButtonCount > 0) {
      const newBox = await topbarNew.boundingBox();
      expect(newBox).toBeTruthy();
      expect(newBox!.width).toBeGreaterThanOrEqual(44);
      expect(newBox!.height).toBeGreaterThanOrEqual(44);
    }

    // Save and overflow buttons always render
    const saveBox = await topbarSave.boundingBox();
    expect(saveBox).toBeTruthy();
    expect(saveBox!.width).toBeGreaterThanOrEqual(44);
    expect(saveBox!.height).toBeGreaterThanOrEqual(44);

    const overflowBox = await topbarOverflow.boundingBox();
    expect(overflowBox).toBeTruthy();
    expect(overflowBox!.width).toBeGreaterThanOrEqual(44);
    expect(overflowBox!.height).toBeGreaterThanOrEqual(44);

    // Test MobileBottomNav buttons (all 3 should be present)
    const tabFiles = page.getByTestId('mobile-workspace-tab-files');
    const tabCode = page.getByTestId('mobile-workspace-tab-code');
    const tabPreview = page.getByTestId('mobile-workspace-tab-preview');

    const filesBox = await tabFiles.boundingBox();
    expect(filesBox).toBeTruthy();
    expect(filesBox!.width).toBeGreaterThanOrEqual(44);
    expect(filesBox!.height).toBeGreaterThanOrEqual(44);

    const editBox = await tabCode.boundingBox();
    expect(editBox).toBeTruthy();
    expect(editBox!.width).toBeGreaterThanOrEqual(44);
    expect(editBox!.height).toBeGreaterThanOrEqual(44);

    const aiBox = await tabPreview.boundingBox();
    expect(aiBox).toBeTruthy();
    expect(aiBox!.width).toBeGreaterThanOrEqual(44);
    expect(aiBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('should render desktop controls unchanged at 1280×800 (non-regression)', async ({ page }) => {
    // Desktop viewport: standard desktop resolution
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 800 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout is absent
    const mobileRootCount = await page.locator('[data-testid="mobile-layout-root"]').count();
    expect(mobileRootCount).toBe(0);

    // Assert desktop shell is visible with known desktop controls
    const newDiagramButton = page.getByTestId('new-diagram-button');
    await expect(newDiagramButton).toBeVisible();
  });
});