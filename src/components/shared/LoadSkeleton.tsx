// src/components/shared/LoadSkeleton.tsx
// The ONE lazy-boundary skeleton (29-02, PERF-01/02): a single 32px ring
// centered in the host cell. Presenter-only — no hooks, no i18n, no text —
// so it never competes with the app UI it precedes, and it renders zero
// geometry of its own beyond the ring: the host split cell keeps its width,
// so chunk swap-in cannot shift layout (zero CLS by construction).
// Ring tokens copy FullscreenPreview's in-app spinner verbatim (UI-SPEC
// Color: --border-strong ring, --accent top arc — the app-side echo of the
// boot splash's waiting language).
export function LoadSkeleton() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      aria-hidden="true"
      role="presentation"
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
}
