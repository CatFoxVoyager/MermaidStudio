import { useState, useCallback } from 'react';
import { getSettings } from '@/services/storage/database';
import { callAI } from '@/services/ai/providers';
import { buildSystemPrompt, buildFixSystemPrompt, buildCompactRAGPrompt } from '@/components/ai/mermaidSystemPrompt';
import { logger } from '@/utils/logger';
import type { AIMessage } from '@/types';

const log = logger.scope('AI Send');

// Diagram type detection (extracted from AIPanel)
const DIAGRAM_TYPE_MAP: Record<string, string> = {
  flowchart: 'flowchart',
  graph: 'flowchart',
  sequence: 'sequence diagram',
  class: 'class diagram',
  state: 'state diagram',
  er: 'entity relationship diagram',
  gantt: 'gantt chart',
  mindmap: 'mindmap',
  gitgraph: 'git graph',
  pie: 'pie chart',
  journey: 'user journey',
  timeline: 'timeline',
  block: 'block diagram',
  architecture: 'architecture diagram',
  c4: 'c4 diagram',
  kanban: 'kanban board',
  quadrant: 'quadrant chart',
};

function detectDiagramTypeFromContent(content: string): string {
  const firstLine = content.trim().split('\n')[0].toLowerCase();
  for (const [keyword, type] of Object.entries(DIAGRAM_TYPE_MAP)) {
    if (firstLine.includes(keyword)) {
      return type;
    }
  }
  return 'diagram';
}

interface UseAISendParams {
  currentContent: string;
  messages: AIMessage[];
  addMessage: (role: AIMessage['role'], content: string) => AIMessage;
  isConfigured: boolean;
  previewError?: string | null;
}

/**
 * Hook for handling AI message sending logic
 * Manages loading state and communication with AI providers
 */
