import { Page, Locator } from '@playwright/test';

export const aiCommands = {
  openAI: async (page: Page) => {
    await page.locator('[data-testid="ai-button"]').click();
    await page.locator('[data-testid="ai-panel"]').waitFor();
  },

  sendMessage: async (page: Page, message: string) => {
    const input = page.locator('[data-testid="ai-input"]');
    await input.fill(message);
    await input.press('Enter');
  },

  waitForResponse: async (page: Page, timeout = 30000) => {
    await page.waitForFunction(() => {
      const response = document.querySelector('[data-testid="ai-response"]');
      return response && response.textContent && response.textContent.trim() !== '';
    }, { timeout });
  },

  applyResponse: async (page: Page) => {
    await page.locator('[data-testid="apply-ai"]').click();
  },

  closeAI: async (page: Page) => {
    await page.locator('[data-testid="close-ai"]').click();
  },

  getResponse: async (page: Page): Promise<string> => {
    const response = page.locator('[data-testid="ai-response"]');
    const text = await response.textContent();
    return text || '';
  },

  isAIVisible: async (page: Page): Promise<boolean> => {
    const panel = page.locator('[data-testid="ai-panel"]');
    return panel.isVisible();
  },

  openAISettings: async (page: Page) => {
    await page.locator('[data-testid="ai-settings"]').click();
    await page.locator('[data-testid="ai-settings-modal"]').waitFor();
  }
};