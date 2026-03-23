import { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: ReactNode;
  subtitle?: string;
  position?: 'center' | 'right';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

const positionClasses = {
  center: 'items-center justify-center',
  right: 'items-end justify-end',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  subtitle,
  position = 'center',
}: ModalProps) {
  if (!isOpen) {return null;}

  const sizeClass = sizeClasses[size];
  const positionClass = positionClasses[position];
  const isRightPanel = position === 'right';

  return (
    <div
      className={`fixed inset-0 z-50 flex ${positionClass}`}
      onClick={(e) => {
        // Close if clicking on the wrapper (overlay area)
        if (e.target === e.currentTarget) {onClose();}
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        data-testid="modal-overlay"
        onClick={onClose}
      />
      <div
        className={`relative z-50 ${isRightPanel ? 'w-[380px] h-full border-l rounded-none' : `w-full ${sizeClass} rounded-2xl`} overflow-hidden ${isRightPanel ? 'animate-slide-in-right' : 'animate-slide-up'} border shadow-2xl flex flex-col ${isRightPanel ? '' : 'max-h-[90vh]'}`}
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h3
              id="modal-title"
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div
            className="px-5 py-4 border-t flex-shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
