import { Page, Locator } from '@playwright/test';

export class TemplatesPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly templateGrid: Locator;
  readonly templateItems: Locator;
  readonly selectButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[data-testid*="templates-modal"]');
    this.templateGrid = page.locator('[data-testid="template-grid"]');
    this.templateItems = page.locator('[data-testid="template-item"]');
    this.selectButton = page.locator('[data-testid="select-template"]');
    this.closeButton = page.locator('[data-testid="close-templates"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async waitForVisible() {
    // For side panel, wait for it to have actual width (not 0)
    await this.page.waitForSelector('[data-testid*="templates-modal"]', {
      state: 'visible',
      timeout: 10000
    });
    // Additionally wait for width transition to complete
    await this.page.waitForFunction(() => {
      const el = document.querySelector('[data-testid*="templates-modal"]');
      return el && el.parentElement && (el.parentElement as HTMLElement).offsetWidth > 0;
    }, { timeout: 10000 });
  }

  async getTemplateCount() {
    await this.waitForVisible();
    return this.templateItems.count();
  }

  async selectTemplate(index: number = 0) {
    await this.waitForVisible();
    // TemplateLibrary uses direct click-to-select (no separate select button)
    await this.templateItems.nth(index).click();
    // Wait for modal to close
    await this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async close() {
    await this.closeButton.click();
    // Wait for modal to be hidden
    await this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

export class PalettePage {
  readonly page: Page;
  readonly modal: Locator;
  readonly paletteItems: Locator;
  readonly selectButton: Locator;
  readonly closeButton: Locator;

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
  readonly modal: Locator;
  readonly languageSelect: Locator;
  readonly themeToggle: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use CSS contains selector because element has "settings-modal palette-modal"
    this.modal = page.locator('[data-testid*="settings-modal"]');
    this.languageSelect = page.locator('[data-testid="language-select"]');
    this.themeToggle = page.locator('[data-testid="theme-toggle"]');
    this.closeButton = page.locator('[data-testid="close-settings"], [data-testid*="close-settings"]');
  }

  async isVisible() {
    return this.modal.isVisible();
  }

  async waitForVisible() {
    // For side panel, wait for it to have actual width (not 0)
    await this.page.waitForSelector('[data-testid*="settings-modal"]', {
      state: 'visible',
      timeout: 10000
    });
    // Additionally wait for width transition to complete
    await this.page.waitForFunction(() => {
      const el = document.querySelector('[data-testid*="settings-modal"]');
      return el && el.parentElement && (el.parentElement as HTMLElement).offsetWidth > 0;
    }, { timeout: 10000 });
  }

  async setLanguage(language: string) {
    await this.waitForVisible();
    await this.languageSelect.selectOption({ label: language });
  }

  async toggleTheme() {
    await this.waitForVisible();
    await this.themeToggle.click();
  }

  async close() {
    await this.closeButton.click();
    // Wait for modal to be hidden
    await this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

export class ExportPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly formatSelect: Locator;
  readonly downloadButton: Locator;
  readonly closeButton: Locator;

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
  readonly modal: Locator;
  readonly content: Locator;
  readonly closeButton: Locator;

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
  readonly modal: Locator;
  readonly backupButton: Locator;
  readonly restoreButton: Locator;
  readonly closeButton: Locator;

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