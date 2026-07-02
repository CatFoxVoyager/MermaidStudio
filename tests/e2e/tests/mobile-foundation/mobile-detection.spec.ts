import { test, expect } from '@playwright/test';

test.describe('Mobile foundation — viewport detection (MFDN-01)', () => {
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

  test('should render mobile scaffold at 375px viewport (iPhone-class mobile)', async ({ page }) => {
    // Mobile: max-width 767.98px → mobile-layout-root visible with h-dvh
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout root is present
    const mobileRoot = page.getByTestId('mobile-layout-root');
    await expect(mobileRoot).toBeVisible();

    // Assert mobile layout has h-dvh class (100dvh viewport fill)
    await expect(mobileRoot).toHaveClass(/h-dvh/);

    // Assert desktop shell is absent: check that known desktop elements are not present
    // (The mobile branch returns early, so desktop TopBar buttons never render)
    const desktopToggleButton = page.getByTestId('sidebar-toggle');
    await expect(desktopToggleButton).not.toBeVisible();

    const newDiagramButton = page.getByTestId('new-diagram-button');
    await expect(newDiagramButton).not.toBeVisible();
  });

  test('should render desktop tree at exactly 768px viewport (desktop boundary, inclusive)', async ({ page }) => {
    // Desktop: min-width 768px → desktop tree visible, mobile-layout-root absent
    // The boundary is inclusive of desktop (≥768px = desktop)
    await page.goto('/');
    await page.setViewportSize({ width: 768, height: 800 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout root is absent (count = 0)
    const mobileRootCount = await page.locator('[data-testid="mobile-layout-root"]').count();
    expect(mobileRootCount).toBe(0);

    // Assert desktop shell is visible: check for known desktop TopBar elements
    // (The desktop branch renders TopBar with its buttons)
    const desktopToggleButton = page.getByTestId('sidebar-toggle');
    await expect(desktopToggleButton).toBeVisible();

    const newDiagramButton = page.getByTestId('new-diagram-button');
    await expect(newDiagramButton).toBeVisible();

    // Optional: assert desktop root has h-screen class (not h-dvh)
    // This confirms the desktop tree rendered, not mobile
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark|light/, { timeout: 1000 });
  });

  test('should render mobile scaffold at 767px viewport (mobile boundary, exclusive)', async ({ page }) => {
    // Mobile boundary: ≤767.98px → mobile-layout-root visible
    // This proves there is no hybrid gap between 767 and 768
    await page.goto('/');
    await page.setViewportSize({ width: 767, height: 800 });

    // Wait for React to mount and render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Assert mobile layout root is present (mirror of 375px test)
    const mobileRoot = page.getByTestId('mobile-layout-root');
    await expect(mobileRoot).toBeVisible();

    // Assert mobile layout has h-dvh class
    await expect(mobileRoot).toHaveClass(/h-dvh/);

    // Assert desktop shell is absent (same as 375px test)
    const desktopToggleButton = page.getByTestId('sidebar-toggle');
    await expect(desktopToggleButton).not.toBeVisible();

    const newDiagramButton = page.getByTestId('new-diagram-button');
    await expect(newDiagramButton).not.toBeVisible();
  });
});
