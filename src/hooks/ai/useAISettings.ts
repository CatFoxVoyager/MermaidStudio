import { useState, useEffect } from 'react';
import { getSettings } from '@/services/storage/database';
import { getPreset } from '@/services/ai/providers';

/**
 * Hook for loading AI settings and provider configuration
 * Manages provider state and configuration status
 */
export function useAISettings(settingsKey?: number) {
  const [provider, setProvider] = useState<string>('openai');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    getSettings().then(settings => {
      const prov = settings.ai_provider ?? 'openai';
      const preset = getPreset(prov);
      setProvider(prov);
      setIsConfigured(!preset.requiresKey || !!settings.ai_api_key);
    });
  }, [settingsKey]);

  const preset = getPreset(provider as Parameters<typeof getPreset>[0]);

  return {
    provider,
    isConfigured,
    preset,
  };
}
