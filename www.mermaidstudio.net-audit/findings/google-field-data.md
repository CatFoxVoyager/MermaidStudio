# Google Field Data — www.mermaidstudio.net

**Fetch date:** 2026-10-29 (all timestamps below UTC)
**Credential tier:** 1 (API key + service account `pagespeed@home-22395.iam.gserviceaccount.com`)
**Target:** `https://www.mermaidstudio.net/` (canonical; apex 307 -> www)
**Site context:** client-side React SPA, no SSR, prod sourcemaps disabled, PWA service worker, COOP/COEP headers, hosted on Vercel.

---

## 1. Field-Data Summary (labeled by source)

| Metric | Value | Source | Rating |
|---|---|---|---|
| LCP (field, mobile) | **No data** | CrUX API (field) — not eligible | Info |
| INP (field, mobile) | **No data** | CrUX API (field) — not eligible | Info |
| CLS (field, mobile) | **No data** | CrUX API (field) — not eligible | Info |
| LCP (field, desktop) | **No data** | CrUX API (field) — not eligible | Info |
| INP (field, desktop) | **No data** | CrUX API (field) — not eligible | Info |
| CLS (field, desktop) | **No data** | CrUX API (field) — not eligible | Info |
| 25-week CWV trend | **No data** | CrUX History API (field) | Info |
| GSC clicks/impressions/CTR | **Permission denied** | GSC Search Analytics API | gap |
| GSC index status / canonical / last crawl | **Permission denied** | GSC URL Inspection API | gap |
| GA4 organic traffic | **Not configured** | GA4 Data API | gap |

**Bottom line: this domain has zero Google field-data coverage.** Every performance number that exists for it is PSI lab data (simulated device). The only field-data instrument (CrUX) reports the origin as below Chrome-traffic eligibility.

---

## 2. PageSpeed Insights (PSI v5 / Lighthouse — lab data)

Single-run Lighthouse audits on production, 2026-10-29T12:41Z. Lab numbers use simulated
throttling (mobile = emulated Moto-class device on slow 4G). These are NOT field values.

### Lighthouse category scores

| Category | Mobile | Desktop |
|---|---|---|
| Performance | **40/100** | **46/100** |
| SEO | 100/100 | 100/100 |
| Best Practices | 96/100 | 96/100 |
| Accessibility | 95/100 | 93/100 |

### Lab metrics (PSI lab / Lighthouse)

| Metric | Mobile | Desktop | Mobile vs thresholds |
|---|---|---|---|
| First Contentful Paint | 9.1 s | 2.0 s | Poor |
| Largest Contentful Paint | **15.4 s** | **2.8 s** | Poor (>4 s) / Needs Improvement (2.5–4 s) |
| Total Blocking Time (lab INP proxy) | 610 ms | 790 ms | Poor |
| Cumulative Layout Shift | 0.04 | 0.002 | Good |
| Speed Index | 9.1 s | 2.1 s | Poor |
| Time to Interactive | 15.5 s | 3.1 s | Poor |
| Total page weight | 2,694 KiB | 2,725 KiB | High (scripts = 2,614 KiB of it) |

### Key lab diagnostics (both strategies)

- **Reduce unused JavaScript**: est. 1,599–1,611 KiB wasted; top offender `assets/mermaid-core-C2SI5FZb.js` (704 KiB total, ~551 KiB unused on initial load) plus `mermaid-parser` (132 KiB) and `codemirror-features` (126 KiB). The SPA eagerly loads the entire editor stack before user intent.
- **Avoid multiple page redirects**: est. 8,618 ms (mobile) / 1,670 ms (desktop) wasted; 2 document requests observed even when starting from the www URL — a redirect hop exists on the entry path and is multiplied by mobile throttling in the lab estimate. Adjudication: the literal seconds are a throttled estimate, but any redirect hop on first paint is avoidable; worth confirming the www entry URL lands 200 in one hop.
- **Minimize main-thread work**: 4.0 s mobile / 3.8 s desktop (script eval ~1.9 s).
- **Render-blocking requests**: 3 stylesheets, incl. Google Fonts CSS fetched **twice under two different weight sets** (`wght@300;400;500;600` and `...;700`) — duplicate blocking CSS + duplicate font downloads. 40 stylesheet requests total per load.
- **Missing source maps for large first-party JS** (`mermaid-core`, `mermaid-parser`): adjudicated-out as a finding — `sourcemap: false` in prod is intentional per repo config; note only.
- **Best Practices (96)**: no CSP in enforcement mode, no frame-ancestors/XFO policy, no Trusted Types (High severity per Lighthouse), HSTS without `includeSubDomains`/`preload`. Inspector issues: CSP-related.
- **SEO audits: all 9 passed** on both strategies (title, meta description, canonical valid, crawlable, robots.txt valid, hreflang valid, successful status code).
- **Accessibility deltas**: mobile — color-contrast (4.31:1 on 12px text), no `main` landmark, label/accessible-name mismatch; desktop — `aria-input-field-name` (CodeMirror contenteditable), target-size (14px control), label mismatch.

---

## 3. CrUX and CrUX History (field data)

| Query | Target | Result |
|---|---|---|
| CrUX API, URL-level | `https://www.mermaidstudio.net/` | **No data** — "insufficient Chrome traffic volume for eligibility" |
| CrUX API, origin-level (via combined check) | `https://www.mermaidstudio.net/` | **No data** — same eligibility message |
| CrUX History, URL-level | `https://www.mermaidstudio.net/` | **No data** |
| CrUX History, origin-level | `https://www.mermaidstudio.net` | **No data** |