export function useAISend({ currentContent, messages, addMessage, isConfigured, previewError }: UseAISendParams) {
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const send = useCallback(async (text: string, t: (key: string, params?: unknown) => string) => {
    if (!text.trim() || loading) {
      return;
    }

    setLoading(true);
    setDownloadProgress(null);

    try {
      const currentSettings = await getSettings();

      if (isConfigured) {
        const hasDiagram = currentContent.trim().length > 0;
        const diagramType = detectDiagramTypeFromContent(currentContent);
        const modelName = (currentSettings.ai_model ?? '').toLowerCase();
        
        // Use compact RAG prompt for ultra-light models
        const isSmallModel = modelName.includes('0.5b') || 
                            modelName.includes('1.2b') || 
                            modelName.includes('1.5b') ||
                            modelName.includes('liquid') ||
                            currentSettings.ai_provider === 'embedded';

        const systemPrompt = isSmallModel 
          ? buildCompactRAGPrompt({ currentContent, hasDiagram })
          : buildSystemPrompt({
              currentContent,
              hasDiagram,
              diagramType,
            });

        const chatHistory = messages.slice(-6).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

        const allMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...chatHistory,
          { role: 'user' as const, content: text },
        ];

        log.debug('Sending AI request', {
          provider: currentSettings.ai_provider ?? 'openai',
          model: currentSettings.ai_model ?? 'default',
          hasDiagram,
          diagramType,
          contentLength: currentContent.length,
          userMessageLength: text.length,
          messageCount: allMessages.length,
        });

        const reply = await callAI({
          provider: currentSettings.ai_provider ?? 'openai',
          apiKey: currentSettings.ai_api_key ?? '',
          baseUrl: currentSettings.ai_base_url ?? '',
          model: currentSettings.ai_model ?? '',
        }, allMessages, (progress) => {
          setDownloadProgress(progress);
        });

        setDownloadProgress(null);

        log.debug('Received AI response', {
          replyLength: reply?.length ?? 0,
          replyPreview: reply?.substring(0, 100),
          isEmpty: !reply || reply.trim().length === 0,
        });

        // Validate response before showing
        if (!reply || reply.trim().length === 0) {
          log.warn('Empty response received');
          addMessage('assistant', t('ai.errorPrefix', { msg: 'Empty response received from AI provider. Please check your settings.' }));
        } else if (reply.includes('No response from') || reply.includes('error') || reply.includes('Error:')) {
          log.warn('Error response:', reply);
          addMessage('assistant', t('ai.errorPrefix', { msg: reply }));
        } else if (reply.length < 10 && /^\d{1,2}:\d{2}$/.test(reply.trim())) {
          log.warn('Suspicious timestamp-only response:', reply);
          addMessage('assistant', t('ai.errorPrefix', { msg: `Received unexpected response: "${reply}". This may indicate an issue with the AI provider. Please check your API key and model settings.` }));
        } else {
          addMessage('assistant', reply);
        }
      } else {
        // Not configured - show demo responses
        await new Promise(r => setTimeout(r, 400));
        const lower = text.toLowerCase();
        const type = detectDiagramTypeFromContent(currentContent);
        if (lower.includes('explain') || lower.includes('what')) {
          addMessage('assistant', `This is a ${type}. It visualizes the flow and relationships between elements.\n\nEach node represents a step or entity, and edges show connections or transitions.\n\n${t('ai.configureProvider')}`);
        } else {
          addMessage('assistant', `I can help with your ${type}!\n\n${t('ai.configureProvider')}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log.error('Error:', e);
      // F05: Sanitize error messages before displaying to users
      const safeMsg = msg.replace(/api[_-]?key[^=]*=\s*\S+/gi, '[REDACTED]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');
      addMessage('assistant', t('ai.errorPrefix', { msg: safeMsg }));
    } finally {
      setLoading(false);
    }
  }, [currentContent, messages, addMessage, isConfigured, loading]);

  const sendFixRequest = useCallback(async (t: (key: string, params?: unknown) => string) => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const currentSettings = await getSettings();

      if (isConfigured) {
        const hasDiagram = currentContent.trim().length > 0;
        const diagramType = detectDiagramTypeFromContent(currentContent);

        // Use the fix-specific system prompt
        const systemPrompt = buildFixSystemPrompt({
          currentContent,
          hasDiagram,
          diagramType,
        });

        // Use preview error if available to help AI
        const userPrompt = previewError 
          ? `Please fix this diagram. The renderer reported the following error:\n\n${previewError}\n\nPlease provide the corrected Mermaid code.`
          : 'Please analyze this diagram for syntax, semantic, and style issues. Provide the fixed version.';

        // Build fix request message
        const allMessages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ];

        log.debug('Sending fix request', {
          provider: currentSettings.ai_provider ?? 'openai',
          model: currentSettings.ai_model ?? 'default',
          hasDiagram,
          diagramType,
        });

        const reply = await callAI({
          provider: currentSettings.ai_provider ?? 'openai',
          apiKey: currentSettings.ai_api_key ?? '',
          baseUrl: currentSettings.ai_base_url ?? '',
          model: currentSettings.ai_model ?? '',
        }, allMessages);

        log.debug('Received fix response', {
          replyLength: reply?.length ?? 0,
          replyPreview: reply?.substring(0, 100),
        });

        // Handle response
        if (!reply || reply.trim().length === 0) {
          log.warn('Empty fix response');
          addMessage('assistant', t('ai.errorPrefix', { msg: 'Empty response from AI provider. Please check your settings.' }));
        } else if (reply.includes('No issues found') || reply.includes('looks great')) {
          // No issues found - positive message
          addMessage('assistant', reply);
        } else if (reply.includes('Error:') || (reply.startsWith('Error') && !reply.includes('syntax error'))) {
          // Error in response (but not "syntax error" which is valid)
          log.warn('Error in fix response:', reply);
          addMessage('assistant', t('ai.errorPrefix', { msg: reply }));
        } else {
          // Valid response with fixes
          addMessage('assistant', reply);
        }
      } else {
        // Not configured
        addMessage('assistant', `To use the Fix Diagram feature, please configure your AI provider first.\n\n${t('ai.configureProvider')}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log.error('Fix request error:', e);
      const safeMsg = msg.replace(/api[_-]?key[^=]*=\s*\S+/gi, '[REDACTED]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');
      addMessage('assistant', t('ai.errorPrefix', { msg: safeMsg }));
    } finally {
      setLoading(false);
    }
  }, [currentContent, addMessage, isConfigured, loading]);

  return { send, sendFixRequest, loading };
}
