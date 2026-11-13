import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';

export const LIBERAPAY_URL = 'https://liberapay.com/Jeremie/';

/**
 * Liberapay support link (audit M4: the donation path lived only in
 * the README — a site visitor could not donate). Rendered next to the GitHub
 * card in the Welcome and About modals.
 */
export function SupportLinks() {
  const { t } = useTranslation();

  const linkClass =
    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-colors hover:opacity-80';

  return (
    <div>
      <p
        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {t('support.caption')}
      </p>
      <div className="grid">
        <a
          href={LIBERAPAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--accent-dim)' }}
        >
          <Heart size={15} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('support.liberapay')}
          </span>
        </a>
      </div>
    </div>
  );
}