**25-week trend: unavailable (no baseline series exists).** This is a legitimate outcome for a
new/low-traffic domain, not an API error. CrUX requires a minimum count of Chrome users per
28-day bucket. Consequence: **there is no INP field value, and none can exist until the origin
qualifies.** Re-check monthly; eligibility typically arrives after sustained Chrome traffic.

---

## 4. Google Search Console (GSC API)

**Property existence probe** (`sites.list`, 2026-10-29): the service account sees exactly two
properties — `sc-domain:carte-radon.ca`, `sc-domain:radon-map.ca`. No mermaidstudio.net property
is shared with `pagespeed@home-22395.iam.gserviceaccount.com`.

**Direct property probes (as instructed, both forms tried):**

| Probe | Property form | Result |
|---|---|---|
| Search Analytics, 90 days (2026-07-31 → 2026-10-26) | `sc-domain:mermaidstudio.net` | **403 Permission denied** |
| Search Analytics, 90 days | `https://www.mermaidstudio.net/` | **403 Permission denied** |
| URL Inspection | `sc-domain:mermaidstudio.net` | **403 Permission denied** |

**Neither property form works.** Indexing status, Google's view of the canonical, last crawl
date, clicks/impressions/CTR, top queries, top pages, and sitemap status are all unavailable
via API. No GSC numbers are reported in this audit because none could be fetched — zeros in
the raw probe output are API placeholder values, not measurements.

**Fix (one-time, ~2 min):** in GSC, Settings → Users and permissions → Add user →
`pagespeed@home-22395.iam.gserviceaccount.com` (Restricted is sufficient for read-only
reporting). If the property does not exist yet, create `sc-domain:mermaidstudio.net` (Domain
property covers apex + www + all subdomains) and verify via DNS. Re-run the GSC portion after
propagation (minutes for permission, data appears if the property has any history).

---

## 5. Data Gaps (explicit)

1. **No CrUX field data** at URL or origin level, any form factor — origin below Chrome-traffic eligibility. (Info, expected for this domain.)
2. **No CrUX History / 25-week trend** — same cause.
3. **No field INP** — INP only exists as field data; absence of CrUX means absence of INP. Lab TBT (610 ms mobile / 790 ms desktop) is the only responsiveness signal.
4. **GSC property not shared with the service account** — both `sc-domain:mermaidstudio.net` and `https://www.mermaidstudio.net/` return 403; search performance and URL inspection unavailable.
5. **GSC sitemap status** — not attempted; same 403 applies to the property-scoped sitemaps endpoint.
6. **GA4 unavailable** — no `ga4_property_id` configured in claude-seo credentials; organic traffic and landing-page reports skipped. Tier is effectively 1, not 2.
7. **Indexing API** — credential badge OK (Tier 1 lists it), but per prior observation (#5062) the badge verifies presence, not enablement; no Indexing API call was required by this task, and none was made.

---

## 6. Severity Flags

Rule applied: flags only for objectively bad **field** values vs thresholds (LCP > 2.5 s,
INP > 200 ms, CLS > 0.1 = poor). Missing CrUX coverage = Info.

| Finding | Severity | Evidence basis |
|---|---|---|
| No CrUX field coverage (LCP/INP/CLS all unverifiable in the field) | **Info** | CrUX API eligibility (2026-10-29) |
| GSC access missing for the audit service account | **Info** (process blocker, not a site defect) | GSC `sites.list` + 403 probes |
| Mobile lab LCP 15.4 s, Performance 40/100 | **High** (lab-flagged; NOT a field threshold violation — no field data exists) | PSI Lighthouse mobile, 2026-10-29 |
| Desktop lab LCP 2.8 s, TBT 790 ms, Performance 46/100 | **Medium** (lab-flagged) | PSI Lighthouse desktop, 2026-10-29 |
| Redirect hop on entry path (2 document loads) | **Medium** (lab-flagged; magnitude inflated by throttling, existence is real) | PSI `redirects` audit + network log |
| Duplicate Google Fonts CSS (two weight-set variants, both render-blocking) | **Medium** (lab-flagged) | PSI render-blocking + network requests |
| ~1.6 MB unused JS on initial load (mermaid stack loaded eagerly) | **High** (lab-flagged; primary driver of mobile LCP/TBT) | PSI unused-javascript, both strategies |

Field-severity column is intentionally empty of Critical/Poor entries: **nothing can be judged
"objectively bad in the field" because the field has no data.** The lab numbers above are
directional evidence and the mobile profile warrants real-user verification (RUM or re-check of
CrUX eligibility) before remediation is prioritized against business impact.

---

## 7. Recommended Next Steps

1. Share the mermaidstudio.net GSC property with the service account (or create the Domain property), then re-run: URL Inspection of `/`, 3-month search analytics, sitemap status.
2. Configure `ga4_property_id` (or add GA4 data sharing) to unlock Tier 2 organic reporting.
3. Treat the mobile lab profile as the working hypothesis for field behavior: defer/trim the eager mermaid-core load, collapse the duplicate Google Fonts requests, and remove the entry redirect hop — then re-measure.
4. Re-probe CrUX eligibility monthly; once eligible, CrUX History gives the 25-week trend automatically.

---

### Freshness notes
- PSI/Lighthouse: single lab run, 2026-10-29T12:41Z; run-to-run variance on throttled mobile can be large (±several seconds at this LCP scale).
- CrUX: 28-day rolling window when present (not present here).
- GSC data would carry a 2–3 day reporting lag (no data fetched).
- GA4: not configured (1-day lag would apply once enabled).
