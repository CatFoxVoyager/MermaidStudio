import { useTranslation } from 'react-i18next';
import { Files, Edit, Bot } from 'lucide-react';
import type { MobileView } from '@/hooks/useMobileShell';

export interface MobileBottomNavProps {
  activeView: MobileView;
  setActiveView: (view: MobileView) => void;
  setActiveDrawer: (drawer: 'files' | 'ai') => void;
}

export function MobileBottomNav({ activeView, setActiveView, setActiveDrawer }: MobileBottomNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'files' as const, icon: Files, label: t('nav.files'), drawer: 'files' as const },
    { id: 'edit' as const, icon: Edit, label: t('nav.edit'), drawer: null },
    { id: 'ai' as const, icon: Bot, label: t('nav.ai'), drawer: 'ai' as const },
  ];

  return (
    <nav
      className="flex h-[56px] border-t bg-[var(--surface-raised)]"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {navItems.map((item) => {
        const isActive = activeView === item.id;

        return (
          <button
            key={item.id}
            data-testid={`mobile-nav-${item.id}`}
            onClick={() => {
              setActiveView(item.id);
              if (item.drawer) {
                setActiveDrawer(item.drawer);
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors hover:bg-white/5 active:bg-white/10 ${
              isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)]'
            }`}
            style={{
              borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            <item.icon size={20} strokeWidth={2} />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}