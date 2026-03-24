import type { AIProvider, AIProviderConfig } from '@/types';
import { aiRateLimiter } from '@/utils/rateLimiter';

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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAI(config: AIProviderConfig, messages: ChatMessage[]): Promise<string> {
  const { provider, apiKey, baseUrl, model } = config;
  const base = baseUrl.replace(/\/$/, '');

  console.log('[callAI] Request:', {
    provider,
    model,
    baseUrl: base,
    messageCount: messages.length,
    hasSystemMessage: messages.some(m => m.role === 'system'),
    lastUserMessage: messages.filter(m => m.role === 'user').pop()?.content.substring(0, 100),
  });

  // Check rate limit
  if (!aiRateLimiter.canMakeRequest(provider)) {
    const resetTime = Math.ceil(aiRateLimiter.getResetTime(provider) / 1000);
    throw new Error(
      `Rate limit exceeded. Please wait ${resetTime} seconds before making another request.`
    );
  }

  if (provider === 'gemini') {
    const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

    console.log('[callAI] Gemini request:', { url, model });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('[callAI] Gemini response status:', res.status);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[callAI] Gemini error:', err);
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Gemini error ${res.status}`);
    }

    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    console.log('[callAI] Gemini response:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      textPreview: data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100),
    });

    const response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini.';

    // Validate response
    if (response.length < 20 && /^\d{1,2}:\d{2}$/.test(response.trim())) {
      console.error('[callAI] Gemini suspicious timestamp response:', response);
      throw new Error(`Received unexpected timestamp response: "${response}"`);
    }

    return response;
  }

  if (provider === 'claude') {
    const url = `${base}/v1/messages`;
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: 1024,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) {body.system = systemMsg;}

    console.log('[callAI] Claude request:', { url, model });

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

    console.log('[callAI] Claude response status:', res.status);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[callAI] Claude error:', err);
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Claude error ${res.status}`);
    }

    const data = await res.json() as { content?: { text?: string }[] };
    console.log('[callAI] Claude response:', {
      hasContent: !!data.content,
      contentLength: data.content?.length,
      textPreview: data.content?.[0]?.text?.substring(0, 100),
    });

    const response = data.content?.[0]?.text ?? 'No response from Claude.';

    // Validate response
    if (response.length < 20 && /^\d{1,2}:\d{2}$/.test(response.trim())) {
      console.error('[callAI] Claude suspicious timestamp response:', response);
      throw new Error(`Received unexpected timestamp response: "${response}"`);
    }

    return response;
  }

  const url = `${base}/v1/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {headers['Authorization'] = `Bearer ${apiKey}`;}

  console.log('[callAI] OpenAI-compatible request:', { url, model });

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, max_tokens: 1000 }),
  });

  console.log('[callAI] Response status:', res.status, res.statusText);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[callAI] Error response:', err);
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  console.log('[callAI] Response data:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    firstChoice: data.choices?.[0],
    contentPreview: data.choices?.[0]?.message?.content?.substring(0, 100),
  });

  const response = data.choices?.[0]?.message?.content ?? 'No response received.';

  // Validate response - detect suspicious short responses that might indicate an error
  if (response.length < 20 && /^\d{1,2}:\d{2}$/.test(response.trim())) {
    console.error('[callAI] Suspicious timestamp-only response detected:', response);
    throw new Error(`Received unexpected timestamp response: "${response}". This may indicate an API error or incorrect model configuration.`);
  }

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
  const base = baseUrl.replace(/\/$/, '');

  try {
    const url = `${base}/v1/models`;
    if (provider === 'gemini') {
      // Gemini uses a different API structure for listing models
      return getPreset(provider).models;
    }

    console.log('[fetchModels] Fetching from:', url);

    // Simple GET request for all providers
    const res = await fetch(url, {
      method: 'GET',
    });

    console.log('[fetchModels] Response status:', res.status, res.statusText);
    console.log('[fetchModels] Response ok:', res.ok);

    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.status}`);
    }

    const data = await res.json();
    console.log('[fetchModels] Response data:', data);

    const models = data.data?.map((m: { id: string }) => m.id) ?? [];
    console.log('[fetchModels] Extracted models:', models);

    if (models.length > 0) {
      return models;
    }

    console.log('[fetchModels] No models found, returning presets');
    return getPreset(provider).models;
  } catch (error) {
    console.error('[fetchModels] Error:', error);
    // If fetch fails, return preset models as fallback
    return getPreset(provider).models;
  }
}
