import { useState, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { getSettings } from '@/services/storage/database';
import { callAI } from '@/services/ai/providers';
import { detectDiagramType } from '@/lib/mermaid/diagramType';
import { logger } from '@/utils/logger';
import type { AIMessage, DiagramType, MachineSize } from '@/types';

const log = logger.scope('AI Send');

function isMermaidStart(line: string, remainingLines?: string[]): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (detectDiagramType(trimmed) !== 'unknown') return true;
  if (/^class\s+\w+\s*\{/.test(trimmed)) return true;
  if (/^\w+\s*(-->|->|==>|\.\.>|--|---|-.->|x--x|o--o|<-->|~~~)\s*\w+/.test(trimmed)) return true;
  // Support unfenced YAML frontmatter blocks (`--- ... --- <diagramHeader>`)
  if (trimmed === '---' && remainingLines && remainingLines.length > 2) {
    const rest = remainingLines.join('\n');
    const closingIdx = rest.indexOf('\n---');
    if (closingIdx > -1 && detectDiagramType(rest) !== 'unknown') {
      return true;
    }
  }
  return false;
}

export function extractMermaidCode(text: string): string {
  let cleaned = text.trim();
  if (!cleaned) return cleaned;

  cleaned = cleaned.replace(/```(?:thinking|thought|reasoning)\n?[\s\S]*?\n?```/gi, '');
  cleaned = cleaned.replace(/```mermaid\n?([\s\S]*?)\n?```/g, '$1');
  cleaned = cleaned.replace(/```\n?([\s\S]*?)\n?```/g, '$1');
  cleaned = cleaned.trim();

  const lines = cleaned.split('\n');
  let codeStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isMermaidStart(lines[i], lines.slice(i))) {
      codeStartIndex = i;
      break;
    }
  }

  if (codeStartIndex > 0) {
    return lines.slice(codeStartIndex).join('\n').trim();
  }

  return cleaned;
}

function wrapMermaidInFences(reply: string): string {
  const withoutThinking = reply.replace(/```(?:thinking|thought|reasoning)\n?[\s\S]*?\n?```/gi, '');
  const withoutThinkTags = withoutThinking.replace(/<\/?think\}>/gi, '');

  if (withoutThinkTags.includes('```')) return withoutThinkTags;

  const trimmed = withoutThinkTags.trim();
  if (!trimmed) return withoutThinkTags;

  const lines = trimmed.split('\n');

  let codeStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isMermaidStart(lines[i], lines.slice(i))) {
      codeStartIndex = i;
      break;
    }
  }

  if (codeStartIndex === -1) return withoutThinking;

  const textBefore = lines.slice(0, codeStartIndex).join('\n').trim();
  let mermaidCode = lines.slice(codeStartIndex).join('\n').trim();

  if (/^class\s+\w+\s*\{/.test(lines[codeStartIndex].trim()) && !mermaidCode.toLowerCase().startsWith('classdiagram')) {
    mermaidCode = 'classDiagram\n' + mermaidCode;
  }

  let result = '';
  if (textBefore) result += textBefore + '\n\n';
  result += '```mermaid\n' + mermaidCode + '\n```';

  return result;
}

const HUMAN_DIAGRAM_LABELS: Record<DiagramType, string> = {
  flowchart: 'flowchart',
  sequence: 'sequence diagram',
  classDiagram: 'class diagram',
  stateDiagram: 'state diagram',
  erDiagram: 'entity relationship diagram',
  gantt: 'gantt chart',
  pie: 'pie chart',
  mindmap: 'mindmap',
  gitGraph: 'git graph',
  journey: 'user journey',
  quadrantChart: 'quadrant chart',
  requirementDiagram: 'requirement diagram',
  timeline: 'timeline',
  sankey: 'sankey diagram',
  xyChart: 'xy chart',
  packetDiagram: 'packet diagram',
  kanban: 'kanban board',
  architectureDiagram: 'architecture diagram',
  usecaseDiagram: 'use case diagram',
  zenuml: 'zenuml diagram',
  blockDiagram: 'block diagram',
  c4: 'c4 diagram',
  ishikawa: 'ishikawa diagram',
  radar: 'radar chart',
  treemap: 'treemap',
  eventmodeling: 'event modeling diagram',
  venn: 'venn diagram',
  treeView: 'tree view',
  wardley: 'wardley map',
  cynefin: 'cynefin chart',
  railroad: 'railroad diagram',
  swimlane: 'swimlane diagram',
  unknown: 'diagram',
};

function detectDiagramTypeFromContent(content: string): string {
  return HUMAN_DIAGRAM_LABELS[detectDiagramType(content)] ?? 'diagram';
}

interface UseAISendParams {
  currentContent: string;
  messages: AIMessage[];
  addMessage: (role: AIMessage['role'], content: string) => AIMessage;
  isConfigured: boolean;
  previewError?: string | null;
}

