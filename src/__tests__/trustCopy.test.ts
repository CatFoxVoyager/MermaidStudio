import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) — same convention as buildTarget.test.ts.
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Trust-copy fs gates (PRIV-01 static half + REDIR-01/02 config pins).
 *
 * The public trust statements (PRIVACY.md, the served /privacy page) and the
 * edge routing config (vercel.json) are trust surfaces: privacy claims must
 * match what actually runs (Vercel Analytics + Speed Insights ARE mounted),
 * and the vercel.json headers array carries the COOP/COEP pair that WebGPU
 * cross-origin isolation depends on — a headers regression there silently
 * breaks the AI feature. These gates read the source bytes directly.
 */
const privacyMd = readFileSync(resolve(__dirname, '../../PRIVACY.md'), 'utf8');
const privacyHtmlPath = resolve(__dirname, '../../public/privacy.html');
const privacyHtml: string | null = existsSync(privacyHtmlPath)
  ? readFileSync(privacyHtmlPath, 'utf8')
  : null;

const ANALYTICS_SECTION =
  'The public website measures aggregate, anonymous usage with Vercel Analytics and Vercel Speed Insights: page views, referrers, and coarse geography.';
const AMENDED_SHORT_VERSION =
  "We run no accounts and no servers. The public website uses Vercel's cookieless analytics (see Analytics below).";
const STALE_SHORT_VERSION =
  'We run no accounts, no servers, and no analytics of our own.';
const AMENDED_NEVER_DO =
  'We have no access to your diagrams or settings. (Aggregate, anonymous site metrics are covered in Analytics above.)';

describe('PRIVACY.md amendments (PRIV-01)', () => {
  it('adds the Analytics (web) section disclosing Vercel Analytics + Speed Insights', () => {
    expect(
      privacyMd.includes('## Analytics (web)'),
      'PRIV-01: PRIVACY.md must gain the "## Analytics (web)" section — web analytics run (App.tsx mounts <Analytics/> + <SpeedInsights/>) and must be disclosed',
    ).toBe(true);
    expect(
      privacyMd.includes(ANALYTICS_SECTION),
      'PRIV-01: the Analytics (web) section must carry the contracted aggregate/anonymous/cookieless disclosure',
    ).toBe(true);
  });

  it('replaces the falsified "no analytics of our own" short-version sentence', () => {
    expect(
      privacyMd.includes(STALE_SHORT_VERSION),
      'PRIV-01: the pre-amendment short version falsely denies analytics — it must be replaced',
    ).toBe(false);
    expect(
      privacyMd.includes(AMENDED_SHORT_VERSION),
      'PRIV-01: the short version must disclose the cookieless web analytics',
    ).toBe(true);
  });

  it('amends the never-do third bullet with the aggregate-metrics pointer', () => {
    expect(
      privacyMd.includes(AMENDED_NEVER_DO),
      'PRIV-01: the "What we never do" third bullet must carry the aggregate-metrics parenthetical',
    ).toBe(true);
  });

  it('bumps the Last updated date for the amendment', () => {
    expect(
      privacyMd,
      'PRIV-01: the Last updated date must be bumped when the policy changes',
    ).toMatch(/\*\*Last updated:\*\* 2026-10-30/);
  });
});

describe('public/privacy.html page contract (PRIV-01 static half)', () => {
  it('exists at public/privacy.html (cleanUrls serves it at /privacy)', () => {
    expect(
      privacyHtml,
      'PRIV-01: public/privacy.html is missing — the /privacy page must be published',
    ).not.toBeNull();
  });

  it('head contract: lang, title, meta description, canonical, indexable', () => {
    const page = privacyHtml!;
    expect(page).toContain('<html lang="en">');
    expect(page).toContain('<title>Privacy Policy — MermaidStudio</title>');
    expect(
      page.includes(
        '<meta name="description" content="MermaidStudio privacy policy: local-first diagrams, local WebGPU AI, Vercel cookieless analytics on the web, AdMob ads only in the Android app.">',
      ),
      'PRIV-01: the contracted meta description (<= 155 chars) is required',
    ).toBe(true);
    expect(
      page.includes('rel="canonical" href="https://www.mermaidstudio.net/privacy"'),
      'PRIV-01: the page must carry a canonical URL',
    ).toBe(true);
    expect(
      page.includes('noindex'),
      'PRIV-01: the privacy page must stay indexable (no noindex)',
    ).toBe(false);
  });

  it('carries the h1 and exactly the 8 contracted h2 sections', () => {
    const page = privacyHtml!;
    expect(page).toContain('<h1>Privacy Policy</h1>');
    const sections = [
      'The short version',
      'Data storage (web and Android)',
      'AI features (web)',
      'Analytics (web)',
      'Ads (Android only)',
      'What we never do',
      'Changes to this policy',
      'Contact',
    ];
    for (const title of sections) {
      expect(
        page.includes(`<h2>${title}</h2>`),
        `PRIV-01: privacy page is missing the section "${title}"`,
      ).toBe(true);
    }
    const h2Count = (page.match(/<h2/g) ?? []).length;
    expect(
      h2Count,
      `PRIV-01: the privacy page must carry exactly 8 h2 sections (got ${h2Count})`,
    ).toBe(8);
  });

  it('stays zero-JS and zero-external-request (T-28-04)', () => {
    const page = privacyHtml!;
    expect(
      page.includes('<script'),
      'T-28-04: the privacy page must contain zero <script> tags',
    ).toBe(false);
    expect(
      page.includes('@import'),
      'T-28-04: the privacy page must not fetch CSS via @import',
    ).toBe(false);
    expect(
      page.includes('url(http'),
      'T-28-04: the privacy page must not fetch external resources via url(...)',
    ).toBe(false);
    const links = page.match(/<link\b[^>]*>/g) ?? [];
    expect(
      links.length,
      `T-28-04: the only <link> allowed is the canonical one (found ${links.length})`,
    ).toBe(1);
    expect(links[0]).toContain('rel="canonical"');
  });

  it('mirrors the amended policy content (Analytics disclosure present)', () => {
    const page = privacyHtml!;
    expect(page).toContain(ANALYTICS_SECTION);
    expect(page).toContain('← Back to MermaidStudio');
  });
});

