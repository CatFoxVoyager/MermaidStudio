import { useState, useEffect } from 'react';
import { Check, Loader2, Cpu, Download, Trash2, Wifi, WifiOff, Lock } from 'lucide-react';
import {
  getMachineOptions,
  checkWebGPUSupport,
  isModelLoaded,
  loadModel,
  unloadModel,
  testConnection,
} from '@/services/ai/providers';
import { getSettings, updateSettings } from '@/services/storage/database';
import { Modal } from '@/components/shared/Modal';
import type { MachineSize } from '@/types';

interface Props {
  onClose: () => void;
}

export function AISettingsModal({ onClose }: Props) {
  const [machineSize, setMachineSize] = useState<MachineSize>('low');
  const [loading, setLoading] = useState(true);
  const [webgpuStatus, setWebgpuStatus] = useState<
    'checking' | 'supported' | 'unsupported' | 'loaded' | 'loading'
  >('checking');
  const [webgpuLoadProgress, setWebgpuLoadProgress] = useState(0);
  const [webgpuMessage, setWebgpuMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    getSettings().then(settings => {
      setMachineSize(settings.ai_machine_size ?? 'low');
      setLoading(false);
    });

    checkWebGPUSupport().then(result => {
      if (result.supported) {
        setWebgpuStatus(isModelLoaded() ? 'loaded' : 'supported');
      } else {
        setWebgpuStatus('unsupported');
        setWebgpuMessage(result.reason ?? '');
      }
    });
  }, []);

  async function handleLoad() {
    if (webgpuStatus === 'loading') return;
    setWebgpuStatus('loading');
    setWebgpuLoadProgress(0);
    try {
      await loadModel(machineSize, p => {
        setWebgpuLoadProgress(Math.round(p.progress * 100));
        setWebgpuMessage(p.text);
      });
      setWebgpuStatus('loaded');
      setWebgpuMessage('');
    } catch (e) {
      setWebgpuStatus('supported');
      setWebgpuMessage(e instanceof Error ? e.message : 'Failed to load model');
    }
  }

  async function handleUnload() {
    await unloadModel();
    setWebgpuStatus('supported');
    setWebgpuMessage('');
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(machineSize);
    setTestResult(result);
    setTesting(false);
  }

  async function handleSave() {
    await updateSettings({
      ai_machine_size: machineSize,
    });
    onClose();
  }

  const machineOptions = getMachineOptions();

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={handleTest}
        disabled={testing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150 disabled:opacity-50"
        style={{
          background: 'var(--surface-base)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
        {testing ? 'Checking...' : 'Check WebGPU'}
      </button>
      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium border transition-all"
          style={{
            background: 'var(--surface-base)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="AI Model Settings"
      subtitle="Choose a model that runs locally in your browser via WebGPU"
      size="lg"
      footer={footer}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <div className="p-5 space-y-5 overflow-y-auto overflow-x-visible max-h-[calc(100vh-200px)]">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Machine Size
            </p>
            <div className="grid grid-cols-2 gap-3">
              {machineOptions.map(opt => (
                <button
                  key={opt.size}
                  onClick={async () => {
                    if (opt.available && opt.size !== machineSize) {
                      await unloadModel();
                      setWebgpuStatus('supported');
                      setWebgpuMessage('');
                      setMachineSize(opt.size);
                      setTestResult(null);
                    }
                  }}
                  className="relative flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-150"
                  style={{
                    background:
                      machineSize === opt.size ? 'var(--accent-dim)' : 'var(--surface-base)',
                    borderColor:
                      machineSize === opt.size ? 'var(--accent)' : 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    opacity: opt.available ? 1 : 0.5,
                    cursor: opt.available ? 'pointer' : 'not-allowed',
                  }}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <Cpu size={13} style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                    {!opt.available && (
                      <span
                        className="ml-auto flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(107,114,128,0.15)', color: '#9ca3af' }}
                      >
                        <Lock size={8} />
                        Coming Soon
                      </span>
                    )}
                    {opt.available && machineSize === opt.size && (
                      <div
                        className="ml-auto w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span
                    className="text-[10px] leading-relaxed"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-3.5 space-y-2.5"
            style={{
              background:
                webgpuStatus === 'unsupported' ? 'rgba(239,68,68,0.05)' : 'var(--surface-base)',
              borderColor:
                webgpuStatus === 'unsupported' ? 'rgba(239,68,68,0.2)' : 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                WebGPU Model Status
              </span>
              {webgpuStatus === 'loaded' && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                >
                  Loaded & Ready
                </span>
              )}
              {webgpuStatus === 'supported' && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
                >
                  Ready to Load
                </span>
              )}
              {webgpuStatus === 'loading' && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                >
                  Loading... {webgpuLoadProgress}%
                </span>
              )}
              {webgpuStatus === 'checking' && (
                <Loader2
                  size={12}
                  className="animate-spin"
                  style={{ color: 'var(--text-tertiary)' }}
                />
              )}
            </div>

            {webgpuStatus === 'loading' && (
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--surface-floating)' }}
              >
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{ width: `${webgpuLoadProgress}%`, background: 'var(--accent)' }}
                />
              </div>
            )}

            {webgpuMessage && webgpuStatus !== 'loaded' && (
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {webgpuMessage}
              </p>
            )}

            {webgpuStatus === 'unsupported' && (
              <p className="text-[10px] leading-relaxed" style={{ color: '#ef4444' }}>
                {webgpuMessage}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {webgpuStatus === 'supported' && (
                <button
                  onClick={handleLoad}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  <Download size={10} />
                  Load Model
                </button>
              )}
              {webgpuStatus === 'loaded' && (
                <button
                  onClick={handleUnload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all"
                  style={{
                    background: 'var(--surface-floating)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Trash2 size={10} />
                  Unload Model
                </button>
              )}
            </div>
          </div>

          {testResult && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{
                background: testResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: testResult.ok ? '#22c55e' : '#ef4444',
              }}
            >
              {testResult.ok ? <Wifi size={13} /> : <WifiOff size={13} />}
              {testResult.message}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
