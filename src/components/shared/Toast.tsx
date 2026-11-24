import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '@/hooks/useToast';

const ICONS = {
  success: <CheckCircle size={13} className="text-green-400 shrink-0" />,
  error: <XCircle size={13} className="text-red-400 shrink-0" />,
  info: <Info size={13} className="text-blue-400 shrink-0" />,
};

export function Toast({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  if (!toasts.length) {return null;}
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="toast-enter pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
          text-sm font-medium min-w-[200px] max-w-sm shadow-xl border"
          style={{
            background: 'var(--surface-floating)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}>
          {ICONS[t.type]}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              type="button"
              data-testid="toast-action"
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline cursor-pointer"
              style={{ color: 'var(--accent)' }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            style={{ color: 'var(--text-tertiary)' }}
            className="shrink-0 hover:opacity-100 opacity-60 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
