# SEO Monitoring — mermaidstudio.net

Maintainer-facing runbook for the monitoring cadences established in milestone
v1.6 "SEO Fixes" (phases 28–33). Provenance: audit of 2026-10-29 (claude-seo
2.2.5, `FULL-AUDIT-REPORT.md` — that directory is NOT tracked; this file is the
tracked carrier of its scoring contract), fixes deployed through 2026-10-31,
drift baselines captured 2026-11-01.

Two complementary nets exist:

- **PR-time (automatic):** `src/__tests__/driftBaseline.test.ts` binds the
  committed baseline fixture to `index.html` and `public/fr/index.html` — any
  edit to the title, canonical, meta description, h1, the h2 list, OG tags or
  the JSON-LD identity set fails CI before deploy.
- **Post-deploy (this runbook):** the drift compare + spot batteries below run
  against production, on the cadences listed.

---

## 1. Pinned baseline

The regression net points at exactly these captures (rows in
`src/__tests__/fixtures/drift-baseline-2026-11-02.json`, exported verbatim from
the drift store):

| Route | Baseline id | Captured (UTC) | Served version at capture |
|---|---|---|---|
| `https://www.mermaidstudio.net/` | **49** | 2026-11-02T09:58:39.312717+00:00 | llms.txt Version 2.3.0 |
| `https://www.mermaidstudio.net/fr` | **50** | 2026-11-02T09:58:45.293392+00:00 | llms.txt Version 2.3.0 |

**Critical selection rule:** `drift_compare` silently compares against the
LATEST baseline row per URL (`ORDER BY id DESC`) unless `--baseline-id` is
passed. A stray re-capture quietly re-points the net. Therefore:

- An **INTENTIONAL redesign** re-captures deliberately AND replaces the
  committed fixture **in the same PR** — never leave the net pointing at a
  stale row, and never leave the repo fixture disagreeing with the live store.
- The pinned ids above are the provenance of the post-fix freeze; cite them in
  any PR that updates the fixture.

## 2. Capture / compare / re-capture procedure

All commands run through the claude-seo plugin CLI. `--skip-cwv` is deliberate
on every drift command: the origin is below CrUX traffic eligibility, so no
field CWV data exists and the CWV compare rules (rules 11/12) can never fire —
skipping keeps capture quota-free.

```bash
# Baseline capture (both public routes; EN first, /fr/ second)
claude-seo run drift_baseline.py https://www.mermaidstudio.net/ --skip-cwv
claude-seo run drift_baseline.py https://www.mermaidstudio.net/fr/ --skip-cwv

# Compare (post-deploy; 17 severity-classified rules vs the latest baseline)
claude-seo run drift_compare.py https://www.mermaidstudio.net/ --skip-cwv
claude-seo run drift_compare.py https://www.mermaidstudio.net/fr/ --skip-cwv

# History / HTML report
claude-seo run drift_history.py https://www.mermaidstudio.net/
claude-seo run drift_report.py <history-file> --output report.html
```

**Export to the committed fixture** (the drift store is machine-local SQLite —
the JSON export is the only artifact that leaves the machine; read-only URI
mode, Python 3 stdlib). The store's column is `timestamp` (there is no
`captured_at`); the export keeps max(id) per URL if a stray re-capture left
more than 2 rows, and asserts exactly 2 before writing:

```python
import json, os, sqlite3
from pathlib import Path
db = Path(os.path.expanduser("~/.cache/claude-seo/drift/baselines.db")).as_posix()
cols = ("id, url, url_hash, timestamp, title, meta_description, canonical, robots, "
        "h1, h2_json, h3_json, schema_json, og_json, cwv_json, html_hash, schema_hash, status_code")
conn = sqlite3.connect(f"file:///{db}?mode=ro", uri=True)
conn.row_factory = sqlite3.Row
rows = [dict(r) for r in conn.execute(
    f"SELECT {cols} FROM baselines WHERE url LIKE '%mermaidstudio.net%' ORDER BY id")]
assert len(rows) == 2, f"expected exactly 2 rows (EN + FR), got {len(rows)} — dedupe by max(id) per url_hash first"
Path("src/__tests__/fixtures/drift-baseline-YYYY-MM-DD.json").write_text(
    json.dumps(rows, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
```

