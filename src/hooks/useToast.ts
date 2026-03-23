import { useState, useCallback } from 'react';
import { generateSecureId } from '@/utils/crypto';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = generateSecureId('toast');
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
