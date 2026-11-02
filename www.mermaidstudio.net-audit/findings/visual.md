# Visual / UX Capture Report — https://www.mermaidstudio.net/

Audit date: 2026-10-29. Tool: claude-seo 2.2.5 `capture_screenshot.py` (managed), plus raw-HTML/asset inspection in `d:/code/mermaidstudio/www.mermaidstudio.net-audit/raw/`.

## Capture inventory

| File | Size | What it shows |
|---|---|---|
| `screenshots/desktop.png` | 1920x1080 (desktop preset) | Fully mounted app, light system theme, v2.1.0 badge, code + live flowchart preview, 78ms render status |
| `screenshots/mobile.png` | 750x1624 = 375x812 CSS @2x (mobile preset) | Fully mounted mobile UI, Files tab, segment control, folder chips, Welcome Diagram card, FAB |
| `raw/og-image.png` | 1920x1080, 107,182 bytes, PNG | Dark editor screenshot, code pane + flowchart, version badge reads **v0.9.0** |

Capture tooling notes (not site findings):
- Installed presets are fixed: desktop=1920x1080 (not a 1440-class), mobile=375x812@2x. An exact 390px viewport is **not expressible** with this installed version; nearest preset (375px) used.
- `capture_screenshot.py -o` rejects every path in this repo (string `startswith(cwd)` validation at `scripts/capture_screenshot.py:173` fails because the `claude-seo` wrapper spawns Python from a different cwd — even the default `screenshots` and plain relative dirs fail). Workaround: absolute path under home, then copied into `screenshots/`. Captures themselves are unaffected.
- The tool waits for load/network-idle, so captures show the post-mount app, not the t=0 splash. The splash is deterministic static HTML+CSS (no JS needed to paint), so it is analyzed from the served markup (`raw/home-raw.html`) and the repo's `index.html` — these are byte-equivalent in the `#root` region.

## Images/visual category contribution — score: 62/100

- Body `<img>` inventory: **zero** `<img>` elements in the served body (splash + noscript only; the mounted app renders inline SVG diagrams). Alt-text and oversized-image checks pass by absence — n/a, not a credit.
- Score is carried by: post-mount layout integrity (strong, both viewports), splash design (clean/branded but zero value prop), and og-image quality (stale v0.9.0 badge, weak small-size branding).

## Findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **High** | **Pre-mount and failed-load visual state is content-free.** Production HTML body contains only the boot splash (spinner + "MermaidStudio" wordmark) — the crawlable shell block is deleted, marked `<!-- Shell removed for dev -->` (deployed repo state, `index.html:161`). Cold visitors see spinner-only until React mounts (lab FCP on slow mobile: 9.1s — seconds of pure spinner); if the bundle fails, the spinner runs the full 12s until the JS error swap, because the CSS fade that was supposed to reveal fallback content at 8s is dead code (finding 5). SEO overlap noted (empty body for non-JS crawlers) — owned by the SEO lane; this entry covers the pixel consequence. | `raw/home-raw.html` lines 124-157; repo `index.html:158-165`; `screenshots/desktop.png` shows the only-branded post-mount state |
| 2 | **High** | **og-image.png shows a stale version badge "v0.9.0" while the live app is v2.1.0.** The CDN copy is fresh (Last-Modified today 12:46 UTC, Age ~24 min at fetch) yet still displays v0.9.0 — hash-identical to the repo source (`public/og-image.png`), so the stale badge is baked into the source asset, not a CDN cache artifact. Inconsistent with JSON-LD `softwareVersion: "2.1.0"` and the header badge in `desktop.png`. `og:image:alt` explicitly promises a "version badge" and serves an outdated one. A version line in the shell/JSON-LD makes an image badge redundant anyway — drop it from the image. | `raw/og-image.png` (badge top-left reads v0.9.0) vs `screenshots/desktop.png` (badge reads v2.1.0); md5 `52c0b89b26a04b3e46e9b5b0aad0406e` for both live and repo copies |
| 3 | **High** | **t=0 splash communicates brand only — no value proposition.** The splash is exactly a 28px teal spinner + "MermaidStudio" (1.05rem/600), centered on a system-scheme background. Nothing says "free / open-source / Mermaid diagram editor / AI". On lab-slow mobile (FCP 9.1s) this is the entire first impression for seconds. Clean and branded, but it answers "what is this tool?" with a name, not a sentence. | `raw/home-raw.html` lines 110 (inline splash CSS) and 128-131 (markup: `.boot-spinner` + `.boot-title` "MermaidStudio" only) |
| 4 | Medium | **og-image is illegible at feed size and carries no tagline.** It is a full-editor screenshot: at 1920px the header wordmark is ~14px, node labels ~16px, code ~13px; social surfaces render og images at roughly 400-560px wide, scaling all text to ~4px — nothing reads. It survives only as "dark app with a flowchart" (the diamond/box gestalt is recognizable — some value). No tagline or value-prop text is baked in. Needs a purpose-built share card: large wordmark + one-line value prop + one enlarged diagram motif. | `raw/og-image.png` viewed full-size; scale math above |
| 5 | Medium | **Splash fade-out is dead code; the 8s self-fade claimed in comments is not implemented.** `@keyframes boot-splash-out` is defined (served head CSS and `index.html:129`) but no rule applies it — occurrence count of `boot-splash-out` in the served HTML is 1 (definition only). Consequence: a hung bundle shows an infinite spinner for the full 12s before the JS error swap, instead of fading at 8s as the comment claims. The 12s error fallback itself works and is styled. | `raw/home-raw.html` line 110 |
| 6 | Medium | **Mobile first paint (post-mount) is the Files browser — the product demo is one tap away.** Above the fold on 375px: header, Files/Code/Visual tabs, search, folder chips, and the Welcome Diagram card. No diagram or editor visible; a cold visitor must tap the card to see what the tool does. Standard app pattern, but weak for a URL that is simultaneously the landing page. | `screenshots/mobile.png` |
| 7 | Low | og-image is 1920x1080 (16:9) rather than the canonical 1200x630 (1.91:1). Works for Twitter `summary_large_image` and Facebook, with minor crop/scale variance on some surfaces. 107 KB is fine. | `raw/og-image.png` (PNG header 1920x1080) |
| 8 | Low | PWA manifest screenshots exist (`/screenshot-wide.png` 1280x720, `/screenshot-narrow.png` 750x1334, files dated Oct 4 — same vintage as the v0.9.0 og-image). Not visually re-verified in this pass; if the og-image is v0.9.0-era, these likely share the stale badge. Verify separately before store/install prompts surface them. | `public/manifest.json:50-63` |
| 9 | Low | Mobile top-bar icons (undo/redo/save/download/theme/hamburger) appear ~32-40px CSS in the capture — borderline against the 48px touch-target guideline. Estimated from the 2x capture, not measured in devtools; confirm before acting. | `screenshots/mobile.png` top bar |

