import { useTranslation } from 'react-i18next';
import { Files, Edit, Bot } from 'lucide-react';
import type { MobileView } from '@/hooks/useMobileShell';

export interface MobileBottomNavProps {
  activeView: MobileView;
  setActiveView: (view: MobileView) => void;
}

export function MobileBottomNav({ activeView, setActiveView }: MobileBottomNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'files' as const, icon: Files, label: t('nav.files') },
    { id: 'edit' as const, icon: Edit, label: t('nav.edit') },
    { id: 'ai' as const, icon: Bot, label: t('nav.ai') },
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
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
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