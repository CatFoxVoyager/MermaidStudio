// src/types/ai.ts
// AI-related types extracted from types/index.ts

export type AIProvider = 'ollama' | 'ollama-cpu' | 'lmstudio' | 'openai' | 'gemini' | 'claude' | 'custom' | 'embedded';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
