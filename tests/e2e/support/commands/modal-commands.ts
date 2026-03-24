import { Page, Locator } from '@playwright/test';

export const modalCommands = {
  openModal: async (page: Page, modalName: string) => {
    const modalMap: Record<string, string> = {
      'templates': '[data-testid="templates-button"]',
      'palette': '[data-testid="palette-button"]',
      'export': '[data-testid="export-button"]',
      'help': '[data-testid="help-button"]',
      'backup': '[data-testid="backup-button"]',
      'settings': '[data-testid="settings-button"]',
      'ai': '[data-testid="ai-button"]'
    };

    const button = modalMap[modalName];
    if (!button) {
      throw new Error(`Unknown modal: ${modalName}`);
    }

    await page.locator(button).click();
    await page.waitForSelector(`[data-testid="${modalName}-modal"]`);
  },

  closeModal: async (page: Page, modalName: string) => {
    await page.locator(`[data-testid="close-${modalName}"]`).click();
    await page.waitForSelector(`[data-testid="${modalName}-modal"]`, { state: 'hidden' });
  },

  isModalVisible: async (page: Page, modalName: string): Promise<boolean> => {
    const modal = page.locator(`[data-testid="${modalName}-modal"]`);
    return modal.isVisible();
  },

  waitUntilModalVisible: async (page: Page, modalName: string) => {
    await page.waitForSelector(`[data-testid="${modalName}-modal"]`);
  }
};