Re-capture checklist (intentional redesign only): capture both routes → export
to a NEW dated fixture (the test discovers `drift-baseline-*.json` by prefix) →
delete the old fixture → update the pinned table above → all in the same PR.

## 3. Expected-drift ledger (read on EVERY post-deploy compare)

The served HTML hash changes on every deploy (Vite content-hashed asset URLs),
and releases bump the JSON-LD version — without this ledger every compare
reads as an alarm and trains everyone to ignore it.

| Field | Rule fired | Fires when | Verdict |
|---|---|---|---|
| html_hash | rule_17 `content_hash_changed` (INFO) | EVERY deploy (content-hashed asset URLs in served HTML) | expected, ignore |
| schema_json (`softwareVersion`) | rule_14 `schema_modified` (WARNING) | release-deploy bumps — **EN route ONLY** (FR JSON-LD omits softwareVersion by design, phase-31 decision) | expected on release deploys |
| title / meta_description / canonical / robots / h1 / h2 / h3 / og tags / status | rules 1–13 | never, unless a real regression | **MUST-STAY** — investigate immediately |
| FR route (all fields) | any rule | never on version bump | fully stable reference |

**A clean compare is:** FR route zero findings; EN route exactly 1 INFO on a
non-release deploy, exactly 1 INFO + 1 WARNING on a release deploy. Anything
else is a regression to investigate before the next deploy.

**Worked example (validates this ledger):** the first post-merge compare after
Release PR #15 (release 2.3.0) is expected to produce exactly 1 INFO + 1
WARNING on the EN compare and a clean FR compare. Run it and check.

## 4. Per-deploy spot battery

