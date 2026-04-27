import { logger } from '@/utils/logger';
import type { MachineSize } from '@/types';

const log = logger.scope('WebGPU MLC');

const MLC_MODEL_LIB_PREFIX =
  'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_83/base';

interface ModelConfig {
  id: string;
  label: string;
  description: string;
  weightsUrl: string;
  wasmUrl: string;
  maxTokens: number;
}

const MODELS: Record<MachineSize, ModelConfig> = {
  low: {
    id: 'qwen3.5-0.8b-mermaid',
    label: 'Low memory GPU (Qwen3.5 0.8B)',
    description: 'Qwen3.5-0.8B fine-tuned for Mermaid. ~400MB download. Best for most diagrams.',
    weightsUrl:
      'https://huggingface.co/SpongeBOB9684/qwen3.5-0.8b-mermaid-generator-mlc/resolve/main/q4f16-v2/',
    wasmUrl: `${MLC_MODEL_LIB_PREFIX}/Qwen3.5-0.8B-q4f16_1_cs1k-webgpu.wasm`,
    maxTokens: 512,
  },
  high: {
    id: 'qwen3.5-2b-mermaid',
    label: 'High memory GPU (Qwen3.5 2B)',
    description: 'Qwen3.5-2B fine-tuned for Mermaid. ~700MB download. Better for complex diagrams.',
    weightsUrl:
      'https://huggingface.co/SpongeBOB9684/qwen3.5-2b-mermaid-generator-mlc/resolve/main/q4f16-v2/',
    wasmUrl: `${MLC_MODEL_LIB_PREFIX}/Qwen3.5-2B-q4f16_1_cs1k-webgpu.wasm`,
    maxTokens: 1024,
  },
};

function getAppConfig(model: ModelConfig) {
  return {
    model_list: [
      {
        model: model.weightsUrl,
        model_id: model.id,
        model_lib: model.wasmUrl,
        required_features: ['shader-f16'],
        overrides: {
          context_window_size: 4096,
          max_history_size: 1,
        },
      },
    ],
  };
}

export function getMachineConfig(size: MachineSize): ModelConfig {
  return MODELS[size];
}

export function isMachineAvailable(size: MachineSize): boolean {
  const model = MODELS[size];
  return model.weightsUrl !== '' && model.wasmUrl !== '';
}

export type WebGPUProgressCallback = (progress: { progress: number; text: string }) => void;

let engine: any = null;
let currentSize: MachineSize | null = null;
let isLoading = false;

export async function checkWebGPUSupport(): Promise<{ supported: boolean; reason?: string }> {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU is not available in this browser. Try Chrome 113+, Edge 113+, or Firefox 150+.',
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: 'No WebGPU adapter found. Your GPU may not support WebGPU.',
      };
    }

    const features = adapter.features as Set<string>;
    if (!features.has('shader-f16')) {
      return {
        supported: false,
        reason: 'Your GPU does not support shader-f16, which is required for this model.',
      };
    }

    return { supported: true };
  } catch (e) {
    return {
      supported: false,
      reason: `WebGPU error: ${e instanceof Error ? e.message : 'Unknown'}`,
    };
  }
}

export function isModelLoaded(): boolean {
  return engine !== null;
}

export function isModelLoading(): boolean {
  return isLoading;
}

export function getLoadedMachineSize(): MachineSize | null {
  return currentSize;
}

