import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileUpsellBannerProps {
  featureName: string;
}

/**
 * One-line bare-text note pointing mobile users at the native app.
 * (Mobile critique iter-7 turned the original ~40% card into a bordered
 * footnote; iter-8 detector still flagged card-in-card when the host is
 * itself a full-screen bordered surface — the AI drawer — so the box is
 * gone entirely: icon + text, no border, no fill. The " — " separator also
 * fed the em-dash-overuse rule; copy now reads "{feature}: {note}".)
 */
export function MobileUpsellBanner({ featureName }: MobileUpsellBannerProps) {
  const { t } = useTranslation();
  return (
    <p className="flex items-start gap-2 py-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      <Smartphone size={16} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
      <span>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{featureName}</span>
        {': '}
        {t('common.mobileAppNote', 'Available in the mobile app, coming soon to Google Play.')}
      </span>
    </p>
  );
}
