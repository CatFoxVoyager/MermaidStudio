import { test, expect } from '@playwright/test';
import { AppLayoutPage } from '../../support/page-objects/AppLayoutPage';
import { TestUtils, Timeouts } from '../../support/utils/test-utils';

test.describe('Diagram Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    await page.goto('/');
    await TestUtils.waitForDiagramRender(page);
  });

  test('should handle large diagram with good performance', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Generate a large diagram (100 nodes)
    let largeDiagram = 'graph TD\n';
    for (let i = 0; i < 100; i++) {
      largeDiagram += `  A${i}[Node ${i}] --> `;
      if (i < 99) {
        largeDiagram += `A${i + 1}\n`;
      }
    }

    // Write large diagram
    await editor.setCode(largeDiagram);

    // Measure render time
    const startTime = Date.now();
    await TestUtils.waitForDiagramRender(page);
    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Performance assertions
    expect(renderTime).toBeLessThan(5000); // Should render in less than 5 seconds
    expect(await TestUtils.countRenderedNodes(page)).toBe(100);
  });

  test('should render complex sequence diagram efficiently', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Complex sequence diagram with multiple participants
    const sequenceDiagram = `sequenceDiagram
    participant Client as C
    participant AuthSystem as A
    participant Database as D
    participant Cache as CC

    C->>A: Login Request
    A->>A: Validate Input
    A->>D: Check Credentials
    D-->>A: User Data
    A->>CC: Store Session
    CC-->>A: Session Created
    A-->>C: Success Response

    C->>A: API Request
    A->>CC: Validate Session
    CC-->>A: Session Valid
    A->>D: Fetch Data
    D-->>A: Data Response
    A-->>C: API Response`;

    await editor.setCode(sequenceDiagram);

    // Measure performance
    const startTime = Date.now();
    await TestUtils.waitForDiagramRender(page);
    const endTime = Date.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(3000);
    expect(appLayout.workspace.preview.preview).toBeVisible();
  });

  test('should handle multiple diagrams efficiently', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;
    const tabBar = appLayout.tabBar;

    // Create multiple diagrams
    const diagrams = [
      'graph TD\n  A --> B --> C',
      'sequenceDiagram\n  A->>B: Hello\n  B-->>A: Hi',
      'classDiagram\n  class A\n  class B\n  A --|> B'
    ];

    for (let i = 0; i < diagrams.length; i++) {
      // Switch to or create new tab
      if (i === 0) {
        await tabBar.switchTab(0);
      } else {
        await appLayout.newDiagram();
      }

      // Write diagram
      await editor.setCode(diagrams[i]);
      await TestUtils.waitForDiagramRender(page);

      // Verify it renders quickly
      const renderTime = await page.locator('[data-testid="render-time"]').textContent();
      expect(renderTime).toBeDefined();
    }
  });

  test('should render incrementally added elements efficiently', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Start with empty diagram
    await editor.setCode('');

    // Add nodes incrementally
    for (let i = 0; i < 20; i++) {
      await editor.insertText(`node${i}[Node ${i}]`);
      await TestUtils.waitForDiagramRender(page, 1000);

      const nodeCount = await TestUtils.countRenderedNodes(page);
      expect(nodeCount).toBe(i + 1);
    }
  });

  test('should handle theme switching performance', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const topBar = appLayout.topBar;

    // Write a diagram to work with
    await appLayout.workspace.editor.setCode('graph TD\n  A --> B --> C');
    await TestUtils.waitForDiagramRender(page);

    // Measure theme toggle performance
    const startTime = Date.now();
    await topBar.toggleTheme();
    await TestUtils.waitForDiagramRender(page);
    const endTime = Date.now();
    const toggleTime = endTime - startTime;

    expect(toggleTime).toBeLessThan(2000); // Should be fast

    // Toggle back
    await topBar.toggleTheme();
    await TestUtils.waitForDiagramRender(page);
  });

  test('should optimize rendering for repeated changes', async ({ page }) => {
    const appLayout = new AppLayoutPage(page);
    const editor = appLayout.workspace.editor;

    // Base diagram
    let diagram = 'graph TD\n  A --> B';

    // Make multiple rapid changes
    for (let i = 0; i < 10; i++) {
      diagram += `\n  B --> C${i}[Node ${i}]`;
      await editor.setCode(diagram);

      // Quick validation
      await TestUtils.waitForDiagramRender(page, 2000);

      const nodeCount = await TestUtils.countRenderedNodes(page);
      expect(nodeCount).toBe(2 + i); // A + B + i nodes
    }
  });
});