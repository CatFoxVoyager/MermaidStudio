import { Page, Locator } from '@playwright/test';

export class TemplatesPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly templateGrid: Locator;
  const templateItems: Locator;
  const selectButton: Locator;
  const closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="templates-modal"]');
    this.templateGrid = page.locator('[data-testid="template-grid"]');
    this.templateItems = page.locator('[data-testid="template-item"]');
    this.selectButton = page.locator('[data-testid="select-template"]');
    this.closeButton = page.locator('[data-testid="close-templates"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async getTemplateCount() {
    return this.templateItems.count();
  }

  async selectTemplate(index: number = 0) {
    await this.templateItems.nth(index).click();
    await this.selectButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}

export class PalettePage {
  readonly page: Page;
  const modal: Locator;
  const paletteItems: Locator;
  const selectButton: Locator;
  const closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="palette-modal"]');
    this.paletteItems = page.locator('[data-testid="palette-item"]');
    this.selectButton = page.locator('[data-testid="select-palette"]');
    this.closeButton = page.locator('[data-testid="close-palette"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async getPaletteCount() {
    return this.paletteItems.count();
  }

  async selectPalette(index: number = 0) {
    await this.paletteItems.nth(index).click();
    await this.selectButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}

export class SettingsPage {
  readonly page: Page;
  const modal: Locator;
  const languageSelect: Locator;
  const themeToggle: Locator;
  const closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="settings-modal"]');
    this.languageSelect = page.locator('[data-testid="language-select"]');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');
    this.closeButton = page.locator('[data-testid="close-settings"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async setLanguage(language: string) {
    await this.languageSelect.selectOption({ label: language });
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async close() {
    await this.closeButton.click();
  }
}

export class ExportPage {
  readonly page: Page;
  const modal: Locator;
  const formatSelect: Locator;
  const downloadButton: Locator;
  const closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="export-modal"]');
    this.formatSelect = page.locator('[data-testid="format-select"]');
    this.downloadButton = page.locator('[data-testid="download-button"]');
    this.closeButton = page.locator('[data-testid="close-export"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async selectFormat(format: string) {
    await this.formatSelect.selectOption({ label: format });
  }

  async download() {
    await this.downloadButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}

export class HelpPage {
  readonly page: Page;
  const modal: Locator;
  const content: Locator;
  const closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="help-modal"]');
    this.content = page.locator('[data-testid="help-content"]');
    this.closeButton = page.locator('[data-testid="close-help"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async getContent() {
    return this.content.textContent();
  }

  async close() {
    await this.closeButton.click();
  }
}

export class BackupPage {
  readonly page: Page;
  const modal: Locator;
  const backupButton: Locator;
  const restoreButton: Locator;
  const closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid="backup-modal"]');
    this.backupButton = page.locator('[data-testid="backup-button"]');
    this.restoreButton = page.locator('[data-testid="restore-button"]');
    this.closeButton = page.locator('[data-testid="close-backup"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async backup() {
    await this.backupButton.click();
  }

  async restore() {
    await this.restoreButton.click();
  }

  async close() {
    await this.closeButton.click();
  }
}