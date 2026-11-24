import { useState, useCallback, useEffect, useRef } from 'react';
import { generateSecureId } from '@/utils/crypto';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
}

export interface ShowToastOptions {
  action?: ToastAction;
  durationMs?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const show = useCallback(
    (message: string, type: ToastItem['type'] = 'success', options?: ShowToastOptions): void => {
      const id = generateSecureId('toast');
      const item: ToastItem = options?.action
        ? { id, message, type, action: options.action }
        : { id, message, type };
      setToasts((prev) => [...prev, item]);
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, options?.durationMs ?? 2500);
      timersRef.current.set(id, timer);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
