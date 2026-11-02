# Backlink Profile Analysis — mermaidstudio.net (Tier 0)

- **Target:** https://www.mermaidstudio.net/ (canonical www; apex 307 -> www)
- **Analysis date:** 2026-10-29
- **Credential tier:** 0 (Common Crawl Web Graph + Backlink Verification Crawler only; no Moz, no Bing Webmaster, no DataForSEO)
- **Expected-outcome note:** young open-source project (GitHub `CatFoxVoyager/MermaidStudio`, 15 stars / 7 forks). A near-zero profile is the expected result; this report characterizes what exists rather than dramatizing absence.
- **Validator:** `validate_backlink_report.py` -> **PASS** (0 errors, 0 warnings, 1 info: CC-absence interpretation caveat, incorporated below)

---

## 1. Domain-Level Backlink Summary

### Common Crawl Web Graph — CC (0.50), domain-level, coarse and lagged

| Metric | Value | Instrument / Vintage |
|---|---|---|
| In CC crawl (host graph) | **false** (absent) | Common Crawl, release `cc-main-2026-jan-feb-mar` (crawl period Jan–Mar 2026); lookup served from local cache created 2026-10-04 |
| In CC rankings | **false** | same |
| PageRank / rank | null (no data) | same |
| Harmonic centrality / rank | null (no data) | same |
| n_hosts | null (no data) | same |
| Referring domains / link rows | **none returned** — the CC web graph surface returns host-graph metrics only when the domain is present; no cached link rows exist for this domain | same |

Both `mermaidstudio.net` and `www.mermaidstudio.net` were queried; the tool normalizes to the registrable domain and returns the same absent record.

**Required interpretation (validator-enforced):** absence from CC means CC has not crawled/indexed the domain in that release — it does **not** mean "low authority". The domain could simply be too new or too sparsely linked to enter the host graph. The newest links CC could possibly know about here are ~7 months old (Jan–Mar 2026 crawl vs. 2026-10-29 today).

### Verified Link-Level Evidence — Verify (0.95), raw HTML fetch, 2026-10-29

| Source page | HTTP | Status | Anchor | rel | Note |
|---|---|---|---|---|---|
| github.com/CatFoxVoyager/MermaidStudio (repo homepage field) | 200 | **verified** | `www.mermaidstudio.net` (exact URL) | noopener, noreferrer, **nofollow** | GitHub marks external links nofollow; crawl-discovery value, minimal direct PageRank |
| catfoxvoyager.github.io/MermaidStudio/ (project Pages docs URL) | 404 | source page does not exist | — | — | Workflow (`.github/workflows/ci.yml` deploy-docs) targets default project Pages; site not live as of 2026-10-29 |
| catfoxvoyager.github.io/ (user-site root) | 404 | source page does not exist | — | — | No user-site property |
| docs.mermaidstudio.net | DNS NXDOMAIN | subdomain does not exist | — | — | No custom-domain docs property (blocked by crawler SSRF guard after failed resolution — expected for NXDOMAIN) |

Summary: **1 verified inbound link (self-authored, nofollow), 0 third-party links observed.**

### Backlink Health Score: INSUFFICIENT DATA

**No numeric score issued.** 2 of 7 scoring factors have any data (follow/nofollow ratio and anchor text — both from a single verified link, n=1, not a meaningful distribution). Below the 4-factor minimum, a score would be misleading. Skipped for lack of any Tier 0 source: referring domain count, domain quality distribution, toxic-link ratio, link velocity trend, geographic relevance.

---

## 2. Findings