curl probes against the canonical host (www). Expected values in comments.

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://www.mermaidstudio.net/      # 200
curl -s https://www.mermaidstudio.net/ | grep -c '<main class="shell">'      # 1
curl -s -o /dev/null -w '%{http_code}\n' https://www.mermaidstudio.net/fr/   # 200
curl -s https://www.mermaidstudio.net/fr/ | grep -c '<html lang="fr">'       # 1
curl -s https://www.mermaidstudio.net/ | grep -c 'hreflang='                 # 3 (en, fr, x-default)
curl -s https://www.mermaidstudio.net/fr/ | grep -c 'hreflang='              # 3
curl -s https://www.mermaidstudio.net/sitemap.xml | grep -c '<loc>'          # 3 (/, /privacy, /fr/)
```

Note: the bare substring `lang="fr"` counts **2** on the FR head (the
`<html lang="fr">` tag AND the `hreflang="fr"` link both contain it) — probe
the anchored form above for exactly 1.

**Apex redirect — assert the CHAIN, never a bare code** (a redirecting
endpoint legitimately answers 30x; a bare-code assert reads "broken" on a
healthy site):

```bash
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' https://mermaidstudio.net/
# Expected terminal today (A1 open):  307 -> https://www.mermaidstudio.net/
# Expected after the A1 flip:        308 -> https://www.mermaidstudio.net/
```

## 5. Monthly CrUX re-probe

The origin is **below Chrome-traffic eligibility** today (verified live
2026-11-01: `pagespeed_check.py --crux-only` → "No CrUX data for this origin").
Re-probe monthly until the site qualifies:

```bash
claude-seo run pagespeed_check.py https://www.mermaidstudio.net/ --crux-only
```

- A below-eligibility result is a **documented outcome, not a failure** — say
  so in the log and stop. INP cannot be measured until field data exists.
- Once qualified: CrUX History provides the 25-week trend; the Performance
  category of the re-score (section 9) then gains a field-data leg.

**GA4 does not create CrUX field data.** Creating the GA4 property (section 7)
does not move this origin toward field data: CrUX eligibility is a
Chrome-traffic bar — a publicly discoverable origin with sufficient Chrome
visitor traffic — and CrUX never links analytics properties. A
below-eligibility result remains the expected outcome regardless of GA4 state.

## 6. Quarterly SERP re-check

Run the 3 observed target queries and check for the site URL in the top-20 of
each (the audit's evidence base was DDG Lite — a Bing-backed proxy; note the
engine used next to every reading):

1. `mermaid editor online`
2. `free mermaid diagram editor`
3. `mermaid live editor alternative`

**Audit-day split (2026-10-29), the baseline to measure movement against:**
the site was absent from all 30 observed top-10 slots; the GitHub repo ranked
#7 for query 3 (searchers meet the README, not the tool); 7/10 slots on query
3 were third-party comparison listicles. Future checks measure MOVEMENT from
this split, not absolutes.

## 7. GSC / GA4 manual-action checklist

Both items are dashboard/account actions (user-owned; no code path exists).
Each item is written state-independent — check the current state before
re-running any step; the verification probes decide, not assumptions.

- [x] **GSC property sharing** — share the Search Console property with the
      audit service account `pagespeed@home-22395.iam.gserviceaccount.com`
      (a public principal id, not a credential). Until shared, GSC API calls
      answer **403** — that is the empty state, not a site defect; come back
      to this step. Path: Search Console → property `sc-domain:mermaidstudio.net`
      → Settings → Users and permissions → Add user → paste the
      service-account email (`pagespeed@home-22395.iam.gserviceaccount.com`) →
      role **Restricted** (sufficient for read-only reporting; propagation is
      "very quickly"). After the share, `claude-seo run gsc_query.py sites`
      lists `sc-domain:mermaidstudio.net`, and
      `claude-seo run gsc_query.py query --property sc-domain:mermaidstudio.net --days 28`
      exits 0 (zero rows is normal — GSC carries a 2–3 day reporting lag).
      Under Restricted, URL Inspection is "Fetch only": a 403 from
      `gsc_inspect.py` is **role semantics, not a failed share** — escalate
      the role to Full if inspection matters; don't debug the API.
      **DONE 2026-11-12** — property created (Domain, DNS TXT verified at
      Cloudflare), share applied by the owner; flip proven:
      `gsc_query.py sites` lists the property and the scoped query exits 200.
      Role escalated to **Full** same day; sitemap submitted via API
      (`last: 2026-11-12T20:11Z`, 0 errors, 0 warnings) — submission is now
      scriptable from the §2 cadence if ever needed again.
- [ ] **GA4 property creation + configuration** — Google Analytics → Admin →
      Create property → Web stream for `https://www.mermaidstudio.net` →
      copy the Measurement ID (`G-…`) → Vercel dashboard → Project →
      Settings → Environment Variables → add `VITE_GA4_MEASUREMENT_ID`
      (Production **and** Preview) → redeploy so the variable reaches the
      build. Then record the property's numeric `ga4_property_id` in the
      claude-seo configuration (values live in the local tool config or
      environment, never in this repo). The site's GA4 disclosure itself is
      enforced at PR time by the trust-copy census gates, not by this
      checklist.

## 8. Operational status items

- **A1 — apex redirect status.** Repo-side work is DONE: `vercel.json` carries
  the `has: host` permanent (308) rule. The domain-level redirect configured
  in the Vercel dashboard answers **first** with 307 (temporary) until the
  dashboard's `redirectStatusCode` for the apex domain is set to **308**
  (user-owned flip). After flipping: re-run the apex chain assert in section 4
  and expect `308 -> https://www.mermaidstudio.net/`.
- **Per-release flow (release-please, phase 33).** Merging the Release PR tags
  the release and deploys the versioned site — the release path NEVER queues
  on this runbook; it only consumes the ledger's release expectation (1 INFO +
  1 WARNING on EN). Where the release bootstrap itself is referenced, the
  ordering is: repo "Allow GitHub Actions to create and approve pull requests"
  setting → seed tag push → main push (phase-33 bootstrap order). Post-merge,
  note the new served version next to the pinned-baseline table via the
  ledger's worked example.

## 9. Derived health re-score (milestone criterion 3)

> **This is a derived re-score, not a fresh audit.** Method: the audit's own
> 7-category weight table below, with each category's audit-named fails marked
> fixed/remaining against milestone evidence (the four phase production
> batteries of phases 28–31, the PR-time fs gates, and live probes of
> 2026-11-01); a category's new score re-derives as audit score + headroom ×
> severity-judged fixed share of its named fails (Performance instead uses the
> measured fresh PSI score). Per-category judgment, honestly labeled — never
> cite it as a fresh claude-seo audit result.

