# Schema / Structured Data Audit — https://www.mermaidstudio.net/

**Date:** 2026-10-29 · **Scope:** single-page SPA (repo: `d:\code\mermaidstudio`) · **Canonical:** https://www.mermaidstudio.net/ (apex 307 -> www)

## Score: 82 / 100

Breakdown: all Google-required SoftwareApp properties present and correct (+ full marks on JSON validity, canonical consistency, honest-omission policy). Deductions: -8 missing recommended `screenshot`, -4 author/sameAs entity hygiene, -3 no `dateModified` freshness signal, -2 meta-author vs JSON-LD author inconsistency, -1 description wording drift.

---

## 1. Detection

| Surface | Result |
|---|---|
| Served HTML (`www.mermaidstudio.net-audit/raw/home-raw.html`) | Exactly **1** JSON-LD block, `WebApplication`, **lines 50-80**. Zero Microdata (`itemtype`/`itemprop` = 0 matches), zero RDFa (`vocab=` = 0). |
| Source (`d:\code\mermaidstudio\index.html:50-80`) | Identical block; `softwareVersion: "%APP_VERSION%"` placeholder. |
| Rendered DOM (`raw/render-home.json`) | Same single block retained post-hydration (both `ld+json` hits in the artifact are the same block echoed in its raw/content fields). **No client-side injection** — `src/` and `public/` have zero `ld+json` occurrences. |
| Substitution mechanism | `vite.config.ts:14-19` — `appVersionHtmlPlugin.transformIndexHtml` runs `html.replaceAll('%APP_VERSION%', APP_VERSION)` where `APP_VERSION = pkg.version` (`vite.config.ts:11-12`). Verified: served HTML carries `2.1.0` (package 2.1.0). |
| Deliberate policy | HTML comment `index.html:47-49`: "No fabricated aggregateRating, no HowTo (deprecated Sept 2023), no FAQPage (rich results retired May 2026)." |

## 2. Validation — existing WebApplication block

