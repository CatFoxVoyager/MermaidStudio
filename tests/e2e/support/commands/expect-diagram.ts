import { expect, Page } from '@playwright/test';
import { TestUtils, Selectors } from '../utils/test-utils';

export const expectDiagram = {
  toRender: async (page: Page, expectedType?: string) => {
    await TestUtils.waitForDiagramRender(page);
    const preview = page.locator(Selectors.previewPanel);
    await expect(preview).toBeVisible();
  },

  toHaveNodes: async (page: Page, count: number) => {
    const nodeCount = await TestUtils.countRenderedNodes(page);
    expect(nodeCount).toBe(count);
  },

  toHaveEdges: async (page: Page, count: number) => {
    const edgeCount = await TestUtils.countRenderedEdges(page);
    expect(edgeCount).toBe(count);
  },

  toBeRendered: async (page: Page) => {
    const preview = page.locator(Selectors.previewPanel);
    await expect(preview).toBeVisible();

    // Check for SVG
    const svg = preview.locator('svg');
    await expect(svg).toBeVisible();
  },

  toContainText: async (page: Page, text: string) => {
    const preview = page.locator(Selectors.previewPanel);
    const content = await TestUtils.getPreviewContent(page);
    expect(content).toContain(text);
  },

  toRenderWithoutErrors: async (page: Page) => {
    const errors = await TestUtils.getDiagramErrors(page);
    expect(errors).toHaveLength(0);
  },

  toHaveRenderTime: async (page: Page, maxTime: number = 5000) => {
    const renderTime = await page.locator(Selectors.renderTime).textContent();
    expect(renderTime).toBeDefined();
    const time = parseInt(renderTime || '0');
    expect(time).toBeLessThan(maxTime);
  }
};