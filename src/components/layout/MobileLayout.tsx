import type { ReactNode } from 'react';

interface MobileLayoutProps {
  theme: 'light' | 'dark';
}

export function MobileLayout({ theme }: MobileLayoutProps): ReactNode {
  return (
    <div
      className={`flex flex-col h-dvh overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
      data-testid="mobile-layout-root"
    >
      {/* TopBar slot - safe-area applied per-zone (Phase 15 fills this) */}
      <div
        className="safe-top flex h-12 items-center justify-center border-b-2 border-dashed border-[var(--accent)] bg-[var(--surface-raised)] text-xs opacity-70"
        data-testid="mobile-topbar-slot"
      >
        TopBar slot
      </div>

      {/* Workspace slot - flexible middle area (Phase 16 fills this) */}
      <div
        className="m-2 flex flex-1 items-center justify-center rounded border-2 border-dashed border-[var(--accent)] text-sm opacity-70"
        data-testid="mobile-workspace-slot"
      >
        Workspace slot
      </div>

      {/* Bottom nav slot - safe-area + z-index token (Phase 15 fills this) */}
      <div
        className="safe-bottom z-[var(--z-bottom-nav)] flex h-16 items-center justify-center border-t-2 border-dashed border-[var(--accent)] bg-[var(--surface-raised)] text-xs opacity-70"
        data-testid="mobile-bottomnav-slot"
      >
        Bottom Nav slot
      </div>
    </div>
  );
}
