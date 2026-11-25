import { useTranslation } from 'react-i18next';
import { ChevronRight, ExternalLink, ScrollText, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SupportLinks } from '@/components/shared/SupportLinks';
import { APP_VERSION } from '@/constants/app';
import { getPlayStoreBadge, PLAY_STORE_URL } from '@/constants/playStore';
import { isNativeShell } from '@/utils/platform';
import { GitHubIcon, GITHUB_URL } from './WelcomeModal';

interface Props {
  onClose: () => void;
  onShowReleaseNotes: () => void;
}

/**
 * About modal — who created MermaidStudio and why it exists.
 * Opened from the clickable version badge (workspace empty state on desktop,
 * top bar on mobile) or the command palette. The "release notes" action
 * swaps this modal for the Release Notes modal (`WelcomeModal`).
 */
export function AboutModal({ onClose, onShowReleaseNotes }: Props) {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const { src: badgeSrc, alt: badgeAlt } = getPlayStoreBadge(i18n?.language);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('about.title')}
      subtitle={`v${APP_VERSION}`}
      size="md"
      position={isMobile ? 'bottom' : 'center'}
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
          <ChevronRight size={15} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
        </button>

        {!isNativeShell() && (
          <a
            data-testid="about-android-card"
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('menu.androidTitle', 'MermaidStudio for Android')}: ${badgeAlt}`}
            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}
          >
            <span className="flex items-center gap-3 min-w-0">
              <img
                src={badgeSrc}
                alt={badgeAlt}
                className="h-9 w-auto block shrink-0"
                width={646}
                height={250}
              />
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('menu.androidTitle', 'MermaidStudio for Android')}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('menu.androidOnPlay', 'Now available on Google Play')}
                </span>
              </span>
            </span>
            <ExternalLink
              size={15}
              className="shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              aria-hidden="true"
            />
          </a>
        )}

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

        {/* PRIV-03 (phase 28): internal /privacy row — the app has no mobile
            footer, so the About modal is the mobile reachability path. Same
            row shape as the GitHub card, but internal: no target/ExternalLink. */}
        <a
          href="/privacy"
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}
        >
          <span className="flex items-center gap-2.5">
            <span style={{ color: 'var(--accent)' }}>
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('status.privacy')}
            </span>
          </span>
        </a>

        <SupportLinks />

        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {t('about.license')}
        </p>
      </div>
    </Modal>
  );
}
