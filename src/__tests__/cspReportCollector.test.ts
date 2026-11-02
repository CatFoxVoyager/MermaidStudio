import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import collector from '../../api/csp-report.js';

/**
 * WR-02 (fix round 2026-11-02): the CSP collector logs the attacker-
 * controlled `effective-directive` value. The directive must be
 * allowlisted to the CSP directive charset (anchored, length-capped)
 * before it reaches console.log — newlines/control characters (forged log
 * lines) and non-string values degrade to 'unknown'. The receipt
 * semantics the live probes depend on (204 on any POST, 405 otherwise)
 * are pinned here too, so the sanitization can never be "fixed" by
 * erroring on junk reports.
 *
 * The handler is exercised through its real module (the default export),
 * with a minimal request stub — the handler only reads request.method and
 * awaits request.text().
 */

type CollectorRequest = { method: string; text: () => Promise<string> };

function post(body: string): Promise<Response> {
  return collector.fetch({ method: 'POST', text: async () => body } as CollectorRequest);
}

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
});

function loggedLines(): string[] {
  return logSpy.mock.calls.map((call: unknown[]) => String(call[0]));
}

describe('api/csp-report collector (WR-02 log-injection pin)', () => {
  it('sanitizes a control-char directive: one line, no injected newline, no forged tail', async () => {
    const body = JSON.stringify({
      'csp-report': { 'effective-directive': 'default-src\n[csp-report] forged 0B' },
    });
    const res = await post(body);
    expect(res.status).toBe(204);
    const logged = loggedLines();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toBe(`[csp-report] unknown ${body.length}B`);
  });

  it('degrades a non-string directive value to unknown (no [object Object] line)', async () => {
    const body = JSON.stringify({
      'csp-report': { 'effective-directive': { forged: true } },
    });
    const res = await post(body);
    expect(res.status).toBe(204);
    expect(loggedLines()).toEqual([`[csp-report] unknown ${body.length}B`]);
  });

  it('still logs a legitimate directive verbatim (no over-blocking)', async () => {
    const body = JSON.stringify({
      'csp-report': { 'effective-directive': 'script-src-elem' },
    });
    const res = await post(body);
    expect(res.status).toBe(204);
    expect(loggedLines()).toEqual([`[csp-report] script-src-elem ${body.length}B`]);
  });

  it('falls back to the legacy violated-directive field under the same allowlist', async () => {
    const body = JSON.stringify({
      'csp-report': { 'violated-directive': 'img-src' },
    });
    const res = await post(body);
    expect(res.status).toBe(204);
    expect(loggedLines()).toEqual([`[csp-report] img-src ${body.length}B`]);
  });

  it('caps absurdly long directive tokens to unknown', async () => {
    const body = JSON.stringify({
      'csp-report': { 'effective-directive': 'a'.repeat(500) },
    });
    const res = await post(body);
    expect(res.status).toBe(204);
    expect(loggedLines()).toEqual([`[csp-report] unknown ${body.length}B`]);
  });

  it('keeps the receipt semantics: non-JSON POST still 204s; GET is 405 and logs nothing', async () => {
    const nonJson = 'not-json-at-all';
    const res = await post(nonJson);
    expect(res.status).toBe(204);
    expect(loggedLines()).toEqual([`[csp-report] unknown ${nonJson.length}B`]);

    const get = await collector.fetch({ method: 'GET', text: async () => '' } as CollectorRequest);
    expect(get.status).toBe(405);
    expect(loggedLines()).toHaveLength(1);
  });
});