**Audit weight table (2026-10-29, verbatim):**

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 22% | 62 | 13.6 |
| Content Quality | 23% | 34 | 7.8 |
| On-Page SEO | 20% | 55 | 11.0 |
| Schema / Structured Data | 10% | 82 | 8.2 |
| Performance (CWV, lab) | 10% | 40 | 4.0 |
| AI Search Readiness | 10% | 37 | 3.7 |
| Images | 5% | 62 | 3.1 |
| **Total** | 100% | | **51.4 → 51** |

**Per-category re-derivation:**

| Category | Audit | Re-score | Fixed (evidence) | Remaining |
|---|---|---|---|---|
| Technical SEO | 62 | **88** | shell restored (28; served battery 200/1 shell), heading structure (28), sitemap lastmod build-generated (30), /index.html → 308 (30 battery), meta keywords + app-ads.txt removed (30), description 163→151 (30), HSTS includeSubDomains (30) | apex 307 (A1 flip user-owned — see section 8); CSP stays Report-Only (v2 SEC-01 deferral) |
| Content Quality | 34 | **90** | 644-word EN + 591-word FR crawlable prose with 4 definitional h2 sections (28, 31 batteries), real h1 + trust links (28), privacy contradiction resolved + /privacy 200 (28), author identity in JSON-LD + package entities (30), FR route live (31), docs Pages property live (verified 2026-10-31) | conservative headroom retained for surface the audit never re-measures |
| On-Page SEO | 55 | **76** | crawlable layer restored (28), trust answers above the fold (28), model-cost disclosure pre-commitment (28 shell valueprop-note) | SERP movement unproven (section 6 split unchanged so far); comparison intent unowned (v2 scope); rendered app still opens on the updates-only welcome modal (deliberate) |
| Schema / Structured Data | 82 | **94** | `screenshot` array added (30), sameAs hygiene — person identities on author node, app node sameAs trimmed to repo (30), FR JSON-LD localized without softwareVersion (31) | no `dateModified` property |
| Performance (CWV, lab) | 40 | **50** (measured) | eager 1.24 MiB broken up — lazy boundaries + idle prefetch (29; modulepreload ≤9, 0 mermaid matches), fonts 19 requests → 1 non-blocking (29) | fresh PSI 2026-11-01: mobile 50 (was 51 census 2026-10-30, was 40 audit-day), desktop 63, FCP 1.7 s, **LCP 8.6 s still the binding constraint** (was 15.4 s); no field data (open lever — section 5) |
| AI Search Readiness | 37 | **75** | citable corpus ≈50 → 1235 words two-route (28, 31), headings in raw served DOM (28), llms.txt 200 (30) | brand corroboration unseeded (v2 AUTH-01 deferral); backlinks out of scope |
| Images | 62 | **85** | og-image 1200×630 composed card, badge-free, zero external refs (30), manifest screenshots re-captured at current version, dims pinned (30) | touch targets below 48 px CONFIRMED remaining (audit estimate; fresh PSI 2026-11-01 accessibility audit flags "Touch targets do not have sufficient size or spacing") |

**Derived total: 22%×88 + 23%×90 + 20%×76 + 10%×94 + 10%×50 + 10%×75 + 5%×85
= 19.4 + 20.7 + 15.2 + 9.4 + 5.0 + 7.5 + 4.3 = 81.5 → 82** (audit-day 51).

**Two open levers (the honest distance to a durable 80+):**

1. **A1 apex flip** — the domain-level 307 (section 8) keeps the Technical
   category's redirect item open; a user-owned Vercel dashboard change.
2. **Absent CrUX field data** — Performance stays lab-only until the origin
   qualifies (section 5); INP is unmeasurable today.

The A3 honesty rule: this derived number sits just above the 80+ projection
with both levers OPEN — if a fresh audit scores stricter than this derivation
(quite possible for the judgment-based categories), record that number and the
levers as-is; the projection's remaining distance is the levers' documented
cost, not a failure.