Verbatim, served HTML `home-raw.html:50-80`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "MermaidStudio",
  "url": "https://www.mermaidstudio.net/",
  "description": "Free, open-source Mermaid diagram editor with in-browser AI (WebGPU), drag-and-drop visual editor, folders and version history. No account — everything stays on your device.",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript. AI features require a WebGPU-capable browser.",
  "inLanguage": ["en", "fr"],
  "isAccessibleForFree": true,
  "image": "https://www.mermaidstudio.net/og-image.png",
  "license": "https://opensource.org/licenses/MIT",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": { "@type": "Person", "name": "Jérémie Dufault", "url": "https://jeremiedufault.ca" },
  "featureList": [
    "In-browser AI diagram generation via WebGPU (local LLM)",
    "Drag-and-drop visual editor over the live Mermaid preview",
    "Multi-tab workspace with folders, tags and version history",
    "SVG/PNG export with themes and custom styling",
    "Offline-capable PWA with English and French UI"
  ],
  "softwareVersion": "2.1.0",
  "codeRepository": "https://github.com/CatFoxVoyager/MermaidStudio",
  "sameAs": [
    "https://github.com/CatFoxVoyager/MermaidStudio",
    "https://www.linkedin.com/in/jeremiedufault/"
  ]
}
```

### Checklist

| Check | Verdict | Evidence |
|---|---|---|
| `@context` = `https://schema.org` | PASS | raw:52 |
| `@type` valid, not deprecated | PASS | `WebApplication` (subtype of `SoftwareApplication`) |
| JSON validity | PASS | Parsed served block with Python `json` — valid, 18 keys |
| `name` (required) | PASS | raw:54 |
| `operatingSystem` (required) | PASS | `"Any"` — accepted text for a web app |
| `applicationCategory` (required) | PASS | `"DesignApplication"` — valid schema.org WebApplication enum |
| `offers` OR `aggregateRating` (required, either) | PASS | `offers` price `"0"` USD (raw:64) — exactly Google's documented pattern for free apps. **`offers` is NOT missing** (contrary to the brief's hypothesis). |
| `browserRequirements` (WebApplication-specific) | PASS | raw:59 — accurate (JS + WebGPU note matches the app's real requirement) |
| `softwareVersion` current | PASS | Served `2.1.0` == package.json 2.1.0 via build substitution |
| `screenshot` (recommended) | **FAIL** | Missing — see Finding 1 |
| `url` == canonical | PASS | raw:55 == `index.html:18` (`https://www.mermaidstudio.net/`), exact |
| `name` vs `<title>` | PASS | raw:54 vs `index.html:15` — entity name, need not equal full title |
| `description` vs meta description | PASS (Info) | raw:56 vs `index.html:17` — different wording, same substance; acceptable variety |
| `image` reachable | PASS | `og-image.png` HTTP 200 |
| `license` accurate | PASS | repo `LICENSE` = "MIT License"; opensource.org/MIT URL canonical |
| `codeRepository`/`sameAs` GitHub accurate | PASS | `git remote -v` = `https://github.com/CatFoxVoyager/MermaidStudio.git`; URL live (200) |
| `author` site reachable | PASS | `jeremiedufault.ca` returns 999 to default curl (bot block) but **200 with browser UA** — site live |
| Nesting correctness | PASS | `offers`/`author` objects, `featureList`/`sameAs`/`inLanguage` arrays — types correct |
| Placeholders | PASS | None in output; `%APP_VERSION%` is a by-design build-time mechanism, substituted correctly |

**Rich-result eligibility:** the block satisfies every Google-required property for the Software App rich result (name, applicationCategory, operatingSystem, offers|aggregateRating). Honest caveat kept factual: Google's SERP display of software-app results is historically inconsistent (it leans on Play Store data), so treat this block's primary value as entity clarity + AI/agent extractability, with rich-result eligibility as upside.

## 3. Type choice — keep `WebApplication`

- `WebApplication` is the **correct subtype** of `SoftwareApplication`: the product runs in the browser, and `browserRequirements` (a WebApplication-only property) is already used and accurate. Switching to the generic `SoftwareApplication` parent would *lose* that semantic.
- `MobileApplication`/`DesktopApplication` are wrong (not native installs; PWA note in featureList already covers installability).
- No diagram-editor-specific enum exists; `DesignApplication` is the closest valid enum value. Correct.
- **`isAccessibleForFree: true` already present** (raw:61) — good; complementary to `offers.price 0`.
- **@graph with Organization: not warranted.** This is a solo-maintainer project under a personal GitHub user (`CatFoxVoyager`, not an org). The `Person` author is the real-world entity; minting an `Organization` with no independent existence (no logo-identity, no separate branding beyond the product name) adds entity ambiguity, not clarity. Keep `Person`.

## 4. Findings

| # | Severity | Finding | Evidence | Impact |
|---|---|---|---|---|
| 1 | **High** | Recommended `screenshot` property missing — while the site already ships screenshot assets in the PWA manifest | Block raw:50-80 has no `screenshot` key; `public/screenshot-wide.png` + `public/screenshot-narrow.png` exist, both HTTP 200 on prod; `public/manifest.json:52,58` already reference them | Leaves Google's only missing recommended property unfilled; screenshots are entity evidence for both rich results and AI parsers |
| 2 | Low | `sameAs` entity hygiene: LinkedIn (a *person* identity) sits on the app node, and the GitHub *profile* `https://github.com/CatFoxVoyager` (200) is asserted nowhere | raw:75-78 (app-level `sameAs` = repo + LinkedIn); raw:65 (`author` has only `url`) | Weaker person-project-repo disambiguation; small GEO cost |
| 3 | Low | No `datePublished`/`dateModified` freshness signal | raw:50-80 lacks both; `public/sitemap.xml:6` carries `lastmod 2026-10-04`, so freshness is already manually maintained elsewhere | Minor freshness/updated-signal loss for the entity |
| 4 | Info | Meta author vs JSON-LD author mismatch | `index.html:41` `<meta name="author" content="MermaidStudio">` vs raw:65 `Person "Jérémie Dufault"` | Cosmetic; no engine acts on meta author |
| 5 | Info | Description wording differs between meta description and JSON-LD | `index.html:17` vs raw:56 | Acceptable; substance consistent |
| 6 | Info | `jeremiedufault.ca` blocks default-curl requests (HTTP 999) | curl status probe | Not a schema defect; serves 200 to browser UAs |
| 7 | Info | Correctly absent (do not add): `aggregateRating` (no reviews surface exists — revisit only if one ships), FAQPage (Google retired FAQ rich results for ALL sites May 2026; no SERP benefit, AI/GEO benefit unconfirmed), HowTo (deprecated Sept 2023), `BreadcrumbList` and `WebSite`/SearchAction (single URL, no site search — `sitemap.xml` confirms one URL), QAPage (no Q&A surface) | raw:50-80; policy comment `index.html:47-49` | All omissions are correct; the block is already compliant with the no-fabrication policy |

## 5. AI-citation (GEO) value — factual assessment

The block already carries the fields LLMs and agents extract for software entities: `applicationCategory`, five-item concrete `featureList` (including the differentiating "in-browser WebGPU local LLM"), `codeRepository`, `license`, `isAccessibleForFree`, `softwareVersion`, `inLanguage`, and `sameAs` identity links. This is above-typical machine-readable completeness for a tool page. The two improvements below (screenshot evidence, author↔profile linking) tighten the person-project-repo entity triangle; no unconfirmed claims are made here about AI-training ingestion.

## 6. Ready-to-paste JSON-LD (recommended fix)

**Insertion point: `d:\code\mermaidstudio\index.html` — replace lines 50-80** (the current `<script type="application/ld+json">` block, leaving the comment at 47-49 and `</script>` context intact). Changes vs current: adds `screenshot` (both assets verified 200), moves person identities into `author.sameAs` incl. the GitHub profile, trims app-level `sameAs` to the repo (already mirrored by `codeRepository`), keeps `%APP_VERSION%` mechanism untouched.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "MermaidStudio",
  "url": "https://www.mermaidstudio.net/",
  "description": "Free, open-source Mermaid diagram editor with in-browser AI (WebGPU), drag-and-drop visual editor, folders and version history. No account — everything stays on your device.",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript. AI features require a WebGPU-capable browser.",
  "inLanguage": ["en", "fr"],
  "isAccessibleForFree": true,
  "image": "https://www.mermaidstudio.net/og-image.png",
  "screenshot": [
    "https://www.mermaidstudio.net/screenshot-wide.png",
    "https://www.mermaidstudio.net/screenshot-narrow.png"
  ],
  "license": "https://opensource.org/licenses/MIT",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "author": {
    "@type": "Person",
    "name": "Jérémie Dufault",
    "url": "https://jeremiedufault.ca",
    "sameAs": [
      "https://github.com/CatFoxVoyager",
      "https://www.linkedin.com/in/jeremiedufault/"
    ]
  },
  "featureList": [
    "In-browser AI diagram generation via WebGPU (local LLM)",
    "Drag-and-drop visual editor over the live Mermaid preview",
    "Multi-tab workspace with folders, tags and version history",
    "SVG/PNG export with themes and custom styling",
    "Offline-capable PWA with English and French UI"
  ],
  "softwareVersion": "%APP_VERSION%",
  "codeRepository": "https://github.com/CatFoxVoyager/MermaidStudio",
  "sameAs": ["https://github.com/CatFoxVoyager/MermaidStudio"]
}
</script>
```

**Optional (Low) — freshness signal** using the same placeholder mechanism. Extend `vite.config.ts:14-19`:

```ts
const appVersionHtmlPlugin = {
  name: 'app-version-html',
  transformIndexHtml(html: string) {
    return html
      .replaceAll('%APP_VERSION%', APP_VERSION)
      .replaceAll('%BUILD_DATE%', new Date().toISOString().slice(0, 10));
  },
};
```

Then add `"dateModified": "%BUILD_DATE%",` to the block. Caveat: build date approximates (can differ from real content changes); alternative is updating it manually alongside `sitemap.xml` lastmod. Skip if that maintenance burden is unwanted.

## 7. Verification steps (falsifiable)

- **Finding 1 (High):** after deploy, `curl -s https://www.mermaidstudio.net/ | grep -c "screenshot-wide.png"` must return >= 1, and Google Rich Results Test on the live URL must report the SoftwareApp/WebApplication item without a missing-screenshot warning. Falsifier: grep count 0 on the live domain post-deploy, or validator still flags screenshot.
- **Finding 2 (Low):** post-deploy `curl -s https://www.mermaidstudio.net/ | grep -c "\"https://github.com/CatFoxVoyager\""` >= 1 (profile now asserted inside `author.sameAs`).
- **Finding 3 (Low, if adopted):** post-deploy `curl -s https://www.mermaidstudio.net/ | grep -c "dateModified"` = 1 with a current ISO date.

## 8. Cross-repo note (per project CLAUDE.md)

If the Android shell (`D:/code/mermaidstudio-app`) carries its own copy of the head/schema (its WebView shell embeds the web app), flag porting the updated block there as an explicit follow-up on that repo's planning track.
