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
  position?: 'center' | 'right' | 'bottom';
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
  bottom: 'items-end justify-center',
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
  const isBottomPanel = position === 'bottom';

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
        className={`relative z-50 outline-hidden overflow-hidden border shadow-2xl flex flex-col ${
          isRightPanel
            ? 'w-[380px] h-full border-l rounded-none max-md:w-full max-md:border-l-0 animate-slide-in-right'
            : isBottomPanel
              ? 'w-full max-w-lg rounded-t-[24px] rounded-b-none border-t border-x max-h-[85vh] animate-slide-up safe-bottom'
              : `w-full ${sizeClass} rounded-2xl max-md:max-w-full max-md:w-full max-md:h-full max-md:rounded-none max-md:max-h-[100dvh] max-h-[90vh] animate-slide-up`
        }`}
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${isBottomPanel ? 'relative' : ''}`}
          style={{ borderColor: 'var(--border-subtle)' }}
          onPointerDown={isBottomPanel ? (e) => {
            // Swipe-down dismissal for bottom sheets (iter-11 P2: X/scrim
            // only — Escape is meaningless on touch and bottom-sheet
            // convention expects a downward drag). Track only while the
            // gesture starts on the sheet header; threshold 110px.
            if (e.pointerType === 'mouse' && e.button !== 0) {return;}
            const startY = e.clientY;
            const panel = panelRef.current;
            let dismissed = false;
            const move = (ev: PointerEvent) => {
              const dy = ev.clientY - startY;
              if (dy > 0 && panel) {panel.style.transform = `translateY(${dy}px)`;}
              if (dy > 110) {dismissed = true;}
            };
            const up = (ev: PointerEvent) => {
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', up);
              const dy = ev.clientY - startY;
              if (panel) {panel.style.transform = '';}
              if (dismissed || dy > 110) {onClose();}
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
          } : undefined}
        >
          {isBottomPanel && (
            <span
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full"
              style={{ background: 'var(--border-strong)', cursor: 'grab' }}
            />
          )}
          <div>
            {/* h2, not h3: the app's only h1 is the topbar wordmark, so a
                modal titled h3 skipped a heading level by construction
                (detector `skipped-heading`, mobile critique iter-7). */}
            <h2
              id="modal-title"
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover)] max-md:p-2 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            style={{ color: 'var(--text-secondary)' }}
            aria-label={t('common.close')}
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll-contain">{children}</div>

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
