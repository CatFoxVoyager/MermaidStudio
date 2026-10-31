// src/utils/idlePrefetch.ts
// Idle-scheduled fire-and-forget chunk prefetch (29-03, PERF-01/02): warms
// lazy-boundary chunks post-first-paint without ever surfacing UI. Scheduled
// on requestIdleCallback when available, setTimeout(…, 1) fallback otherwise
// (webkit has no requestIdleCallback — UI-SPEC binding: invisible, blocks no
// input, never produces a second loading surface). Rejections are swallowed:
// a failed prefetch is silent by contract (T-29-08) — a real load failure
// surfaces later through the chunk-error boundary, when the component
// actually renders.

export function idlePrefetch(loaders: Array<() => Promise<unknown>>): void {
  const run = () => {
    for (const load of loaders) {
      // Silent catch: prefetch failure must never surface UI.
      load().catch(() => {});
    }
  };
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(run);
  } else {
    setTimeout(run, 1);
  }
}
