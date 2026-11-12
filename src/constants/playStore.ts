/**
 * Official Google Play listing URL — the single shared constant for every
 * promo surface (menu-sheet card, banner, future consumers).
 *
 * developer.android.com/distribute/marketing-tools/linking-to-google-play
 * (fetched 2026-11-01): the web listing format is
 * `https://play.google.com/store/apps/details?id=<package_name>`;
 * `market://` is documented only for native Intents / Instant launch.
 * Plain https only — never `market://` from the web layer (locked decision).
 */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mermaidstudio.net';

export function getPlayStoreBadge(language?: string): { src: string; alt: string } {
  const isFr = language?.startsWith('fr') ?? false;
  return {
    src: `/badges/google-play-badge-${isFr ? 'fr' : 'en'}.png`,
    alt: isFr ? 'Obtenir MermaidStudio sur Google Play' : 'Get MermaidStudio on Google Play',
  };
}