No Critical findings: no broken layout, overlap, clipped text, horizontal scroll, or unstyled flash at either captured width.

## Falsifiable verification (Critical/High)

**Finding 1 — content-free pre-mount/failed-load state**
```
curl -s https://www.mermaidstudio.net/ | grep -c "Shell removed for dev"     # -> 1 (shell deleted in production)
curl -s https://www.mermaidstudio.net/ | grep -c '<div class="shell'         # -> 0 (no shell markup remains in body)
curl -s https://www.mermaidstudio.net/ | sed -n '/<body>/,/<\/body>/p' | sed 's/<[^>]*>//g' | tr -d ' \n'
# -> "MermaidStudio" plus noscript text only; body text = brand wordmark alone
```

**Finding 2 — stale v0.9.0 badge baked into source**
```
curl -s https://www.mermaidstudio.net/og-image.png -o /tmp/og-live.png
md5sum /tmp/og-live.png d:/code/mermaidstudio/public/og-image.png
# -> identical: 52c0b89b26a04b3e46e9b5b0aad0406e  (repo asset == served asset)
curl -sI https://www.mermaidstudio.net/og-image.png | grep -i last-modified
# -> fresh (2026-10-29 12:46 UTC), ruling out CDN staleness
```
Visual: `raw/og-image.png` badge reads "v0.9.0"; `screenshots/desktop.png` header badge reads "v2.1.0".

**Finding 3 — splash is brand-only**
```
curl -s https://www.mermaidstudio.net/ | grep -A4 'id="boot-splash"'
# -> .boot-spinner + .boot-title with text "MermaidStudio"; no other text node inside #boot-splash
```

## Above-the-fold / first-impression verdict

- **t=0 (splash):** paints instantly from inline head CSS — no FOUC, system-scheme aware (dark #0d1117 default, light #fafaf9 alternative), reduced-motion supported. Clean and branded. But it is a name and a spinner; zero "what/why".
- **Post-mount desktop:** the app itself is the demo — code pane + live flowchart render side by side communicate "Mermaid diagram editor" wordlessly and instantly. Clean at 1920px: no overlap, no clipping, legible status bar (78ms render, "MermaidStudio is open source"). This is the strongest above-fold asset the site has — once it loads.
- **Post-mount mobile (375px):** layout intact, no horizontal scroll, tap targets on tabs/search/FAB comfortably sized (top-bar icons borderline, finding 9), text legible. First paint shows the file browser, not the editor (finding 6).
- **Verdict:** the mounted app answers "what is this tool?" well on desktop and adequately on mobile. The first-impression gap is entirely in the pre-mount window: with the crawlable shell deleted from production, a cold visitor — and a slow-network visitor for potentially 9+ seconds — sees only "MermaidStudio" and a spinner, with no value proposition and nothing underneath if loading stalls. Restoring a value-prop line (or the shell) under the splash, and fixing the dead 8s fade, closes most of the gap.
- Cross-check: the deleted crawlable shell previously sat visually under the splash (per `index.html` comments); its removal left the pre-mount layer visually and textually empty. Confirmed in both served HTML and the deployed repo source.

## Positives (do not regress)

- No flash of unstyled content: splash styles are inline in `<head>` (served HTML line 110), so t=0 is styled.
- Hard failure path: 12s inline-JS swap to "MermaidStudio failed to load." + styled Reload button (works without the app stylesheet).
- System-scheme sync for splash/theme-color; `prefers-reduced-motion` honored on the spinner.
- Desktop and mobile mounted layouts are clean and consistent at the tested widths.
