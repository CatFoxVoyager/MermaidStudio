import type { AIProvider, AIProviderConfig } from '@/types';
import { aiRateLimiter } from '@/utils/rateLimiter';
import { logger } from '@/utils/logger';

const log = logger.scope('AI Provider');

// API endpoint constants
const API_ENDPOINTS = {
  GEMINI: '/v1beta/models',
  CLAUDE: '/v1/messages',
  OPENAI_COMPATIBLE: '/v1/chat/completions',
  MODELS: '/v1/models',
} as const;

// Suspicious response patterns that indicate API errors
const TIMESTAMP_PATTERN = /^\d{1,2}:\d{2}$/;
const MIN_VALID_RESPONSE_LENGTH = 20;

export interface ProviderPreset {
  id: AIProvider;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  requiresKey: boolean;
  keyPlaceholder: string;
  description: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-5.3-instant',
    models: ['gpt-5.4-pro', 'gpt-5.3-instant', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-4o', 'gpt-4o-mini'],
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    description: 'GPT-5 series and GPT-4o models from OpenAI',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    requiresKey: true,
    keyPlaceholder: 'sk-ant-...',
    description: 'Claude 4.6 and 4.5 series models from Anthropic',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-3.1-flash',
    models: ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-deep-research', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    requiresKey: true,
    keyPlaceholder: 'AIza...',
    description: 'Gemini 3.1 and 2.5 series models from Google',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://host.docker.internal:11434',
    defaultModel: 'llama4-scout',
    models: ['llama4-scout', 'llama4-maverick', 'deepseek-v3.2', 'deepseek-r1', 'qwen3', 'mistral-large3', 'gemma3', 'phi4'],
    requiresKey: false,
    keyPlaceholder: '',
    description: 'Local models via Ollama (no key needed)',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    baseUrl: 'http://host.docker.internal:1234',
    defaultModel: 'local-model',
    models: ['local-model'],
    requiresKey: false,
    keyPlaceholder: '',
    description: 'Local models via LM Studio (no key needed)',
  },
  {
    id: 'custom',
    label: 'Custom / Other',
    baseUrl: 'http://host.docker.internal:8080',
    defaultModel: 'model',
    models: [],
    requiresKey: false,
    keyPlaceholder: 'optional-key',
    description: 'Any OpenAI-compatible API endpoint',
  },
];

export function getPreset(id: AIProvider): ProviderPreset {
  return PROVIDER_PRESETS.find(p => p.id === id) ?? PROVIDER_PRESETS[0];
}

/**
 * Validate AI response for suspicious patterns that may indicate errors
 * @throws {Error} If response appears to be an error masquerading as valid output
 */
function validateAIResponse(response: string, providerName: string): void {
  if (!response || response.trim().length === 0) {
    throw new Error('Empty response received from AI provider.');
  }

  // Detect timestamp-only responses that often indicate API errors
  if (response.length < MIN_VALID_RESPONSE_LENGTH && TIMESTAMP_PATTERN.test(response.trim())) {
    log.warn(`${providerName} suspicious timestamp response:`, response);
    throw new Error(
      `Received unexpected timestamp response: "${response}". ` +
      `This may indicate an API error or incorrect model configuration.`
    );
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAI(config: AIProviderConfig, messages: ChatMessage[]): Promise<string> {
  const { provider, apiKey, baseUrl, model } = config;
  // Remove trailing slash and /v1 suffix to avoid double /v1/ in URLs
  const base = baseUrl.replace(/\/$/, '').replace(/\/v1$/, '');

  log.debug('Request:', {
    provider,
    model,
    baseUrl: base,
    messageCount: messages.length,
    hasSystemMessage: messages.some(m => m.role === 'system'),
    lastUserMessageLength: messages.filter(m => m.role === 'user').pop()?.content.length ?? 0,
  });

  // Check rate limit
  if (!aiRateLimiter.canMakeRequest(provider)) {
    const resetTime = Math.ceil(aiRateLimiter.getResetTime(provider) / 1000);
    throw new Error(
      `Rate limit exceeded. Please wait ${resetTime} seconds before making another request.`
    );
  }

  if (provider === 'gemini') {
    const url = `${base}${API_ENDPOINTS.GEMINI}/${model}:generateContent`;
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const contents = chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = { contents };
    if (systemMsg) {
      body.system_instruction = { parts: [{ text: systemMsg.content }] };
    }

    log.debug('Gemini request:', { url, model });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      log.error('Gemini error:', err);
      throw new Error(`API request failed (${res.status}). Please check your API key and model settings.`);
    }

    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    validateAIResponse(response, 'Gemini');
    return response;
  }

  if (provider === 'claude') {
    const url = `${base}${API_ENDPOINTS.CLAUDE}`;
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: 1024,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) {
      body.system = systemMsg;
    }

    log.debug('Claude request:', { url, model });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      log.error('Claude error:', err);
      throw new Error((err.error as { message?: string })?.message ?? `Claude error ${res.status}`);
    }

    const data = await res.json() as { content?: Array<{ text?: string }> };
    const response = data.content?.[0]?.text ?? '';

    validateAIResponse(response, 'Claude');
    return response;
  }

  const url = `${base}${API_ENDPOINTS.OPENAI_COMPATIBLE}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const requestBody = { model, messages, max_tokens: 1000 };
  log.debug('OpenAI-compatible request:', { url, model, body: requestBody });

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    log.error('Error response:', err);
    throw new Error((err.error as { message?: string })?.message ?? `API error ${res.status}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const response = data.choices?.[0]?.message?.content ?? '';

  validateAIResponse(response, 'OpenAI-compatible');
  return response;
}

export async function testConnection(config: AIProviderConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await callAI(config, [
      { role: 'user', content: 'Reply with only the word "ok".' },
    ]);
    if (result) {return { ok: true, message: 'Connection successful!' };}
    return { ok: false, message: 'Empty response from model.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function fetchModels(provider: AIProvider, baseUrl: string): Promise<string[]> {
  // Remove trailing slash and /v1 suffix to avoid double /v1/ in URLs
  const base = baseUrl.replace(/\/$/, '').replace(/\/v1$/, '');

  try {
    // Gemini uses a different API structure for listing models
    if (provider === 'gemini') {
      return getPreset(provider).models;
    }

    const url = `${base}${API_ENDPOINTS.MODELS}`;
    log.debug('Fetching models from:', url);

    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status}`);
    }

    const data = await res.json() as { data?: Array<{ id: string }> };
    const models = data.data?.map((m: { id: string }) => m.id) ?? [];

    if (models.length > 0) {
      return models;
    }

    log.debug('No models found, returning presets');
    return getPreset(provider).models;
  } catch (error) {
    log.error('Error fetching models:', error);
    return getPreset(provider).models;
  }
}
