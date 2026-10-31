import { describe, it, expect, vi, afterEach } from 'vitest';
import { idlePrefetch } from '../idlePrefetch';

// jsdom has no requestIdleCallback — the same webkit/jsdom shape the
// setTimeout(1) fallback targets (UI-SPEC binding).
describe('idlePrefetch (invisible idle-scheduled chunk prefetch)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  it('schedules via setTimeout(1) and runs every loader when requestIdleCallback is absent', async () => {
    vi.useFakeTimers();
    const loaders = [
      vi.fn().mockResolvedValue(undefined),
      vi.fn().mockResolvedValue(undefined),
    ];
    idlePrefetch(loaders);
    // Never synchronous: idle-scheduled post-first-paint.
    expect(loaders[0]).not.toHaveBeenCalled();
    expect(loaders[1]).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(loaders[0]).toHaveBeenCalledTimes(1);
    expect(loaders[1]).toHaveBeenCalledTimes(1);
  });

  it('prefers requestIdleCallback when available (no timer fallback double-run)', () => {
    vi.useFakeTimers();
    const ric = vi.fn((cb: () => void) => { cb(); return 1; });
    (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback = ric;
    const load = vi.fn().mockResolvedValue(undefined);
    idlePrefetch([load]);
    expect(ric).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    // The setTimeout fallback must not also have scheduled a second run.
    vi.advanceTimersByTime(50);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('swallows loader rejections and still runs the remaining loaders', async () => {
    vi.useFakeTimers();
    const failing = vi.fn().mockRejectedValue(new Error('prefetch failed'));
    const healthy = vi.fn().mockResolvedValue(undefined);
    idlePrefetch([failing, healthy]);
    await vi.advanceTimersByTimeAsync(1);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it('renders nothing and touches no DOM', () => {
    const before = document.body.innerHTML;
    idlePrefetch([vi.fn().mockResolvedValue(undefined)]);
    expect(document.body.innerHTML).toBe(before);
  });
});
