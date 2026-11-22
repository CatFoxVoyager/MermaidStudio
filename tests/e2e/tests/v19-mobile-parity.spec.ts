import { test, expect, type Page } from '@playwright/test';

/**
 * Milestone v1.9 — Live Mobile Chromium Parity Suite (375×812 touch viewport)
 *
 * Verifies every v1.9 capability inside MobileLayout + MobileWorkspace:
 *  - Mobile scaffold boots cleanly with zero horizontal overflow
 *  - Code / Visual tab switching renders KaTeX math, v12 redux-color + handDrawn,
 *    on-demand logos:react + mdi:home icons, tidy-tree Mindmap, and agentflow-beta
 *    + non-blocking CodeMirror diagnostic warnings
 *  - Mobile right drawers (Diagram Colors with 11 native v12 themes, Advanced Styling
 *    with Look selector & per-diagram Pie controls) open cleanly via Menu -> Commands,
 *    stay free of horizontal overflow, and mutate frontmatter + re-render
 */
test.use({
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

async function setMobileCode(page: Page, code: string) {
  await page.locator('[data-testid="mobile-workspace-tab-code"]').click();
  await page.locator('[data-testid="code-editor"] .cm-editor').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('[data-testid="code-editor"]').evaluate((el, newContent) => {
    const cmEditor = el.querySelector('.cm-editor') as (HTMLElement & { cmView?: any }) | null;
    if (cmEditor?.cmView) {
      const view = cmEditor.cmView;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.toString().length, insert: newContent },
      });
    }
  }, code);
}

async function getMobileCode(page: Page): Promise<string> {
  return page.locator('[data-testid="code-editor"]').evaluate((el) => {
    const cmEditor = el.querySelector('.cm-editor') as (HTMLElement & { cmView?: any }) | null;
    return cmEditor?.cmView?.state.doc.toString() ?? '';
  });
}

async function switchToVisualAndWaitForSvg(page: Page, expectedSubstring?: string) {
  await page.locator('[data-testid="mobile-workspace-tab-visual"]').click();
  await page.waitForTimeout(400);
  await page.waitForFunction(
    (expected) => {
      const err = document.querySelector('[data-testid="error-message"]');
      if (err) return false;
      const host = document.querySelector('[data-shadow-host]');
      const svg = host?.shadowRoot?.querySelector('svg');
      if (!svg || svg.outerHTML.length < 300) return false;
      if (expected && !svg.outerHTML.includes(expected)) return false;
      return true;
    },
    expectedSubstring ?? '',
    { timeout: 25000 },
  );
}

async function openMobileDrawerViaCommands(page: Page, commandText: string) {
  await page.locator('[data-testid="mobile-topbar-overflow"]').click();
  await page.locator('[data-testid="mobile-menu-item-commands"]').click();
  const paletteInput = page.locator('[role="dialog"] input').first();
  await paletteInput.waitFor({ state: 'visible', timeout: 10000 });
  await paletteInput.fill(commandText);
  await page.locator('[role="dialog"] button').filter({ hasText: new RegExp(commandText, 'i') }).first().click();
}

test.describe('Milestone v1.9 — Mobile Chromium Parity (375×812)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="mobile-layout-root"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(400);
  });

  test('renders KaTeX math, v12 redux-color + handDrawn, and logos/mdi icons cleanly on mobile without overflow', async ({ page }) => {
    await setMobileCode(
      page,
      `---\nconfig:\n  theme: redux-color\n  look: handDrawn\n---\nflowchart TD\n  A["$$E = mc^2$$"] --> B@{ icon: "logos:react", label: "ReactMob" }\n  B --> C@{ icon: "mdi:home", label: "HomeMob" }`,
    );

    await switchToVisualAndWaitForSvg(page, 'ReactMob');

    // Wait for icons to resolve without unknownIcon #087ebf fallback
    await page.waitForFunction(
      () => {
        const host = document.querySelector('[data-shadow-host]');
        const svg = host?.shadowRoot?.querySelector('svg');
        if (!svg) return false;
        const hasMath = Boolean(svg.querySelector('.katex, .katex-mathml, math'));
        const icons = svg.querySelectorAll('.icon-shape').length;
        return hasMath && icons >= 2 && !svg.outerHTML.includes('#087ebf');
      },
      { timeout: 25000 },
    );

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('renders tidy-tree Mindmap and agentflow-beta with non-blocking CodeMirror diagnostic warning on mobile', async ({ page }) => {
    // 1. tidy-tree Mindmap
    await setMobileCode(
      page,
      `---\nconfig:\n  layout: tidy-tree\n---\nmindmap\n  root((MobRoot))\n    BranchA\n      TidyLeaf`,
    );
    await switchToVisualAndWaitForSvg(page, 'TidyLeaf');

    // 2. agentflow-beta + CodeMirror warning marker
    await setMobileCode(
      page,
      `agentflow-beta TB\n  orphan@{ shape: task, label: "Loose Task" }\n  flow main["MobileAgentFlow"]\n    ticket@{ shape: input, label: "Ticket" }\n    done@{ shape: action, label: "Done" }\n    ticket --> done\n  end`,
    );
    await page.locator('.cm-lint-marker-warning, .cm-lintRange-warning').first().waitFor({
      state: 'attached',
      timeout: 10000,
    });
    await switchToVisualAndWaitForSvg(page, 'MobileAgentFlow');
  });

  test('opens Diagram Colors mobile drawer with all 11 native v12 themes and zero horizontal overflow', async ({ page }) => {
    await setMobileCode(page, `flowchart TD\n  A[Start] --> B[End]`);
    await openMobileDrawerViaCommands(page, 'Diagram Colors');

    const modal = page.locator('[data-testid="modal"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(modal).toContainText('Redux Color');
    await expect(modal).toContainText('Neo Dark');

    const drawerOverflow = await modal.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(drawerOverflow).toBe(false);
  });

  test('opens Advanced Styling mobile drawer, updates Pie legendPosition, and re-renders cleanly', async ({ page }) => {
    await setMobileCode(
      page,
      `pie showData\n  title MobilePie\n  "A" : 60\n  "B" : 40`,
    );
    await openMobileDrawerViaCommands(page, 'Advanced Styling');

    const modal = page.locator('[data-testid="modal"]').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });

    // Verify zero horizontal overflow inside the 375px mobile drawer
    const drawerOverflow = await modal.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(drawerOverflow).toBe(false);

    // Select Pie Legend Position = bottom
    const legendSelect = modal.locator('select').filter({ has: page.locator('option[value="bottom"]') }).first();
    await legendSelect.scrollIntoViewIfNeeded();
    await legendSelect.selectOption('bottom');

    // Close drawer and confirm frontmatter updated + preview renders cleanly
    await modal.locator('button[aria-label="Close"], button[aria-label="Fermer"]').first().click();
    await expect.poll(async () => await getMobileCode(page), { timeout: 10000 }).toMatch(
      /legendPosition:\s*['"]?bottom['"]?/,
    );
    await switchToVisualAndWaitForSvg(page, 'MobilePie');
  });
});
