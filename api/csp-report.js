/**
 * GA4-05 (plan 36-01): repo-owned, log-only CSP report collector.
 *
 * Browsers POST Content-Security-Policy violation reports here (the
 * Content-Security-Policy-Report-Only header in vercel.json points its
 * report-uri at this path), replacing the dead csp-report.vercel.app
 * collector.
 *
 * Log-only by design (T-36-06): one non-identifying line per report —
 * the violated directive and the byte count. The report body (which can
 * carry visitor URLs) is never echoed or persisted; reports carry no
 * diagram content and cannot be linked to a visitor.
 *
 * Zero-config Vercel function: default-exported object with an async
 * fetch(request) Web signature (plain ESM — package.json type: module).
 */
export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405 });
    }
    const body = await request.text();
    try {
      const report = JSON.parse(body)['csp-report'] ?? {};
      // WR-02 (fix round 2026-11-02): the directive value is attacker-
      // controlled — anchor-allowlist the CSP directive charset ([\w-],
      // capped at 64) before it reaches the log. Newlines/control chars,
      // oversized tokens and non-string values degrade to 'unknown' so a
      // raw-text drain cannot render forged log lines. Receipt semantics
      // (204 on any POST, 405 otherwise) are untouched.
      const raw =
        report['effective-directive'] ??
        report['violated-directive'] ??
        'unknown';
      const directive =
        typeof raw === 'string' && /^[\w-]{1,64}$/.test(raw) ? raw : 'unknown';
      console.log(`[csp-report] ${directive} ${body.length}B`);
    } catch {
      // A non-JSON probe body is still a valid receipt — log it minimally.
      console.log(`[csp-report] unknown ${body.length}B`);
    }
    return new Response(null, { status: 204 });
  },
};
