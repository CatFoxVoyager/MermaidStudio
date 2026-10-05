import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  // Capture the trigger so focus can return there on close — a dialog that
  // drops focus on BODY throws keyboard users back to the top of the page
  // (critique iter-5 P1: focus restoration).
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {return;}
    // Pull focus into the dialog on open: without it, Escape and Tab stay
    // attached to the page behind the modal (critique iter-4 P1).
    triggerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      triggerRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) {return null;}

  const sizeClass = sizeClasses[size];
  const positionClass = positionClasses[position];
  const isRightPanel = position === 'right';

  // Handle Esc key press and keep Tab cycling inside the panel (critique
  // iter-5 P1: Tab used to escape the overlay to focusable-but-hidden page
  // content behind the dialog).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab' && panelRef.current) {
      // Visibility filter is the fix for the iter-6 live failure: a hidden
      // <input type="file"> matches the selector but .focus() on it is a
      // no-op, so Tab escaped through it. Computed display works in both
      // worlds — jsdom resolves inline styles, browsers resolve stylesheets.
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => window.getComputedStyle(el).display !== 'none');
      if (focusables.length === 0) {return;}
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      // When focus sits on the panel itself (initial pull-in), Tab must move
      // INTO the cycle, not escape past it.
      if (active === panelRef.current) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex ${positionClass}`}
      onClick={(e) => {
        // Close if clicking on the wrapper (overlay area)
        if (e.target === e.currentTarget) {onClose();}
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        data-testid="modal-overlay"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-testid="modal"
        className={`relative z-50 outline-hidden ${isRightPanel ? 'w-[380px] h-full border-l rounded-none max-md:w-full max-md:border-l-0' : `w-full ${sizeClass} rounded-2xl max-md:max-w-full max-md:w-full max-md:h-full max-md:rounded-none max-md:max-h-[100dvh]`} overflow-hidden ${isRightPanel ? 'animate-slide-in-right' : 'animate-slide-up'} border shadow-2xl flex flex-col ${isRightPanel ? '' : 'max-h-[90vh]'}`}
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
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
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)] max-md:p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={t('common.close')}
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div
            className="px-5 py-4 border-t shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