export async function unloadModel(): Promise<void> {
  if (engine) {
    try {
      engine.unload();
    } catch {
      /* engine may already be unloaded */
    }
    engine = null;
    currentSize = null;
    log.info('Model unloaded, waiting for GPU cleanup...');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export async function loadModel(
  size: MachineSize,
  onProgress?: WebGPUProgressCallback
): Promise<void> {
  const model = MODELS[size];

  if (!isMachineAvailable(size)) {
    throw new Error(
      `The ${model.label} model is not yet available. Please use Low Memory for now.`
    );
  }

  if (engine && currentSize === size) {
    log.info('Model already loaded:', model.id);
    return;
  }

  if (engine && currentSize !== size) {
    await unloadModel();
  }

  if (isLoading) {
    log.warn('Model is already loading');
    return;
  }

  const support = await checkWebGPUSupport();
  if (!support.supported) {
    throw new Error(support.reason ?? 'WebGPU not supported');
  }

  isLoading = true;

  try {
    const webllm = await import('@mlc-ai/web-llm');

    log.info('Loading model', model.id);

    engine = await webllm.CreateMLCEngine(model.id, {
      appConfig: getAppConfig(model),
      initProgressCallback: (progress: { progress?: number; text?: string }) => {
        if (onProgress) {
          onProgress({
            progress: progress.progress ?? 0,
            text: progress.text ?? '',
          });
        }
      },
    });

    currentSize = size;
    log.info('Model loaded successfully:', model.id);
  } catch (error) {
    engine = null;
    currentSize = null;
    log.error('Failed to load model:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

export function stripMermaidFences(text: string): string {
  let cleaned = text;

  cleaned = cleaned.replace(/```(?:thinking|thought|reasoning)\n?[\s\S]*?\n?```/gi, '');

  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<\/?think\}>/gi, '');

  cleaned = cleaned.replace(/<\|think_start\|>[\s\S]*?<\|think_end\|>/g, '');

  cleaned = cleaned.replace(/```mermaid\n?([\s\S]*?)\n?```/g, '$1');
  cleaned = cleaned.replace(/```\n?([\s\S]*?)\n?```/g, '$1');

  const stopMarkers = [
    '<|im_start|>',
    '<|im_end|>',
    '<|think_start|>',
    '<|think_end|>',
    '<|tool_start|>',
    '<|tool_end|>',
  ];

  let earliestIndex = cleaned.length;
  for (const marker of stopMarkers) {
    const index = cleaned.indexOf(marker);
    if (index !== -1 && index < earliestIndex && index > 5) {
      earliestIndex = index;
    }
  }
  cleaned = cleaned.substring(0, earliestIndex);

  cleaned = cleaned.replace(/<\|[\s\S]*?\|>/g, '');
  return cleaned.trim();
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generate(
  size: MachineSize,
  messages: ChatMessage[],
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!engine || currentSize !== size) {
    await loadModel(size, p => {
      if (onProgress) {
        onProgress(Math.round(p.progress * 100));
      }
    });
  }

  if (!engine) {
    throw new Error('WebGPU engine not initialized');
  }

  const model = MODELS[size];

  log.debug('Generating with WebGPU MLC', { model: model.id, messageCount: messages.length });

  try {
    const reply = await engine.chat.completions.create({
      messages,
      temperature: 0.6,
      max_tokens: model.maxTokens,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of reply) {
      const delta = chunk.choices[0]?.delta?.content || '';
      fullText += delta;
    }

    const cleaned = stripMermaidFences(fullText);
    log.debug('WebGPU MLC response', { length: cleaned.length, preview: cleaned.substring(0, 100) });

    return cleaned;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isRecoverable =
      msg.includes('VectorInt') ||
      msg.includes('BindingError') ||
      msg.includes('Context lost') ||
      msg.includes('Device was lost');

    if (isRecoverable) {
      log.warn('GPU error detected, unloading and retrying with fresh engine...', { error: msg });
      await unloadModel();

      if (!engine) {
        await loadModel(size, p => {
          if (onProgress) {
            onProgress(Math.round(p.progress * 100));
          }
        });
      }

      if (!engine) {
        throw new Error('WebGPU engine failed to reload after GPU error', { cause: error });
      }

      const reply = await engine.chat.completions.create({
        messages,
        temperature: 0.6,
        max_tokens: model.maxTokens,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of reply) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullText += delta;
      }

      const cleaned = stripMermaidFences(fullText);
      log.debug('WebGPU MLC retry response', { length: cleaned.length, preview: cleaned.substring(0, 100) });

      return cleaned;
    }
    throw error;
  }
}

export function __resetInstance(): void {
  engine = null;
  currentSize = null;
  isLoading = false;
}
