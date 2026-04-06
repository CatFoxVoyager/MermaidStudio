import { Page, Locator } from '@playwright/test';

export class AppLayoutPage {
  readonly page: Page;
  readonly topBar: TopBar;
  readonly sidebar: Sidebar;
  readonly workspace: WorkspacePanel;
  readonly aiPanel: AIPanel;
  readonly tabBar: TabBar;

  constructor(page: Page) {
    this.page = page;
    this.topBar = new TopBar(page);
    this.sidebar = new Sidebar(page);
    this.workspace = new WorkspacePanel(page);
    this.aiPanel = new AIPanel(page);
    this.tabBar = new TabBar(page);
  }

  async toggleTheme() {
    await this.topBar.toggleTheme();
  }

  async toggleSidebar() {
    await this.topBar.toggleSidebar();
  }

  async openPalette() {
    await this.topBar.openCommandPalette();
  }

  async openAI() {
    await this.topBar.toggleAI();
  }

  async openTemplates() {
    await this.topBar.openTemplates();
  }

  async openSettings() {
    await this.topBar.openSettings();
  }

  async newDiagram() {
    await this.topBar.newDiagram();
  }
}

export class TopBar {
  readonly page: Page;
  readonly themeToggle: Locator;
  readonly sidebarToggle: Locator;
  readonly paletteButton: Locator;
  readonly aiButton: Locator;
  readonly templatesButton: Locator;
  readonly newDiagramButton: Locator;
  readonly languageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');
    this.sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    this.paletteButton = page.locator('[data-testid="palette-button"]');
    this.aiButton = page.locator('[data-testid="ai-button"]');
    this.templatesButton = page.locator('[data-testid="templates-button"]');
    this.newDiagramButton = page.locator('[data-testid="new-diagram-button"]');
    this.languageButton = page.locator('button:has(svg.lucide-globe)');
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async toggleSidebar() {
    await this.sidebarToggle.click();
  }

  async openCommandPalette() {
    await this.paletteButton.click();
  }

  async toggleAI() {
    await this.aiButton.click();
  }

  async openTemplates() {
    await this.templatesButton.click();
  }

  async newDiagram() {
    // Try to click either the empty state button (when no tabs exist) or the top bar button
    // Use first() to get the first matching element
    const anyNewDiagramButton = this.page.locator('[data-testid="empty-new-diagram"], [data-testid="new-diagram-button"]').first();
    await anyNewDiagramButton.click({ timeout: 10000 });
  }

  async changeLanguage(lang: 'en' | 'fr') {
    await this.languageButton.click();
    const langLabel = lang === 'en' ? 'English' : 'Français';
    await this.page.click(`button:has-text("${langLabel}")`);
    // Wait for translation to apply
    await this.page.waitForTimeout(500);
  }
}

export class Sidebar {
  readonly page: Page;
  readonly fileTree: Locator;
  readonly diagramItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileTree = page.locator('[data-testid="file-tree"]');
    this.diagramItems = page.locator('[data-testid="diagram-item"]');
  }

  async getDiagramCount() {
    return this.diagramItems.count();
  }

  async openDiagram(index: number = 0) {
    await this.diagramItems.nth(index).click();
  }
}

export class WorkspacePanel {
  readonly page: Page;
  readonly editor: CodeEditor;
  readonly preview: PreviewPanel;
  readonly statusbar: StatusBar;

  constructor(page: Page) {
    this.page = page;
    this.editor = new CodeEditor(page);
    this.preview = new PreviewPanel(page);
    this.statusbar = new StatusBar(page);
  }

  async getActiveTab() {
    return this.page.locator('[data-active="true"]').textContent();
  }
}

export class TabBar {
  readonly page: Page;
  readonly tabs: Locator;
  readonly activeTab: Locator;
  readonly closeButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tabs = page.locator('[data-testid="tab"]');
    this.activeTab = page.locator('[data-active="true"]');
    this.closeButtons = page.locator('[data-testid="close-tab"]');
  }

  async getTabCount() {
    return this.tabs.count();
  }

  async switchTab(index: number) {
    await this.tabs.nth(index).click();
  }

  async closeTab(index: number) {
    await this.closeButtons.nth(index).click();
  }
}

export class CodeEditor {
  readonly page: Page;
  readonly editor: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.locator('[data-testid="code-editor"]');
  }

  async getCode() {
    // Access the CodeMirror instance stored on the DOM element
    return this.editor.evaluate((el: HTMLElement & { cmView?: { state: { doc: { toString: () => string } } } }) => {
      const cmEditor = el.querySelector('.cm-editor');
      if (cmEditor && (cmEditor as any).cmView) {
        return (cmEditor as any).cmView.state.doc.toString();
      }
      return '';
    });
  }

  async setCode(content: string) {
    // Use CodeMirror's API to set content
    await this.editor.evaluate((el: HTMLElement & { cmView?: any }, newContent) => {
      const cmEditor = el.querySelector('.cm-editor');
      if (cmEditor && (cmEditor as any).cmView) {
        const view = (cmEditor as any).cmView;
        const currentContent = view.state.doc.toString();
        view.dispatch({
          changes: { from: 0, to: currentContent.length, insert: newContent }
        });
      }
    }, content);
  }

  async insertText(text: string) {
    // Use CodeMirror's API to insert text at cursor position
    await this.editor.evaluate((el: HTMLElement & { cmView?: any }, newText) => {
      const cmEditor = el.querySelector('.cm-editor');
      if (cmEditor && (cmEditor as any).cmView) {
        const view = (cmEditor as any).cmView;
        view.dispatch({
          changes: { from: view.state.selection.main.head, insert: newText }
        });
      }
    }, text);
  }

  async getLineNumber() {
    // Get current cursor line number
    return this.editor.evaluate((el: HTMLElement & { cmView?: any }) => {
      const cmEditor = el.querySelector('.cm-editor');
      if (cmEditor && (cmEditor as any).cmView) {
        const view = (cmEditor as any).cmView;
        return view.state.doc.lineAt(view.state.selection.main.head).number;
      }
      return 0;
    });
  }
}

export class PreviewPanel {
  readonly page: Page;
  readonly preview: Locator;
  readonly fullscreenButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.preview = page.locator('[data-testid="preview-panel"]');
    this.fullscreenButton = page.locator('[data-testid="fullscreen-button"]');
  }

  async isVisible() {
    return this.preview.isVisible();
  }

  async clickFullscreen() {
    await this.fullscreenButton.click();
  }
}

export class StatusBar {
  readonly page: Page;
  readonly status: Locator;
  readonly renderTime: Locator;

  constructor(page: Page) {
    this.page = page;
    this.status = page.locator('[data-testid="status"]');
    this.renderTime = page.locator('[data-testid="render-time"]');
  }

  async getRenderTime() {
    return this.renderTime.textContent();
  }
}

export class AIPanel {
  readonly page: Page;
  readonly panel: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly response: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.locator('[data-testid="ai-panel"]');
    this.input = page.locator('[data-testid="ai-input"]');
    this.sendButton = page.locator('[data-testid="ai-send"]');
    this.response = page.locator('[data-testid="ai-response"]');
  }

  async isVisible() {
    return this.panel.isVisible();
  }

  async sendMessage(message: string) {
    await this.input.fill(message);
    await this.sendButton.click();
  }

  async getResponse() {
    return this.response.textContent();
  }

  async close() {
    await this.page.locator('[data-testid="close-ai"]').click();
  }
}