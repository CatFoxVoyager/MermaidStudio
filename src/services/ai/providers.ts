import type { MachineSize } from '@/types';
import { logger } from '@/utils/logger';
import {
  generate,
  checkWebGPUSupport,
  isModelLoaded,
  isModelLoading,
  loadModel,
  unloadModel,
  getMachineConfig,
  isMachineAvailable,
  type ChatMessage,
} from './WebGPUMLCProvider';

const log = logger.scope('AI');

export type { ChatMessage } from './WebGPUMLCProvider';
export {
  checkWebGPUSupport,
  isModelLoaded,
  isModelLoading,
  loadModel,
  unloadModel,
  getMachineConfig,
  isMachineAvailable,
};

export interface MachineOption {
  size: MachineSize;
  label: string;
  description: string;
  available: boolean;
}

export function getMachineOptions(): MachineOption[] {
  return (['low', 'high'] as const).map(size => {
    const config = getMachineConfig(size);
    return {
      size,
      label: config.label,
      description: config.description,
      available: isMachineAvailable(size),
    };
  });
}

export async function callAI(
  machineSize: MachineSize,
  messages: ChatMessage[],
  onProgress?: (progress: number) => void
): Promise<string> {
  log.debug('Using WebGPU MLC', { machineSize });
  return generate(machineSize, messages, onProgress);
}

export async function testConnection(
  machineSize: MachineSize
): Promise<{ ok: boolean; message: string }> {
  const support = await checkWebGPUSupport();
  if (!support.supported) {
    return { ok: false, message: support.reason ?? 'WebGPU not supported' };
  }

  if (!isMachineAvailable(machineSize)) {
    const config = getMachineConfig(machineSize);
    return { ok: false, message: `${config.label} model is not yet available.` };
  }

  return { ok: true, message: 'WebGPU supported. Ready to load model.' };
}