export function useAISend({
  currentContent,
  messages,
  addMessage,
  isConfigured,
  previewError,
}: UseAISendParams) {
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const send = useCallback(
    async (text: string, t: TFunction<'translation', undefined>) => {
      if (!text.trim() || loading) {
        return;
      }

      setLoading(true);
      setDownloadProgress(null);

      try {
        const currentSettings = await getSettings();
        const machineSize: MachineSize = currentSettings.ai_machine_size ?? 'low';

        if (isConfigured) {
          const hasDiagram = currentContent.trim().length > 0;
          const diagramType = detectDiagramTypeFromContent(currentContent);

          const lower = text.toLowerCase();
          const wantsExplanation =
            lower.includes('explain') ||
            lower.includes('what does') ||
            lower.includes('describe') ||
            lower.includes('what is');
          const wantsCreation =
            lower.includes('create') ||
            lower.includes('generate') ||
            lower.includes('make') ||
            lower.includes('draw') ||
            lower.includes('build');
          const wantsModification =
            hasDiagram &&
            (lower.includes('add') ||
              lower.includes('remove') ||
              lower.includes('change') ||
              lower.includes('modify') ||
              lower.includes('update') ||
              lower.includes('convert') ||
              lower.includes('simplify') ||
              lower.includes('improve') ||
              lower.includes('fix'));

          let systemPrompt: string;

          if (wantsExplanation) {
            systemPrompt = `You are a diagram assistant. The user wants to understand their diagram. Explain what the diagram shows in plain language. Be concise and helpful.
${hasDiagram ? `\nThe user's diagram:\n${currentContent}\n\nExplain this ${diagramType} clearly. Describe the flow, relationships, and key elements.` : ''}`;
          } else if (wantsCreation && !wantsModification) {
            systemPrompt = `You are a Mermaid.js diagram generator. Output ONLY valid Mermaid code in a \`\`\`mermaid code block. No explanations, no markdown outside the code block.

RULES:
- Use valid Mermaid v12 syntax across all diagram families (flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, ishikawa-beta, radar-beta, treemap-beta, eventmodeling, venn-beta, treeView-beta, wardley-beta, cynefin-beta, railroad-beta, swimlane-beta, etc.).
- Use bracket shapes ([box], {diamond}, ([stadium]), ((circle)), [[subroutine]], [(cylinder)], >flag]) or canonical v12 directives (@{ shape: cyl }, @{ icon: "fa:star" }, @{ img: "..." }, "\`Markdown\`").
- Use valid Flowchart edges (-->, ---, -.->, ==>, x--x, o--o, <-->, ~~~) and optional edge/subgraph directives (e1@--> + e1@{ animate: true, curve: basis }, sg1@{ view: collapsed }).
- Keep diagrams SMALL and CONCISE. Maximum 12 nodes.
- Do NOT repeat nodes or edges.
- Use the exact data the user requests. Do NOT invent content.

EXAMPLE:
\`\`\`mermaid
flowchart LR
    A[Start] --> B{Decision}
    B -->|Yes| C[Result]
    B -->|No| D[Retry]
\`\`\``;
          } else {
            systemPrompt = `You are a Mermaid.js diagram editor. The user wants to modify their existing diagram. Output ONLY the modified Mermaid code in a \`\`\`mermaid code block.

RULES:
- Use valid Mermaid v12 syntax (supports bracket shapes, @{ shape/icon/img/... }, e1@{ animate/step/curve }, sg1@{ view: collapsed }, "\`Markdown\`", and all 32 diagram families).
- Use valid Flowchart edges (-->, ---, -.->, ==>, x--x, o--o, <-->, ~~~, -->|label|).
- Preserve ALL original formatting, shapes, styles, colors, classes, config blocks, and direction.
- ONLY change what the user explicitly requests.
- Keep diagrams SMALL. Maximum 12 nodes.
${hasDiagram ? `\nCurrent diagram:\n${currentContent}` : ''}`;
          }

          const chatHistory = messages.slice(-6).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

          const allMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...chatHistory,
            { role: 'user' as const, content: text },
          ];

          log.debug('Sending AI request', {
            machineSize,
            hasDiagram,
            diagramType,
            contentLength: currentContent.length,
            userMessageLength: text.length,
            messageCount: allMessages.length,
          });

          const reply = await callAI(machineSize, allMessages, progress => {
            setDownloadProgress(progress);
          });

          setDownloadProgress(null);

          log.debug('Received AI response', {
            replyLength: reply?.length ?? 0,
            replyPreview: reply?.substring(0, 100),
            isEmpty: !reply || reply.trim().length === 0,
          });

          if (!reply || reply.trim().length === 0) {
            log.warn('Empty response received');
            addMessage(
              'assistant',
              t('ai.errorPrefix', {
                msg: 'Empty response received from AI model. Please try again.',
              })
            );
          } else if (
            reply.includes('No response from') ||
            reply.includes('error') ||
            reply.includes('Error:')
          ) {
            log.warn('Error response:', reply);
            addMessage('assistant', t('ai.errorPrefix', { msg: reply }));
          } else {
            addMessage('assistant', wrapMermaidInFences(reply));
          }
        } else {
          await new Promise(r => setTimeout(r, 400));
          const lower = text.toLowerCase();
          const type = detectDiagramTypeFromContent(currentContent);
          if (lower.includes('explain') || lower.includes('what')) {
            addMessage(
              'assistant',
              `This is a ${type}. It visualizes the flow and relationships between elements.\n\nEach node represents a step or entity, and edges show connections or transitions.\n\nPlease configure your AI model in settings.`
            );
          } else {
            addMessage(
              'assistant',
              `I can help with your ${type}!\n\nPlease configure your AI model in settings.`
            );
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        log.error('Error:', e);
        const safeMsg = msg
          .replace(/api[_-]?key[^=]*=\s*\S+/gi, '[REDACTED]')
          .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
          .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');
        addMessage('assistant', t('ai.errorPrefix', { msg: safeMsg }));
      } finally {
        setLoading(false);
      }
    },
    [currentContent, messages, addMessage, isConfigured, loading]
  );

  const sendFixRequest = useCallback(
    async (t: TFunction<'translation', undefined>) => {
      if (loading) {
        return;
      }

      setLoading(true);

      try {
        const currentSettings = await getSettings();
        const machineSize: MachineSize = currentSettings.ai_machine_size ?? 'low';

        if (isConfigured) {
          const hasDiagram = currentContent.trim().length > 0;
          const diagramType = detectDiagramTypeFromContent(currentContent);

          const systemPrompt = `You are a Mermaid.js syntax fixer. Output ONLY the fixed Mermaid code in a \`\`\`mermaid code block. No explanations.

RULES:
- Use valid Mermaid v12 syntax (preserving bracket shapes, @{ shape/icon/img/... }, e1@{ animate/step/curve }, sg1@{ view: collapsed }, "\`Markdown\`", YAML frontmatter, and all 32 diagram families).
- Valid Flowchart edges: -->, ---, -.->, ==>, x--x, o--o, <-->, ~~~, -->|label|
- Do NOT change node shapes, edge styles, colors, classes, styles, config, direction, or labels.
- ONLY fix the syntax error. Keep everything else identical.
${hasDiagram ? `\nDiagram to fix:\n${currentContent}` : ''}`;

          const userPrompt = previewError
            ? `Fix the syntax error that prevents rendering.\n\nERROR MESSAGE:\n${previewError}\n\nFix ONLY the error. Output the full diagram with the fix applied, keeping all formatting, shapes, styles, colors, and labels exactly as they are.`
            : 'Check for syntax errors only. If found, fix them while keeping all formatting identical. If no errors, respond with the original code unchanged.';

          const allMessages = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: userPrompt },
          ];

          log.debug('Sending fix request', { machineSize, hasDiagram, diagramType });

          const reply = await callAI(machineSize, allMessages, progress => {
            setDownloadProgress(progress);
          });

          setDownloadProgress(null);

          log.debug('Received fix response', {
            replyLength: reply?.length ?? 0,
            replyPreview: reply?.substring(0, 100),
          });

          if (!reply || reply.trim().length === 0) {
            log.warn('Empty fix response');
            addMessage(
              'assistant',
              t('ai.errorPrefix', { msg: 'Empty response from AI model. Please try again.' })
            );
          } else if (
            (reply.includes('No issues found') || reply.includes('looks great')) &&
            !previewError
          ) {
            addMessage('assistant', reply);
          } else if (
            (reply.includes('No issues found') || reply.includes('looks great')) &&
            previewError
          ) {
            log.warn('AI ignored renderer error');
            addMessage(
              'assistant',
              `The AI couldn't automatically identify the issue, but the renderer still reports an error: "${previewError.split('\n')[0]}". Please check your syntax manually around that line.`
            );
          } else if (
            reply.includes('Error:') ||
            (reply.startsWith('Error') && !reply.includes('syntax error'))
          ) {
            log.warn('Error in fix response:', reply);
            addMessage('assistant', t('ai.errorPrefix', { msg: reply }));
          } else {
            addMessage('assistant', wrapMermaidInFences(reply));
          }
        } else {
          addMessage(
            'assistant',
            `To use the Fix Diagram feature, please configure your AI model first.`
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        log.error('Fix request error:', e);
        const safeMsg = msg
          .replace(/api[_-]?key[^=]*=\s*\S+/gi, '[REDACTED]')
          .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
          .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');
        addMessage('assistant', t('ai.errorPrefix', { msg: safeMsg }));
      } finally {
        setLoading(false);
      }
    },
    [currentContent, addMessage, isConfigured, loading, previewError]
  );

  return { send, sendFixRequest, loading, downloadProgress };
}
