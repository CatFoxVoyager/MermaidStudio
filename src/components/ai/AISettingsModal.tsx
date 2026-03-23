import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, ChevronDown, Eye, EyeOff, Wifi, WifiOff, Server, Globe, RefreshCw } from 'lucide-react';
import { PROVIDER_PRESETS, getPreset, testConnection, fetchModels } from '@/services/ai/providers';
import { getSettings, updateSettings } from '@/services/storage/database';
import { Modal } from '@/components/shared/Modal';
import type { AIProvider } from '@/types';

interface Props {
  onClose: () => void;
}

export function AISettingsModal({ onClose }: Props) {
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [modelDropOpen, setModelDropOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const preset = getPreset(provider);
  const modelInputRef = useRef<HTMLDivElement>(null);
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  const previousProviderRef = useRef<AIProvider | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load settings asynchronously
  useEffect(() => {
    // Reset on component mount
    isInitialLoadRef.current = true;
    previousProviderRef.current = null;

    getSettings().then(settings => {
      const loadedProvider = settings.ai_provider ?? 'openai';
      setProvider(loadedProvider);
      setApiKey(settings.ai_api_key ?? '');
      setBaseUrl(settings.ai_base_url ?? '');
      setModel(settings.ai_model ?? '');
      setLoading(false);
      // Mark initial load complete and set previous provider
      isInitialLoadRef.current = false;
      previousProviderRef.current = loadedProvider;
    });
  }, []);

  useEffect(() => {
    // Skip during initial load or if provider hasn't actually changed
    if (isInitialLoadRef.current || previousProviderRef.current === provider) {
      previousProviderRef.current = provider;
      return;
    }

    const p = getPreset(provider);
    setBaseUrl(p.baseUrl);
    setModel(p.defaultModel);
    setTestResult(null);
    setFetchedModels(null);
    previousProviderRef.current = provider;
  }, [provider]);

  async function handleFetchModels() {
    setFetchingModels(true);
    setTestResult(null);
    try {
      const models = await fetchModels(provider, baseUrl);
      setFetchedModels(models);
      if (models.length > 0) {
        if (!models.includes(model)) {
          setModel(models[0]);
        }
        // Auto-open dropdown to show fetched models
        const rect = modelInputRef.current?.getBoundingClientRect() ?? null;
        setDropRect(rect);
        setModelDropOpen(true);
        setTestResult({ ok: true, message: `Found ${models.length} model${models.length > 1 ? 's' : ''}` });
      } else {
        setTestResult({ ok: false, message: 'No models found' });
      }
    } catch (error) {
      setTestResult({ ok: false, message: error instanceof Error ? error.message : 'Failed to fetch models' });
    } finally {
      setFetchingModels(false);
    }
  }

  function handleProviderChange(p: AIProvider) {
    setProvider(p);
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection({ provider, apiKey, baseUrl, model });
    setTestResult(result);
    setTesting(false);
  }

  async function handleSave() {
    await updateSettings({ ai_provider: provider, ai_api_key: apiKey, ai_base_url: baseUrl, ai_model: model });
    onClose();
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button onClick={handleTest} disabled={testing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150 disabled:opacity-50"
        style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
        {testing
          ? <Loader2 size={12} className="animate-spin" />
          : <Wifi size={12} />
        }
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      <div className="flex items-center gap-2">
        <button onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium border transition-all"
          style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
          Cancel
        </button>
        <button onClick={handleSave}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}>
          Save Settings
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title="AI Provider Settings" subtitle="Configure your AI model provider — settings are saved in your browser" size="lg" footer={footer}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="p-5 space-y-5 overflow-y-auto overflow-x-visible max-h-[calc(100vh-200px)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
              style={{ color: 'var(--text-tertiary)' }}>Provider</p>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDER_PRESETS.map(p => (
                <button key={p.id} onClick={() => handleProviderChange(p.id)}
                  className="relative flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all duration-150"
                  style={{
                    background: provider === p.id ? 'var(--accent-dim)' : 'var(--surface-base)',
                    borderColor: provider === p.id ? 'var(--accent)' : 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}>
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-xs font-medium leading-tight">{p.label}</span>
                    {!p.requiresKey && (
                      <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--success-dim, rgba(34,197,94,0.15))', color: '#22c55e' }}>
                        Local
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-tight line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                    {p.description}
                  </span>
                  {provider === p.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--accent)' }}>
                      <Check size={9} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1.5">
                  <Globe size={11} /> Base URL
                </span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => { setBaseUrl(e.target.value); setTestResult(null); }}
                placeholder={preset.baseUrl}
                className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-mono transition-colors"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Server size={11} /> Model
                  </span>
                  <button
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="flex items-center gap-1 text-[10px] font-medium transition-colors disabled:opacity-50 hover:text-white/80"
                    style={{ color: 'var(--accent)' }}
                    title="Fetch available models from API">
                    {fetchingModels
                      ? <Loader2 size={10} className="animate-spin" />
                      : <RefreshCw size={10} />
                    }
                    {fetchingModels ? 'Fetching...' : 'Fetch Models'}
                  </button>
                </span>
              </label>
              {(provider === 'lmstudio' || provider === 'ollama') && (
                <p className="text-[9px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  💡 If fetch doesn't work due to CORS, type your model name manually (e.g., <code className="px-1 py-0.5 rounded" style={{ background: 'var(--surface-base)' }}>lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF</code>)
                </p>
              )}
              <div className="relative" ref={modelInputRef}>
                <input
                  type="text"
                  value={model}
                  onChange={e => { setModel(e.target.value); setTestResult(null); }}
                  placeholder={preset.defaultModel}
                  className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-mono transition-colors pr-8"
                  style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
                {(preset.models.length > 0 || (fetchedModels && fetchedModels.length > 0)) && (
                  <button
                    onClick={() => {
                      const rect = modelInputRef.current?.getBoundingClientRect() ?? null;
                      setDropRect(rect);
                      setModelDropOpen(v => !v);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors hover:bg-white/10"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <ChevronDown size={12} className={`transition-transform ${modelDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
                {modelDropOpen && (preset.models.length > 0 || (fetchedModels && fetchedModels.length > 0)) && dropRect && (
                  <div
                    className="fixed rounded-xl border shadow-xl z-[200] overflow-hidden"
                    style={{
                      background: 'var(--surface-floating)',
                      borderColor: 'var(--border-subtle)',
                      top: dropRect.bottom + 4,
                      left: dropRect.left,
                      width: dropRect.width,
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}>
                    {(fetchedModels ?? preset.models).map(m => (
                      <button key={m} onClick={() => { setModel(m); setModelDropOpen(false); setTestResult(null); }}
                        className="w-full px-3 py-2 text-left text-xs font-mono transition-colors hover:bg-white/8 flex items-center justify-between"
                        style={{ color: 'var(--text-primary)' }}>
                        {m}
                        {model === m && <Check size={11} style={{ color: 'var(--accent)' }} />}
                      </button>
                    ))}
                    {fetchedModels && fetchedModels.length > 0 && (
                      <div className="border-t px-3 py-1.5 text-[9px] text-center" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                        {fetchedModels.length} models from API
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {preset.requiresKey && (
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-tertiary)' }}>API Key</label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
                    placeholder={preset.keyPlaceholder}
                    className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-mono transition-colors pr-9"
                    style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
                  />
                  <button onClick={() => setShowKey(v => !v)}
                    className="absolute right-2.5 p-0.5 rounded transition-colors hover:bg-white/10"
                    style={{ color: 'var(--text-tertiary)' }}>
                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {testResult && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{
                background: testResult.ok
                  ? 'rgba(34,197,94,0.1)'
                  : 'rgba(239,68,68,0.1)',
                color: testResult.ok ? '#22c55e' : '#ef4444',
              }}>
              {testResult.ok
                ? <Wifi size={13} />
                : <WifiOff size={13} />
              }
              {testResult.message}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
