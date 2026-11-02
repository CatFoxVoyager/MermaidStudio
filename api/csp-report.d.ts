/**
 * Types for api/csp-report.js — the untyped plain-ESM Vercel function
 * (zero-config, no build step). Only the surface the repo reads is
 * declared: the Web-signature fetch handler taking a request-like object
 * (method + text()) and returning a platform Response. This lets src
 * tests pin the collector without enabling allowJs repo-wide; at runtime
 * vitest resolves the real .js module.
 */
declare const collector: {
  fetch(request: { method: string; text: () => Promise<string> }): Promise<Response>;
};

export default collector;
