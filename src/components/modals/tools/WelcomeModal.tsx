import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  Smartphone,
  MousePointerClick,
  ShieldCheck,
  Wrench,
  Square,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { APP_VERSION } from '@/constants/app';

const GITHUB_URL = 'https://github.com/CatFoxVoyager/MermaidStudio';

function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface Props {
  onClose: () => void;
}

/**
 * First-run / release-notes modal.
 * Shown automatically when the installed app version differs from the one the
 * user has already seen (tracked via `seenReleaseNotesVersion` in AppSettings).
 * The X close button is provided natively by the shared `Modal` component.
 */
export function WelcomeModal({ onClose }: Props) {
  const { t } = useTranslation();

  const releaseNotes = [
    { icon: Smartphone, key: 'mobile' as const },
    { icon: MousePointerClick, key: 'visualMobile' as const },
    { icon: Square, key: 'touch' as const },
    { icon: ShieldCheck, key: 'safeArea' as const },
    { icon: Wrench, key: 'diagramFix' as const },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('welcome.title')}
      subtitle={`v${APP_VERSION}`}
      size="lg"
    >
      <div className="p-6 space-y-5">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('welcome.intro')}
        </p>

        <div>
          <h4
            className="text-[10px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {t('welcome.whatsNew')}
          </h4>
          <ul className="space-y-2.5">
            {releaseNotes.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  <Icon size={14} />
                </span>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {t(`welcome.releaseNotes.${key}`)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('welcome.moreInChangelog')}
          </p>
        </div>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}
        >
          <span className="flex items-center gap-2.5">
            <span style={{ color: 'var(--accent)' }}>
              <GitHubIcon size={18} />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('welcome.github')}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('welcome.githubCaption')}
              </span>
            </span>
          </span>
          <ExternalLink size={15} style={{ color: 'var(--text-secondary)' }} />
        </a>
      </div>
    </Modal>
  );
}
