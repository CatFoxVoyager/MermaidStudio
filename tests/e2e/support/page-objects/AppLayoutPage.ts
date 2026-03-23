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
  const paletteButton: Locator;
  const aiButton: Locator;
  const templatesButton: Locator;
  const newDiagramButton: Locator;
  const settingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');
    this.sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    this.paletteButton = page.locator('[data-testid="palette-button"]');
    this.aiButton = page.locator('[data-testid="ai-button"]');
    this.templatesButton = page.locator('[data-testid="templates-button"]');
    this.newDiagramButton = page.locator('[data-testid="new-diagram-button"]');
    this.settingsButton = page.locator('[data-testid="settings-button"]');
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
    await this.newDiagramButton.click();
  }

  async openSettings() {
    await this.settingsButton.click();
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
  const statusbar: StatusBar;

  constructor(page: Page) {
    this.page = page;
    this.editor = new CodeEditor(page);
    this.preview = new PreviewPanel(page);
    this.statusbar = new StatusBar(page);
  }

  async getActiveTab() {
    return this.page.locator('[data-testid="active-tab"]').textContent();
  }
}

export class TabBar {
  readonly page: Page;
  const tabs: Locator;
  const activeTab: Locator;
  const closeButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tabs = page.locator('[data-testid="tab"]');
    this.activeTab = page.locator('[data-testid="active-tab"]');
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
  const editor: Locator;
  const textarea: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.locator('[data-testid="code-editor"]');
    this.textarea = page.locator('[data-testid="editor-textarea"]');
  }

  async getCode() {
    return this.textarea.inputValue();
  }

  async setCode(content: string) {
    await this.textarea.fill(content);
  }

  async insertText(text: string) {
    await this.textarea.press('Control+End');
    await this.textarea.press('Enter');
    await this.textarea.type(text);
  }

  async getLineNumber() {
    return this.textarea.textContent();
  }
}

export class PreviewPanel {
  readonly page: Page;
  const preview: Locator;
  const fullscreenButton: Locator;

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
  const status: Locator;
  const renderTime: Locator;

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
  const panel: Locator;
  const input: Locator;
  const sendButton: Locator;
  const response: Locator;

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