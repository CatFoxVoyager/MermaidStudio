import { Wllama } from '@wllama/wllama';
import { logger } from '@/utils/logger';

// Use Vite's asset import system to get correct URLs for WASM and Worker files
// Single-thread
// @ts-ignore
import wllamaSingleJsUrl from '@wllama/wllama/esm/single-thread/wllama.js?url';
// @ts-ignore
import wllamaSingleWasmUrl from '@wllama/wllama/esm/single-thread/wllama.wasm?url';

// Multi-thread
// @ts-ignore
import wllamaMultiJsUrl from '@wllama/wllama/esm/multi-thread/wllama.js?url';
// @ts-ignore
import wllamaMultiWasmUrl from '@wllama/wllama/esm/multi-thread/wllama.wasm?url';
// @ts-ignore
import wllamaMultiWorkerUrl from '@wllama/wllama/esm/multi-thread/wllama.worker.mjs?url';

const log = logger.scope('Embedded AI');

// Configuration for embedded models
const MODEL_CONFIGS: Record<string, { url: string; size: string }> = {
  'qwen2.5-1.5b-instruct-q4_k_m': {
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    size: '1.1GB'
  },
  'smollm2-360m-q8_0': {
    url: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    size: '385MB'
  },
  'llama-3.2-1b-q4_k_m': {
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '800MB'
  },
  'qwen2.5-0.5b-instruct-q8_0': {
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q8_0.gguf',
    size: '550MB'
  },
  'phi-3.5-mini-instruct-q4_k_m': {
    url: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    size: '2.2GB'
  }
};

let wllamaInstance: Wllama | null = null;
let currentModel: string | null = null;

/**
 * Initialize or get existing Wllama instance
 */
async function getWllama(): Promise<Wllama> {
  if (!wllamaInstance) {
    log.debug('Initializing Wllama with local assets', {
      single: { js: wllamaSingleJsUrl, wasm: wllamaSingleWasmUrl },
      multi: { js: wllamaMultiJsUrl, wasm: wllamaMultiWasmUrl, worker: wllamaMultiWorkerUrl }
    });

    wllamaInstance = new Wllama({
      'single-thread/wllama.js': wllamaSingleJsUrl,
      'single-thread/wllama.wasm': wllamaSingleWasmUrl,
      'multi-thread/wllama.js': wllamaMultiJsUrl,
      'multi-thread/wllama.wasm': wllamaMultiWasmUrl,
      'multi-thread/wllama.worker.mjs': wllamaMultiWorkerUrl,
    });
  }
  return wllamaInstance;
}

/**
 * Load a model into the embedded provider
 */
export async function loadEmbeddedModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
  if (currentModel === modelId && wllamaInstance) {
    return;
  }

  const config = MODEL_CONFIGS[modelId];
  if (!config) {
    throw new Error(`Model ${modelId} not found in embedded configuration.`);
  }

  try {
    const wllama = await getWllama();
    
    log.info(`Loading model ${modelId} from ${config.url}`);
    
    await wllama.loadModelFromUrl(config.url, {
      progressCallback: ({ loaded, total }) => {
        const progress = Math.round((loaded / total) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      }
    });

    currentModel = modelId;
    log.info(`Model ${modelId} loaded successfully.`);
  } catch (error) {
    log.error('Failed to load embedded model:', error);
    // Reset instance on failure to allow retry
    wllamaInstance = null;
    currentModel = null;
    throw error;
  }
}

/**
 * Call the embedded AI model
 */
export async function callEmbeddedAI(
  modelId: string, 
  messages: any[], 
  onProgress?: (progress: number) => void
): Promise<string> {
  await loadEmbeddedModel(modelId, onProgress);
  const wllama = await getWllama();

  // Convert chat messages to a single prompt string
  // For most Instruct models, a simple format like this works:
  const prompt = messages.map(m => {
    if (m.role === 'system') return `System: ${m.content}\n`;
    if (m.role === 'user') return `User: ${m.content}\n`;
    return `Assistant: ${m.content}\n`;
  }).join('') + 'Assistant:';

  log.debug('Embedded Request:', { modelId, promptLength: prompt.length });

  const output = await wllama.createCompletion(prompt, {
    nPredict: 1024,
    sampling: {
      temp: 0.7,
      top_p: 0.9,
    }
  });

  return output.trim();
}

/**
 * Check if a model is currently loaded
 */
export function isModelLoaded(modelId: string): boolean {
  return currentModel === modelId && wllamaInstance !== null;
}
