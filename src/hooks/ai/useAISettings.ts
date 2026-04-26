import { useState, useEffect } from 'react';
import { getSettings } from '@/services/storage/database';
import { getMachineConfig, isMachineAvailable } from '@/services/ai/providers';
import type { MachineSize } from '@/types';

export function useAISettings(settingsKey?: number) {
  const [machineSize, setMachineSize] = useState<MachineSize>('low');
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    getSettings().then(settings => {
      const size = settings.ai_machine_size ?? 'low';
      setMachineSize(size);
      setIsConfigured(isMachineAvailable(size));
    });
  }, [settingsKey]);

  const config = getMachineConfig(machineSize);

  return {
    machineSize,
    isConfigured,
    config,
  };
}
