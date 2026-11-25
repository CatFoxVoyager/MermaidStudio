import { useTranslation } from 'react-i18next';
import { AlertTriangle, ExternalLink, History, Sparkles, Wrench } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { SupportLinks } from '@/components/shared/SupportLinks';
import { APP_VERSION } from '@/constants/app';
import { RECENT_RELEASES, type ReleaseEntry, type ReleaseSection } from '@/utils/releaseNotes';

export const GITHUB_URL = 'https://github.com/CatFoxVoyager/MermaidStudio';
export const RELEASES_URL = `${GITHUB_URL}/releases`;
export const CHANGELOG_URL = RELEASES_URL;

export function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface Props {
  onClose: () => void;
}

type TranslateFn = ReturnType<typeof useTranslation>['t'];

function SectionBlock({
  section,
  t,
}: {
  section: ReleaseSection;
  t: TranslateFn;
}) {
  const meta =
    section.kind === 'breaking'
      ? {
          icon: AlertTriangle,
          label: t('welcome.breakingChanges', 'Breaking changes'),
          color: '#f59e0b',
        }
      : section.kind === 'features'
        ? {
            icon: Sparkles,
            label: t('welcome.features', 'Features'),
            color: 'var(--accent)',
          }
        : section.kind === 'fixes'
          ? {
              icon: Wrench,
              label: t('welcome.bugFixes', 'Bug fixes'),
              color: 'var(--text-secondary)',
            }
          : {
              icon: History,
              label: section.title,
              color: 'var(--text-secondary)',
            };
  const Icon = meta.icon;

  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
        style={{ color: meta.color }}
      >
        <Icon size={13} aria-hidden="true" />
        <span>{meta.label}</span>
      </div>
      <ul className="space-y-1 pl-1">
        {section.items.map((item, idx) => (
          <li
            key={`${item.scope ?? 'item'}-${idx}`}
            className="flex items-start gap-2 text-xs leading-relaxed"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
            <span>
              {item.scope && (
                <span
                  className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium"
                  style={{ background: 'var(--surface-overlay)', color: 'var(--text-secondary)' }}
                >
                  {item.scope}
                </span>
              )}
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReleaseSections({
  release,
  t,
}: {
  release: ReleaseEntry;
  t: TranslateFn;
}) {
  return (
    <div className="space-y-3">
      {release.sections.map(section => (
        <SectionBlock key={`${release.version}-${section.title}`} section={section} t={t} />
      ))}
    </div>
  );
}

/**
 * Release Notes modal — displays the current and recent release entries parsed
 * directly from CHANGELOG.md at build time, plus links to GitHub Releases and
 * project support. Shown automatically when the installed app version differs
 * from `seenReleaseNotesVersion` in AppSettings, or on demand from the top bar,
 * About modal, mobile menu, and command palette.
 */
export function WelcomeModal({ onClose }: Props) {
  const { t } = useTranslation();
  const [latest, ...previous] = RECENT_RELEASES;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('header.releaseNotes')}
      subtitle={`v${APP_VERSION}`}
      size="lg"
    >
      <div className="p-6 space-y-5 max-h-[calc(70vh/var(--ui-scale))] overflow-y-auto">
        {latest && (
          <div
            data-testid="release-notes-latest"
            className="rounded-xl border p-4 space-y-3"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                v{latest.version}
              </span>
              {latest.date && (
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {latest.date}
                </span>
              )}
            </div>
            <ReleaseSections release={latest} t={t} />
          </div>
        )}

        {previous.length > 0 && (
          <div className="space-y-2">
            {previous.map(rel => (
              <details
                key={rel.version}
                className="rounded-xl border px-4 py-2.5"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-base)' }}
              >
                <summary
                  className="flex cursor-pointer items-center justify-between gap-2 text-xs font-medium select-none"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>v{rel.version}</span>
                  {rel.date && (
                    <span className="tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {rel.date}
                    </span>
                  )}
                </summary>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <ReleaseSections release={rel} t={t} />
                </div>
              </details>
            ))}
          </div>
        )}

        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs transition-colors hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <History size={13} aria-hidden="true" />
          {t('welcome.allReleases', 'View all releases on GitHub')}
          <ExternalLink size={12} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        </a>

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

        <SupportLinks />
      </div>
    </Modal>
  );
}