| # | Severity | Finding | Evidence (instrument, confidence, vintage) |
|---|---|---|---|
| 1 | — | **No Critical findings.** With no third-party link profile observed, there is nothing to remediate and no penalty exposure in evidence. | — |
| 2 | — | **No High-severity findings.** | — |
| 3 | **Medium** | **Docs GitHub Pages property is not live.** Project Pages URL 404, user-site root 404, `docs.` subdomain NXDOMAIN — so the site's one planned self-owned second property contributes no link, no crawl path, and no brand-SERP asset. The `deploy-docs` job exists in CI but has produced no deployed site (plausible cause: self-hosted runners not yet activated, so the job has not run — inference, not observed). | Verify (0.95), crawls 2026-10-29; workflow config Parsed from `.github/workflows/ci.yml` (0.95) |
| 4 | **Low** | **Observed inbound profile is 100% self-authored.** The only confirmed inbound link is the repo's own homepage field, and it is nofollow. Zero third-party editorial endorsement observed — normal for a young OSS project and not a risk signal, but it means the domain's off-page authority is essentially unseeded. | Verify (0.95) + CC absence (0.50) |
| 5 | **Info** | **Domain absent from Common Crawl web graph** (both host variants, release `cc-main-2026-jan-feb-mar`, cache 2026-10-04). Means "not yet in CC's index", **not** "low authority". | CC (0.50) |
| 6 | **Info** | **Toxic-link verdict out of reach.** CC returned no link rows to classify; no Moz spam scores (no key). Explicitly: nothing here supports either a toxic or a clean verdict. | instrument gap |
| 7 | **Info** | **Social/community platforms (Hacker News, Reddit, X, YouTube, LinkedIn): UNVERIFIED.** Not fetched — these are JS-wall SPAs where HTTP-fetch absence proves nothing. Verdict ceiling: "platform evidence only". | ceiling rule |
| 8 | **Info** | **Reciprocal-link status unknown:** whether mermaidstudio.net links back to GitHub could not be checked — homepage outbound-link parsing is not in the allowed Tier 0 instrument set. No reciprocal-pattern claim is made either way. | instrument gap |

---

## 3. Link Gap (qualitative growth, prioritized)

This overlaps the GEO agent's brand-seed recommendation; see that plan for the full playbook. Highest-expected natural sources for "free open-source mermaid editor":

1. **GitHub ecosystem lists** — inclusion in `awesome-mermaid`-type awesome lists and the `mermaid` topic page; the most natural first third-party (and followed/nofollow-mixed but high-relevance) inbound. Prerequisite: the repo and profile are already in order.
2. **Show HN** (news.ycombinator.com) — canonical launch venue for OSS dev tools. Current HN presence: UNVERIFIED (platform ceiling).
3. **dev.to / Hashnode build-log article** — "building a fully client-side mermaid editor with in-browser WebGPU AI" is a distinctive hook editors pick up.
4. **r/mermaid and adjacent subs** (r/webdev, r/reactjs) — community seeding; reference the GEO brand-seed plan rather than duplicating it here.
5. **Ship the docs property first** (finding 3): a live docs site on project Pages is a self-owned backlink, a second brand-SERP result, and a crawl path — the cheapest gap to close.

---

## 4. What CANNOT Be Concluded at Tier 0

- **Referring-domain count or any DA/PA figures** — no Moz key; CC web graph returns host metrics only for indexed domains and returned none.
- **That the site has "zero backlinks"** — CC absence means "not in CC's index"; third-party links on uncrawled or JS-wall surfaces are not ruled out.
- **Toxic/spam assessment of any kind** — no link rows to classify, no spam-score source. (Had rows existed, they could only be classified as GitHub/pages-ecosystem vs unknown, without authority scores.)
- **Link velocity / acquisition trend** — DataForSEO-only factor; no source at Tier 0.
- **Presence OR absence on Hacker News, Reddit, X, YouTube, LinkedIn** — ceiling: platform evidence only; these are JS-wall SPAs.
- **Anchor-text distribution and follow/nofollow profile** — n=1 observed link; no distribution claims.
- **Geographic distribution of links** — no source.
- **Reciprocal linking with GitHub** — homepage outbound analysis not available in the allowed instrument set.
- **Backlink Health Score (numeric)** — INSUFFICIENT DATA by rule (< 4 of 7 factors with data).

---

## 5. Method Notes

- Instruments used (allowlist only): `commoncrawl_graph.py` (--info, apex, www), `verify_backlinks.py` (two runs, full-fetch link verification — no `--head-only`), `validate_backlink_report.py` (PASS).
- No local pip installs; no non-allowlisted fetch instruments used.
- Verification of the GitHub repo link reads server-rendered HTML (GitHub serves the repo page statically; the outbound `<a>` tag is directly parseable) — hence Verify (0.95), not the platform ceiling.
- Raw payloads retained at:
  - `d:/code/mermaidstudio/www.mermaidstudio.net-audit/findings/report_data.json` (validator input, PASS)
  - `d:/code/mermaidstudio/www.mermaidstudio.net-audit/findings/verify_links_cc.json`
  - `d:/code/mermaidstudio/www.mermaidstudio.net-audit/findings/verify_links_docs.json`
- Upgrading conclusions requires Moz (DA/PA, anchors, referring domains), Bing Webmaster (only for properties registered to the owner's account), or DataForSEO (velocity, full link table, geographic data).