// PRIV-02 React-tier inputs (plan 28-02): the i18n catalogs are trust
// surfaces too — absolute-telemetry claims in the app copy misstate what
// actually runs (Vercel cookieless analytics ARE mounted), and the crawler
// shell (index.html) must never regain the banned phrasing.
const enCatalog = readFileSync(resolve(__dirname, '../../src/i18n/locales/en.json'), 'utf8');
const frCatalog = readFileSync(resolve(__dirname, '../../src/i18n/locales/fr.json'), 'utf8');
const indexHtml = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

const BANNED_PHRASES = ['no telemetry', 'no tracking', 'sans télémétrie', 'sans suivi', 'nothing is sent', "rien n'est envoyé", 'no server', 'everything stays on your device'] as const;
// WR-02 (fix round 2026-10-31): the two added literals close the shell's
// absolute no-server/everything-stays denials — index.html discloses Vercel
// cookieless analytics in its Privacy section, so those absolutes are
// falsified on the same page. The census covers the claim class, not the
// surfaces the review happened to quote.
// The two added literals close the WR-01 blind spot: welcome.intro carried the
// same absolute-denial claim class the first four banned strings missed, so
// the census must cover the class, not the instances it happened to list.

describe('PRIV-02 honesty copy (i18n catalogs + served shell)', () => {
  it('carries zero absolute-telemetry claims across en.json, fr.json and index.html', () => {
    const sources = [
      ['en.json', enCatalog],
      ['fr.json', frCatalog],
      ['index.html', indexHtml],
    ] as const;
    for (const phrase of BANNED_PHRASES) {
      for (const [name, source] of sources) {
        // split-count never returns null (String.match does at zero) — the
        // same zero-normalized guarantee the ?? 0 form gives, without regex.
        const count = source.split(phrase).length - 1;
        expect(
          count,
          `PRIV-02: "${phrase}" appears ${count}x in ${name} — the site runs Vercel cookieless analytics, so absolute no-telemetry/no-tracking claims are falsified`,
        ).toBe(0);
      }
    }
  });

  it('adds header.appHeading and status.privacy as non-empty strings in BOTH catalogs', () => {
    const catalogs = [
      ['en', JSON.parse(enCatalog) as { header?: Record<string, unknown>; status?: Record<string, unknown> }],
      ['fr', JSON.parse(frCatalog) as { header?: Record<string, unknown>; status?: Record<string, unknown> }],
    ] as const;
    for (const [name, cat] of catalogs) {
      const appHeading = cat.header?.appHeading;
      const privacy = cat.status?.privacy;
      expect(
        typeof appHeading === 'string' && appHeading.length > 0,
        `PRIV-02/HEAD-01: header.appHeading must exist as a non-empty string in ${name}.json (the sr-only app h1 binds it)`,
      ).toBe(true);
      expect(
        typeof privacy === 'string' && privacy.length > 0,
        `PRIV-03: status.privacy must exist as a non-empty string in ${name}.json (the footer + About privacy links bind it)`,
      ).toBe(true);
    }
  });

  it('carries the exact UI-SPEC replacement strings verbatim in both languages', () => {
    const en = JSON.parse(enCatalog) as Record<string, Record<string, string>>;
    const fr = JSON.parse(frCatalog) as Record<string, Record<string, string>>;
    expect(
      en.welcome.valueProp3,
      'PRIV-02: en.welcome.valueProp3 must carry the approved cookieless-analytics wording',
    ).toBe('Free & private — open source (MIT), no accounts, local-first, cookieless analytics, works offline.');
    expect(
      fr.welcome.valueProp3,
      'PRIV-02: fr.welcome.valueProp3 must carry the approved cookieless-analytics wording',
    ).toBe('Gratuit & privé — open source (MIT), sans compte, local-first, analytique sans cookies, fonctionne hors ligne.');
    expect(
      en.about.how,
      'PRIV-02: en.about.how must carry the approved cookieless-analytics wording',
    ).toBe('The app runs entirely in your browser — diagrams and settings stay on your device (local storage), and even the AI assistant runs locally via WebGPU. Free, open source, with cookieless analytics only.');
    expect(
      fr.about.how,
      'PRIV-02: fr.about.how must carry the approved cookieless-analytics wording',
    ).toBe('L\'application fonctionne entièrement dans votre navigateur — diagrammes et réglages restent sur votre appareil (stockage local), et même l\'assistant IA y tourne en local via WebGPU. Gratuit, open source, analytique sans cookies uniquement.');
    expect(
      en.welcome.intro,
      'PRIV-02/WR-01: en.welcome.intro must carry the approved cookieless-analytics wording (absolute-denial claim removed)',
    ).toBe('A fast, fully client-side editor for Mermaid diagrams. Your diagrams, settings, and AI models stay in your browser — free, open source, with cookieless analytics only.');
    expect(
      fr.welcome.intro,
      'PRIV-02/WR-01: fr.welcome.intro must carry the approved cookieless-analytics wording (absolute-denial claim removed)',
    ).toBe('Un éditeur de diagrammes Mermaid rapide et entièrement côté client. Vos diagrammes, paramètres et modèles d\'IA restent dans votre navigateur — gratuit, open source, avec une analytique sans cookies uniquement.');
    expect(en.header.appHeading).toBe('MermaidStudio — Free Online Mermaid Diagram Editor');
    expect(fr.header.appHeading).toBe('MermaidStudio — Éditeur de diagrammes Mermaid en ligne gratuit');
    expect(en.status.privacy).toBe('Privacy');
    expect(fr.status.privacy).toBe('Confidentialité');
  });
});

