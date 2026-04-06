import type { AppSettings } from '@/types';

export function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    theme: 'light',
    language: 'en',
    ai_provider: 'openai',
    ai_base_url: 'https://api.openai.com',
    ai_model: 'gpt-4',
    ai_api_key: '',
    lastOpenDiagramId: null,
    ...overrides
  };
}
