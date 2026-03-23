import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Bot, User, Sparkles, Copy, Check, RotateCcw, Settings2, AlertCircle } from 'lucide-react';
import type { AIMessage } from '@/types';
import { getSettings } from '@/services/storage/database';
import { callAI, getPreset } from '@/services/ai/providers';
import { buildSystemPrompt } from './mermaidSystemPrompt';

interface Props {
  currentContent: string;
  onApply: (content: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  settingsKey?: number; // Add this to force reload when settings change
}

function CodeBlock({ lang, code, onApply }: { lang: string; code: string; onApply?: (c: string) => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const isMermaid = lang === 'mermaid';

  // Validate Mermaid code for common issues
  const validateCode = (mermaidCode: string): boolean => {
    const trimmed = mermaidCode.trim();
    
    // Check if code contains natural language instructions
    const invalidPatterns = [
      /^(Here is|Here's|This is|Below is|The following)/i,
      /^(Instructions?|Note:|Please|Fix:|Corrected:)/i,
      /\*\*(?:Instructions?|Note|Fix|Corrected)\*\*/i,
      /```(?:mermaid)?\s*(?:Here is|This is|Below is)/i,
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(trimmed.split('\n')[0])) {
        return false;
      }
    }

    // Check for unclosed braces/brackets (basic check)
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return false;
    }

    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return false;
    }

    // Check if code starts with valid Mermaid directive
    const validStarts = [
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'erDiagram', 'gantt', 'mindmap', 'gitGraph',
      'journey', 'timeline', 'pie', 'quadrantChart', 'block', 'kanban',
      'C4', 'architecture'
    ];
    const firstLine = trimmed.split('\n')[0].trim();
    const startsValidly = validStarts.some(start => firstLine.toLowerCase().startsWith(start.toLowerCase()));

    return trimmed.length > 0 && (startsValidly || trimmed.includes('%%'));
  };

  const isValid = !isMermaid || validateCode(code);

  const handleApply = () => {
    if (!isValid) {
      setShowWarning(true);
      return;
    }
    onApply?.(code);
  };

  return (
    <div className="w-full my-2 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{lang || 'code'}</span>
        <div className="flex items-center gap-1.5">
          {isMermaid && onApply && (
            <button onClick={handleApply}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white transition-all ${!isValid ? 'opacity-50' : ''}`}
              style={{ background: !isValid ? 'var(--text-tertiary)' : 'var(--accent)' }}
              title={!isValid ? 'Code may have syntax issues' : t('ai.apply')}>
              <RotateCcw size={9} /> {t('ai.apply')}
            </button>
          )}
          <button onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="p-1 rounded transition-colors hover:bg-white/8" style={{ color: 'var(--text-tertiary)' }}>
            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      {showWarning && (
        <div className="px-3 py-2 text-[10px] flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
          <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Possible syntax issues detected</p>
            <p className="mt-0.5 opacity-80">The code may contain errors. You can still apply it, but check for problems like unclosed brackets or extra text.</p>
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => { onApply?.(code); setShowWarning(false); }}
                className="px-2 py-0.5 rounded text-[9px] font-medium" style={{ background: 'rgba(245,158,11,0.2)' }}>
                Apply Anyway
              </button>
              <button onClick={() => setShowWarning(false)}
                className="px-2 py-0.5 rounded text-[9px] font-medium" style={{ background: 'rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <pre className="px-3 py-2.5 text-[11px] font-mono leading-relaxed overflow-x-auto"
        style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Bubble({ msg, onApply }: { msg: AIMessage; onApply?: (c: string) => void }) {
  const isUser = msg.role === 'user';
  const parts = msg.content.split(/(```[\s\S]*?```)/g);
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border"
        style={{ background: isUser ? 'var(--accent)' : 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
        {isUser ? <User size={11} className="text-white" /> : <Bot size={11} style={{ color: 'var(--accent)' }} />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {parts.map((p, i) => {
          if (p.startsWith('```')) {
            const lines = p.slice(3, -3).split('\n');
            return <CodeBlock key={i} lang={lines[0]} code={lines.slice(1).join('\n').trim()} onApply={onApply} />;
          }
          if (!p.trim()) {return null;}
          return (
            <div key={i} className={`px-3 py-2 rounded-2xl text-xs leading-relaxed mb-1 ${isUser ? 'ml-8' : 'mr-4'}`}
              style={{
                background: isUser ? 'var(--accent)' : 'var(--surface-floating)',
                color: isUser ? '#fff' : 'var(--text-primary)',
              }}>
              {p.trim()}
            </div>
          );
        })}
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const preset = getPreset(provider as Parameters<typeof getPreset>[0]);
  const isLocal = !preset.requiresKey;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
      style={{
        background: isLocal ? 'rgba(34,197,94,0.1)' : 'var(--accent-dim)',
        borderColor: isLocal ? 'rgba(34,197,94,0.3)' : 'var(--accent)',
        color: isLocal ? '#22c55e' : 'var(--accent)',
      }}>
      {preset.label}
    </span>
  );
}

export function AIPanel({ currentContent, onApply, onClose, onOpenSettings, settingsKey }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string>('openai');
  const [isConfigured, setIsConfigured] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    t('ai.suggestion1'), t('ai.suggestion2'),
    t('ai.suggestion3'), t('ai.suggestion4'),
    t('ai.suggestion5'), t('ai.suggestion6'),
  ];

  // Load settings asynchronously
  useEffect(() => {
    getSettings().then(settings => {
      const prov = settings.ai_provider ?? 'openai';
      const preset = getPreset(prov);
      setProvider(prov);
      setIsConfigured(!preset.requiresKey || !!settings.ai_api_key);
    });
  }, [settingsKey]); // Reload when settingsKey changes

  const preset = getPreset(provider as Parameters<typeof getPreset>[0]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function addMsg(role: AIMessage['role'], content: string): AIMessage {
    const m: AIMessage = { id: crypto.randomUUID(), role, content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, m]);
    return m;
  }

  function resetChat() {
    setMessages([]);
  }

  async function send(text: string) {
    if (!text.trim() || loading) {return;}
    setInput('');
    addMsg('user', text);
    setLoading(true);

    const currentSettings = await getSettings();

    if (isConfigured) {
      try {
        // Detect diagram type from current content
        const hasDiagram = currentContent.trim().length > 0;
        const firstLine = currentContent.trim().split('\n')[0].toLowerCase();
        let diagramType = '';
        if (firstLine.includes('flowchart') || firstLine.includes('graph')) {diagramType = 'flowchart';}
        else if (firstLine.includes('sequence')) {diagramType = 'sequence diagram';}
        else if (firstLine.includes('class')) {diagramType = 'class diagram';}
        else if (firstLine.includes('state')) {diagramType = 'state diagram';}
        else if (firstLine.includes('er')) {diagramType = 'entity relationship diagram';}
        else if (firstLine.includes('gantt')) {diagramType = 'gantt chart';}
        else if (firstLine.includes('mindmap')) {diagramType = 'mindmap';}
        else if (firstLine.includes('gitgraph')) {diagramType = 'git graph';}
        else if (firstLine.includes('pie')) {diagramType = 'pie chart';}
        else if (firstLine.includes('journey')) {diagramType = 'user journey';}
        else if (firstLine.includes('timeline')) {diagramType = 'timeline';}
        else if (firstLine.includes('block')) {diagramType = 'block diagram';}
        else if (firstLine.includes('architecture')) {diagramType = 'architecture diagram';}
        else if (firstLine.includes('c4')) {diagramType = 'c4 diagram';}
        else if (firstLine.includes('kanban')) {diagramType = 'kanban board';}
        else if (firstLine.includes('quadrant')) {diagramType = 'quadrant chart';}

        const systemPrompt = buildSystemPrompt({
          currentContent,
          hasDiagram,
          diagramType,
        });
        const chatHistory = messages.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        const allMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...chatHistory,
          { role: 'user' as const, content: text },
        ];

        // Debug logging
        console.log('[AI Panel] Sending request:', {
          provider: currentSettings.ai_provider ?? 'openai',
          model: currentSettings.ai_model ?? 'default',
          hasDiagram,
          diagramType,
          contentLength: currentContent.length,
          contentPreview: currentContent.substring(0, 50),
          userMessage: text,
          messageCount: allMessages.length,
        });

        const reply = await callAI({
          provider: currentSettings.ai_provider ?? 'openai',
          apiKey: currentSettings.ai_api_key ?? '',
          baseUrl: currentSettings.ai_base_url ?? '',
          model: currentSettings.ai_model ?? '',
        }, allMessages);

        console.log('[AI Panel] Received response:', {
          replyLength: reply?.length ?? 0,
          replyPreview: reply?.substring(0, 100),
          fullReply: reply,
          isEmpty: !reply || reply.trim().length === 0,
        });

        // Validate response before showing
        if (!reply || reply.trim().length === 0) {
          console.error('[AI Panel] Empty response received');
          addMsg('assistant', t('ai.errorPrefix', { msg: 'Empty response received from AI provider. Please check your settings.' }));
        } else if (reply.includes('No response from') || reply.includes('error') || reply.includes('Error:')) {
          // Likely an error message - show as error
          console.error('[AI Panel] Error response:', reply);
          addMsg('assistant', t('ai.errorPrefix', { msg: reply }));
        } else if (reply.length < 10 && /^\d{1,2}:\d{2}$/.test(reply.trim())) {
          // Detect timestamp-only responses (e.g., "17:04")
          console.error('[AI Panel] Suspicious timestamp-only response:', reply);
          addMsg('assistant', t('ai.errorPrefix', { msg: `Received unexpected response: "${reply}". This may indicate an issue with the AI provider. Please check your API key and model settings.` }));
        } else {
          addMsg('assistant', reply);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error('[AI Panel] Error:', e);
        addMsg('assistant', t('ai.errorPrefix', { msg }));
      }
    } else {
      await new Promise(r => setTimeout(r, 400));
      const lower = text.toLowerCase();
      const first = currentContent.trim().split('\n')[0].toLowerCase();
      const type = first.includes('flowchart') || first.includes('graph') ? 'flowchart' : first.includes('sequence') ? 'sequence diagram' : 'diagram';
      if (lower.includes('explain') || lower.includes('what')) {
        addMsg('assistant', `This is a ${type}. It visualizes the flow and relationships between elements.\n\nEach node represents a step or entity, and edges show connections or transitions.\n\n${t('ai.configureProvider')}`);
      } else {
        addMsg('assistant', `I can help with your ${type}!\n\n${t('ai.configureProvider')}`);
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full border-l" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-3 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
            <Sparkles size={12} style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t('ai.panelTitle')}</span>
          <ProviderBadge provider={provider} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {messages.length > 0 && (
            <button onClick={resetChat}
              className="p-1.5 rounded transition-colors hover:bg-white/8"
              style={{ color: 'var(--text-secondary)' }}
              title={t('ai.resetChat')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          )}
          <button onClick={onOpenSettings}
            className="p-1.5 rounded transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}
            title={t('ai.providerSettings')}>
            <Settings2 size={13} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {!isConfigured && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-start gap-2.5 flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <div>
            <p className="text-[11px] font-medium" style={{ color: '#f59e0b' }}>{t('ai.apiKeyRequired')}</p>
            <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('ai.apiKeyMessage', { provider: preset.label })}{' '}
              <button onClick={onOpenSettings} className="underline hover:no-underline" style={{ color: '#f59e0b' }}>
                {t('ai.openSettings')}
              </button>{' '}
              {t('ai.switchProviderHint')}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-dim)' }}>
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('ai.title')}</p>
            <p className="text-xs leading-relaxed max-w-[190px]" style={{ color: 'var(--text-secondary)' }}>
              {t('ai.describeDefault')}
            </p>
          </div>
        )}
        {messages.map(m => <Bubble key={m.id} msg={m} onApply={onApply} />)}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center border" style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)' }}>
              <Bot size={11} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-floating)' }}>
              {[0, 150, 300].map(d => (
                <div key={d} className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--text-tertiary)', animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="px-3 pb-2 flex-shrink-0 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="px-2.5 py-1 rounded-full text-[11px] border transition-all duration-150"
              style={{ background: 'var(--surface-floating)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3 pt-2 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex gap-2 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={t('ai.placeholder')} rows={2}
            className="flex-1 px-3 py-2 text-xs rounded-xl resize-none border outline-none transition-colors"
            style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="p-2 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'var(--accent)' }}>
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--text-tertiary)' }}>{t('ai.send')}</p>
      </div>
    </div>
  );
}