describe('vercel.json routing config', () => {
  const config = JSON.parse(
    readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8'),
  ) as {
    cleanUrls?: boolean;
    redirects?: Array<Record<string, unknown>>;
    headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };

  it('enables cleanUrls (serves x.html at /x — /privacy without extension)', () => {
    expect(
      config.cleanUrls,
      'REDIR/PRIV-01: vercel.json must set cleanUrls: true',
    ).toBe(true);
  });

  it('carries exactly the two contracted redirects (REDIR-01/02)', () => {
    expect(
      config.redirects,
      'REDIR-01/02: vercel.json must declare a redirects array',
    ).toBeDefined();
    expect(config.redirects!).toHaveLength(2);
    const [apex, indexHtml] = config.redirects! as Array<{
      source?: string;
      has?: Array<{ type: string; value: string }>;
      destination?: string;
      permanent?: boolean;
      statusCode?: number;
    }>;
    expect(
      apex.has,
      'REDIR-01: the apex redirect must be host-scoped via the exact-host has condition (prevents loops and preview-URL sweeps)',
    ).toEqual([{ type: 'host', value: 'mermaidstudio.net' }]);
    expect(apex.source).toBe('/(.*)');
    expect(
      apex.permanent,
      'REDIR-01: the apex redirect must be permanent (301/308)',
    ).toBe(true);
    expect(
      (apex.destination ?? '').startsWith('https://www.mermaidstudio.net/'),
      'REDIR-01: the apex redirect destination must be the www host (path appended via $1)',
    ).toBe(true);
    expect(
      indexHtml,
      'REDIR-02: the /index.html entry must be an explicit 301 to /',
    ).toEqual({ source: '/index.html', destination: '/', statusCode: 301 });
  });

  it('preserves every security header value (T-28-02 pin — WebGPU isolation)', () => {
    const nav = config.headers?.find((h) => h.source === '/(.*)');
    expect(
      nav,
      'T-28-02: the headers[].source "/(.*)" entry must remain',
    ).toBeDefined();
    const get = (key: string) =>
      nav!.headers.find((h) => h.key === key)?.value;
    const expected: Array<[string, string]> = [
      ['Cache-Control', 'public, max-age=0, must-revalidate'],
      ['Cross-Origin-Opener-Policy', 'same-origin'],
      ['Cross-Origin-Embedder-Policy', 'require-corp'],
      ['X-Content-Type-Options', 'nosniff'],
      ['Referrer-Policy', 'strict-origin-when-cross-origin'],
      ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
      [
        'Content-Security-Policy-Report-Only',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; report-uri https://csp-report.vercel.app/report",
      ],
    ];
    for (const [key, value] of expected) {
      expect(
        get(key),
        `T-28-02: header ${key} must keep its exact value (COOP/COEP carry WebGPU cross-origin isolation)`,
      ).toBe(value);
    }
    const assets = config.headers?.find((h) => h.source === '/assets/(.*)');
    expect(
      assets?.headers.find((h) => h.key === 'Cache-Control')?.value,
      'T-28-02: the /assets immutable cache header must remain',
    ).toBe('public, max-age=31536000, immutable');
  });
});
