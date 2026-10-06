/**
 * Shared mobile-chrome interaction constants (36.1.1.1-01, audit NOUVEAU-2).
 *
 * FOCUS_RING_CLASSES embeds the keyboard focus recipe already shipped on the
 * FilesFab button (the D-3 reference): hide the default outline and paint an
 * accent ring on keyboard focus only. It is applied to every mobile
 * interactive chrome family (topbar actions, workspace segments, sheet rows,
 * FAB menu items, folder-picker close, preview toolbar) so each one shows a
 * visible focus indicator. focus-visible never paints on touch or mouse
 * input, so resting-state pixels stay unchanged on every baseline viewport.
 */
export const FOCUS_RING_CLASSES =
  'outline-hidden focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring-color)] focus-visible:ring-offset-2';
