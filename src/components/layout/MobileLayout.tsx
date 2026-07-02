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
      {/* TopBar slot - safe-area applied per-zone */}
      <div className="safe-top" data-testid="mobile-topbar-slot" />

      {/* Workspace slot - no safe-area needed */}
      <div data-testid="mobile-workspace-slot" />

      {/* Bottom nav slot - safe-area + z-index token */}
      <div className="safe-bottom z-[var(--z-bottom-nav)]" data-testid="mobile-bottomnav-slot" />
    </div>
  );
}
