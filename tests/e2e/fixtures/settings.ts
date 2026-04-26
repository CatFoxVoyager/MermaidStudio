import type { AppSettings } from '@/types';

export function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    theme: 'light',
    language: 'en',
    ai_machine_size: 'low',
    ai_base_url: '',
    ai_model: '',
    ai_api_key: '',
    lastOpenDiagramId: undefined,
    ...overrides,
  };
}
