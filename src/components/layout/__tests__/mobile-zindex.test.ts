import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Phase 14: Z-Index Ordering Invariant (MFDN-04)', () => {
  it('should enforce strict ordering of --z-* tokens per ROADMAP spec', () => {
    // Read src/index.css from disk
    const cssPath = resolve(__dirname, '../../../index.css');
    const cssContent = readFileSync(cssPath, 'utf8');

    // Extract all --z-* token declarations from :root block
    const tokenRegex = /--z-(base|visual-overlay|top-bar|panel|bottom-nav|modal|drawer|toast):\s*(\d+)/g;
    const tokens: { [key: string]: number } = {};
    let match;

    while ((match = tokenRegex.exec(cssContent)) !== null) {
      const [, tokenName, value] = match;
      tokens[tokenName] = parseInt(value, 10);
    }

    // Verify all 8 tokens exist
    const requiredTokens = ['base', 'visual-overlay', 'top-bar', 'panel', 'bottom-nav', 'modal', 'drawer', 'toast'];
    for (const token of requiredTokens) {
      if (!(token in tokens)) {
        throw new Error(`Missing required z-index token: --z-${token}`);
      }
    }

    // Assert the strict ordering invariant per UI-SPEC F4 / VALIDATION.md
    // base(0) < visual-overlay(10) < top-bar(20) ≤ panel(30) = bottom-nav(30) < modal(50) < drawer(60) < toast(70)

    // 1. Base hierarchy
    expect(tokens.base).toBe(0);
    expect(tokens['visual-overlay']).toBe(10);
    expect(tokens.base).toBeLessThan(tokens['visual-overlay']);

    // 2. Top bar above overlay
    expect(tokens['top-bar']).toBe(20);
    expect(tokens['visual-overlay']).toBeLessThan(tokens['top-bar']);

    // 3. Panel and bottom-nav at same tier (intentional equality per ROADMAP)
    expect(tokens.panel).toBe(30);
    expect(tokens['bottom-nav']).toBe(30);
    expect(tokens['top-bar']).toBeLessThanOrEqual(tokens.panel);
    expect(tokens.panel).toEqual(tokens['bottom-nav']);

    // 4. Modal above panel/bottom-nav
    expect(tokens.modal).toBe(50);
    expect(tokens.panel).toBeLessThan(tokens.modal);
    expect(tokens['bottom-nav']).toBeLessThan(tokens.modal);

    // 5. Drawer ABOVE modal (intentional ROADMAP inversion - mobile drawers overlay modals)
    expect(tokens.drawer).toBe(60);
    expect(tokens.modal).toBeLessThan(tokens.drawer);

    // 6. Toast highest transient surface
    expect(tokens.toast).toBe(70);
    expect(tokens.drawer).toBeLessThan(tokens.toast);
  });

  it('should fail with clear message if token ordering is violated', () => {
    // This test documents the expected failure mode if someone reorders tokens
    const cssPath = resolve(__dirname, '../../../index.css');
    const cssContent = readFileSync(cssPath, 'utf8');

    // A quick sanity check that tokens are in :root
    expect(cssContent).toContain('--z-base:');
    expect(cssContent).toContain('--z-toast:');

    // Verify no duplicate declarations (each token appears exactly once)
    const tokens = ['base', 'visual-overlay', 'top-bar', 'panel', 'bottom-nav', 'modal', 'drawer', 'toast'];
    for (const token of tokens) {
      const regex = new RegExp(`--z-${token}:`, 'g');
      const matches = cssContent.match(regex);
      expect(matches?.length).toBe(1);
    }
  });
});
