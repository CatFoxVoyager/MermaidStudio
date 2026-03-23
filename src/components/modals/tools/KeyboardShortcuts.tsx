import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/shared/Modal';

interface Props {
  onClose: () => void;
}

export function KeyboardShortcuts({ onClose }: Props) {
  const { t } = useTranslation();

  const GROUPS = [
    {
      title: t('shortcuts.general'),
      shortcuts: [
        { keys: 'Ctrl+N', desc: t('shortcuts.newDiagram') },
        { keys: 'Ctrl+S', desc: t('shortcuts.saveDiagram') },
        { keys: 'Ctrl+K', desc: t('shortcuts.commandPalette') },
        { keys: 'Ctrl+T', desc: t('shortcuts.templateLibrary') },
        { keys: 'Ctrl+E', desc: t('shortcuts.exportShare') },
        { keys: '?', desc: t('shortcuts.showShortcuts') },
      ],
    },
    {
      title: t('shortcuts.editor'),
      shortcuts: [
        { keys: 'Ctrl+F', desc: t('shortcuts.focusSearch') },
        { keys: 'Tab', desc: t('shortcuts.indentLine') },
        { keys: 'Shift+Tab', desc: t('shortcuts.unindentLine') },
        { keys: 'Ctrl+Z', desc: t('shortcuts.undo') },
        { keys: 'Ctrl+Shift+Z', desc: t('shortcuts.redo') },
        { keys: 'Ctrl+D', desc: t('shortcuts.selectNext') },
      ],
    },
    {
      title: t('shortcuts.panels'),
      shortcuts: [
        { keys: 'Ctrl+/', desc: t('shortcuts.aiPanel') },
        { keys: 'Ctrl+B', desc: t('shortcuts.toggleSidebar') },
        { keys: 'Ctrl+Shift+F', desc: t('shortcuts.focusMode') },
        { keys: 'F11', desc: t('shortcuts.fullscreen') },
      ],
    },
    {
      title: t('shortcuts.preview'),
      shortcuts: [
        { keys: '+', desc: t('shortcuts.zoomIn') },
        { keys: '-', desc: t('shortcuts.zoomOut') },
        { keys: '0', desc: t('shortcuts.resetZoom') },
        { keys: 'Esc', desc: t('shortcuts.closeModal') },
      ],
    },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title={t('shortcuts.title')} size="lg">
      <div className="p-6 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
        {GROUPS.map(g => (
          <div key={g.title}>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
              {g.title}
            </h3>
            <div className="space-y-1.5">
              {g.shortcuts.map(s => (
                <div key={s.keys} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
                  <kbd className="ml-2 flex-shrink-0">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
