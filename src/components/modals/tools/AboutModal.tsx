import { useTranslation } from 'react-i18next';
import { ExternalLink, ScrollText } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { APP_VERSION } from '@/constants/app';
import { GitHubIcon, GITHUB_URL } from './WelcomeModal';

interface Props {
  onClose: () => void;
  onShowReleaseNotes: () => void;
}

/**
 * About modal — who created MermaidStudio and why it exists.
 * Opened from the clickable version badge (workspace empty state on desktop,
 * top bar on mobile) or the command palette. The "release notes" action
 * swaps this modal for the first-run WelcomeModal (the nag screen).
 */
export function AboutModal({ onClose, onShowReleaseNotes }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('about.title')}
      subtitle={`v${APP_VERSION}`}
      size="md"
    >
      <div className="p-6 space-y-5">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('about.why')}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {t('about.how')}
        </p>

        <button
          onClick={onShowReleaseNotes}
          className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}
        >
          <span className="flex items-center gap-2.5">
            <span style={{ color: 'var(--accent)' }}>
              <ScrollText size={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('about.releaseNotesButton')}
            </span>
          </span>
          <ExternalLink size={15} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
        </button>

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
                {t('about.github')}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('about.githubCaption')}
              </span>
            </span>
          </span>
          <ExternalLink size={15} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
        </a>

        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {t('about.license')}
        </p>
      </div>
    </Modal>
  );
}
