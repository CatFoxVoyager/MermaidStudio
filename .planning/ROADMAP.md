# Roadmap: MermaidStudio — Milestone v1.4 "App mobile Android native"

**Created:** 2026-09-16
**Goal:** Offrir à la communauté MermaidStudio une vraie application Android installable — un éditeur Mermaid complet de poche (éditeur de code tactile + preview live + bibliothèque locale + export) — avec parité fonctionnelle de l'expérience mobile v1.1, sans IA en v1, distribué via GitHub Releases publics.

## Milestones

- ✅ **v1.0 MVP** - Phases 1-13 (archived: `milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Mobile Responsive Design** - Phases 14-18 (shipped 2026-07-02, archived: `milestones/v1.1-ROADMAP.md`)
- ✅ **v1.2 Mobile Completion & 0.6.0 Release prep** - Phases 19-20 (code complete; 0.6.0 bump/tag user-owned post-UAT, archived: `milestones/v1.2-ROADMAP.md`)
- ✅ **v1.3 Migration Mermaid 12** - Phases 21-24 (shipped 2026-09-14, archived: `milestones/v1.3-ROADMAP.md`)
- 🚧 **v1.4 App mobile Android native** - Phases 25-29 (current)

## Overview

v1.4 wraps the existing web app unchanged in a **Capacitor 8 Android WebView shell** (research-validated: all four researchers converged independently — mermaid renders SVG through the DOM and CodeMirror 6 is a DOM editor, so every candidate architecture ships a WebView anyway; Capacitor wins on ~95% code reuse, first-party plugins for exactly our gaps, a plain Gradle project standard CI can sign, and a free iOS path later via `cap add ios`). IndexedDB stays the storage of record (no SQLite rewrite); the render hot path makes zero bridge calls, so v1.1 parity is structural, not aspirational.

The five phases mirror the research pitfall buckets. Phase 25 lands the web-side platform seams and the scaffold, pinning the day-one irreversible decisions (service-worker gate, WebView-compatible build target, `androidScheme` origin) whose deferral cost grows daily. Phase 26 makes the shell behave like a native Android citizen — the #1 device-specific risk (edge-to-edge insets + keyboard resize inverting v1.1's no-viewport-fit assumption) is settled before any feature is judged on it. Phase 27 delivers the core product thesis: a real touch editor with live preview. Phase 28 secures storage trust (library survives updates, backup path exists) and gets diagrams out of the device (share sheet, Gallery/Downloads). Phase 29 crystallizes release engineering against a feature-complete app: keystore, CI signing, GitHub Releases distribution, first-run content, final device gates.

**Scope boundaries:** no AI in v1 (WebGPU/MLC is unrealistic in an Android WebView; AI entry points are gated out, not deleted); Android first (iOS = `cap add ios` on the same project, later milestone); distribution via public GitHub Releases (no Play Store in v1); PWA/offline stays a future track (MOB-FUT-03). Visual-editor touch mode and SAF import/share-into-app are deliberately **not** in v1.4 phases — v1.x after core-loop validation (visual-editor gestures also conflict with preview pinch-zoom; do not co-schedule without arbitration design).

Phase numbering continues from v1.3 (last phase: 24).

## Phases

- [ ] **Phase 25: Platform Seams & Capacitor Scaffold** - Platform seam (`src/lib/platform/`), gated `main.tsx` (SW/analytics/AI), native build target, committed `android/` Gradle project; app boots in APK with v1.1 shell rendering
- [ ] **Phase 26: Native Shell Polish** - Edge-to-edge insets, keyboard resize, back-button coordinator, bundled woff2 fonts, splash/adaptive icons, system theme, i18n shell parity (plan with `--research-phase`)
- [ ] **Phase 27: Editor & Preview Touch Parity** - Extra-keys row, syntax-safe keyboard, autosave on background, pinch-zoom/pan preview + fit-to-screen, Code↔Preview toggle, inline errors tap-to-jump
- [ ] **Phase 28: Storage Safety & Export/Share** - Library survives APK update (device-validated), JSON backup/restore, share-sheet export, Gallery/Downloads via MediaStore, export OOM caps, renderer-crash recovery (plan with `--research-phase`)
- [ ] **Phase 29: Release Engineering & Launch** - Keystore + CI signing, monotonic versionCode, `release-android.yml` → signed APK on GitHub Release, install docs, first-run content, final device gates (plan with `--research-phase`)

## Phase Details

### Phase 25: Platform Seams & Capacitor Scaffold

**Goal**: The existing web editor runs unchanged inside a Capacitor 8 Android shell on a real device, with every one-time structural decision (service-worker gate, build target, WebView origin) pinned and all platform branching flowing through a single seam.
**Depends on**: Nothing (first phase of v1.4)
**Delivers**: `src/lib/platform/capabilities.ts` (capability flags) + typed native bridge with web fallbacks; gated `src/main.tsx` (SW registration, Vercel analytics, AI entry points); `vite.config.native.ts` with WebView-compatible build target; committed `android/` Gradle project (`cap init` + `add android`, `androidScheme: 'https'` pinned); "WebView too old" error screen.
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, VAL-02
**Success Criteria** (what must be TRUE):

  1. An APK built from the committed `android/` project installs and opens on a minSdk 24+ Android device: the editor loads, the v1.1 mobile shell activates, and a diagram renders live in preview — the web app visibly unchanged inside the shell
  2. In the native build the PWA service worker never registers and `sw.js` is absent from the shell's `webDir` (no stale-cache shell masking APK updates) — verified by a runtime probe on device
  3. The native bundle targets a WebView-compatible baseline (not `esnext`); on a WebView older than the baseline the app shows the explicit "WebView too old" error screen instead of a white screen
  4. The WebView origin is pinned (`androidScheme: 'https'`) at the first build, and IndexedDB data written on that origin is still readable after an in-place APK update on device
  5. The native build contains no AI entry points and emits no Vercel analytics requests; the web build behaves exactly as before the seams landed (web unit/E2E gates green); a repo-wide grep finds no `isNativePlatform()` calls outside `src/lib/platform/`

**Plans:** 4 plans

Plans:
- [ ] 25-01-PLAN.md — Platform seam (capabilities) + Capacitor 8.5.2 runtime + native build flavor (tracer: flag → gated bootstrap → isolated native build)
- [ ] 25-02-PLAN.md — "WebView too old" error screen (UI-SPEC-locked), native-only index.html injection, boot-phase guard
- [ ] 25-03-PLAN.md — AI entry-point gating at six surfaces + native payload absence proof (no AI chunks in APK)
- [ ] 25-04-PLAN.md — Capacitor scaffold (capacitor.config.ts origin pin + committed android/) + first APK + device boot acceptance + VAL-02 web gates
**UI hint**: yes ("WebView too old" error screen; shell rendering verification)

### Phase 26: Native Shell Polish

**Goal**: The app behaves like a native Android citizen at the shell level — nothing obscured by system chrome, the keyboard never hides the cursor, the back button navigates logically, and branding/theme/i18n feel native — verified on real devices.
**Depends on**: Phase 25 (Capacitor scaffold + plugins in the committed `android/` project)
**Delivers**: edge-to-edge inset handling (`@capacitor/system-bars` / safe-area variables); keyboard `adjustResize` + `resizeOnFullScreen` (`@capacitor/keyboard`); back-button coordinator (`@capacitor/app`) wired to modal/drawer/nav state; bundled woff2 Inter + JetBrains Mono; splash screen + adaptive icons in project colors; system dark/light theme following (manual toggle preserved); en/fr i18n shell parity.
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, SHELL-07
**Success Criteria** (what must be TRUE):

  1. On edge-to-edge devices (Android 15/16 reference devices), the top bar and bottom nav sit fully inside the safe area in both portrait and landscape — no content obscured by status or navigation bars
  2. With the soft keyboard open in the editor (GBoard, fullscreen/edge-to-edge device), the cursor line stays visible — resize behavior correct including the `resizeOnFullScreen` Android 15 case
  3. The Android back button closes the top-most drawer/modal first; from the editor it never hard-exits the app (navigates back or requires an explicit exit gesture)
  4. In airplane mode, UI text renders with the bundled Inter/JetBrains Mono and mermaid label metrics match online rendering — no font-swap drift
  5. A fresh install shows the splash screen and adaptive icon in project colors; theme follows system dark/light with the manual toggle still working; switching en/fr works inside the native shell

**Plans**: TBD
**Research**: device-specific behavior (inset/edge-to-edge API names vary by Capacitor major; Android 15/16 keyboard needs on-device verification) — plan with `/gsd-plan-phase --research-phase`
**UI hint**: yes

### Phase 27: Editor & Preview Touch Parity

**Goal**: The core product loop — type Mermaid code on a touchscreen, watch it render live — is as good as the v1.1 mobile web experience, with touch-specific affordances (extra keys, gestures, autosave) that make it genuinely usable one-handed.
**Depends on**: Phase 26 (the keyboard/inset foundation the editor is judged on)
**Delivers**: extra-keys row above the soft keyboard (generic keys + Mermaid-specific keys); syntax-safe keyboard configuration (no autocorrect/auto-capitalize/swipe); autosave on exit/background + manual save; pinch-zoom/pan preview + fit-to-screen; Code↔Preview toggle parity with v1.1; inline syntax errors with tap-to-jump-to-line; mobile render-perf threshold.
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, PREV-01, PREV-02, PREV-03
**Success Criteria** (what must be TRUE):

  1. Typing Mermaid with the soft keyboard (GBoard on reference devices) never corrupts syntax — no autocorrect substitutions, no auto-capitalization, no swipe-to-insert — verified against a symbol-heavy fixture (`graph TD; A-->|label|B{id}`)
  2. The extra-keys row above the soft keyboard offers arrows, Tab, `|`, `{}`, and quotes (plus Mermaid-specific keys), each insertable at the cursor without dismissing the keyboard
  3. Backgrounding the app mid-edit and returning restores the exact content (autosave on exit/background), manual save is available, and no content is lost on app switch
  4. A syntax error displays inline and tapping it moves the cursor to the offending line; CodeMirror syntax highlighting and Mermaid autocomplete work with touch input
  5. Preview renders Mermaid 12 output with parity to web (spot-check across diagram families); pinch-zoom/pan and fit-to-screen work; the Code↔Preview toggle behaves as on v1.1 mobile web; render latency stays under the agreed threshold on reference devices

**Plans**: TBD
**UI hint**: yes

### Phase 28: Storage Safety & Export/Share

**Goal**: Users can trust the app with a real diagram library — it demonstrably survives app updates and has a working backup path — and can get diagrams out of the device (share sheet, Gallery/Downloads) without crashing on large ones.
**Depends on**: Phase 27 (export renders the editor's active diagram; storage UX builds on the editor loop)
**Delivers**: `nativeBridge.ts` export pipeline (Filesystem cache → Android share sheet; web blob-anchor path untouched); MediaStore save to Gallery/Downloads; JSON backup/restore round-trip; manifest `allowBackup=false` + `dataExtractionRules` excluding `app_webview`; export memory (OOM) caps; `onRenderProcessGone` renderer-crash recovery; update-survival device validation; uninstall-wipes-data notice (docs + first-run).
**Requirements**: LIB-01, LIB-02, LIB-03, LIB-04, EXP-01, EXP-02, EXP-03
**Success Criteria** (what must be TRUE):

  1. Library CRUD — create, rename, delete, and organize diagrams into folders — works on device with the same operations and results as mobile web
  2. An in-place APK update (new APK installed over the old) preserves the entire library on the reference devices — device-validated, not assumed (naming which device/Android version produced the verdict is part of the record)
  3. Export-library-as-JSON → wipe → restore recreates the full library (diagrams, folders, content) on device — round-trip validated
  4. Exporting PNG/JPEG/SVG from the native app opens the Android share sheet, and saving to Gallery/Downloads lands the file (MediaStore) — while the web export path is unchanged
  5. A pathologically large diagram exports under a memory cap (graceful cap message, no renderer OOM crash), and a renderer crash (`onRenderProcessGone`) recovers to a usable app without losing the library

**Plans**: TBD
**Research**: device-specific behavior (WebView IndexedDB eviction policy undocumented; MediaStore/FileProvider specifics need focused research) — plan with `/gsd-plan-phase --research-phase`

### Phase 29: Release Engineering & Launch

**Goal**: A stranger can download the signed APK from a public GitHub Release, install it by following the docs alone, and be editing a diagram in under a minute.
**Depends on**: Phase 28 (release engineering crystallizes against a feature-complete app)
**Delivers**: release keystore generated once (CI secrets + committed public fingerprint + documented backup); monotonic `versionCode` automated from tags; `.github/workflows/release-android.yml` (tag → build → sign → attach universal APK to GitHub Release with notes); install README (unknown sources, Play Protect); in-app version display (replacing the SW update toast); first-run content (bundled templates + pre-opened sample); APK size audit (AI chunks stripped if measured significant); consolidated device test matrix record.
**Requirements**: RUN-01, RUN-02, REL-01, REL-02, REL-03, REL-04, REL-05, VAL-01, VAL-03
**Success Criteria** (what must be TRUE):

  1. The release keystore exists exactly once: CI secrets hold it, the public fingerprint is committed, and the documented backup procedure restores signing capability on a new machine
  2. Pushing a tag triggers `release-android.yml` end-to-end: build → sign → universal APK attached to a public GitHub Release with notes; `versionCode` derives from the tag and is strictly monotonic across releases
  3. On a fresh Android device, a user following only the install README (unknown sources, Play Protect warnings) installs the Release APK successfully; the in-app version display shows the installed version
  4. First launch lands in editable content in under a minute: bundled templates are available, a sample diagram is pre-opened and rendering, and there is no account step, no AI tab, and no blocking dialog
  5. Final gates pass: the device test matrix is green on the available reference devices with each verdict recording the device/Android version/axes tested (keyboard behavior, insets, export round-trip, update-survival); APK size is audited with AI chunks stripped if measured significant; the full web unit/E2E suite re-runs green (VAL-02 re-check)

**Plans**: TBD
**Research**: toolchain-specific (signing config + apksigner scheme details are standard but unforgiving; verify against the pinned AGP version) — plan with `/gsd-plan-phase --research-phase`

## Requirements Coverage

| Phase | Requirements | Count |
|-------|--------------|-------|
| 25. Platform Seams & Capacitor Scaffold | PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05, PLAT-06, VAL-02 | 7 |
| 26. Native Shell Polish | SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, SHELL-07 | 7 |
| 27. Editor & Preview Touch Parity | EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, PREV-01, PREV-02, PREV-03 | 8 |
| 28. Storage Safety & Export/Share | LIB-01, LIB-02, LIB-03, LIB-04, EXP-01, EXP-02, EXP-03 | 7 |
| 29. Release Engineering & Launch | RUN-01, RUN-02, REL-01, REL-02, REL-03, REL-04, REL-05, VAL-01, VAL-03 | 9 |

**Coverage:** 38/38 v1.4 requirements mapped (100%) — no orphans, no duplicates. Each requirement maps to exactly one phase. (38 = 35 feature requirements across the 8 categories PLAT/SHELL/EDIT/PREV/LIB/EXP/RUN/REL + 3 verification gates VAL-01..03.)

**Ordering rationale:** the seams and one-time irreversible decisions land first because their deferral cost grows daily and everything downstream is judged on them (25) → shell-level platform behavior must be correct before feature work is judged on it (26) → the core touch loop builds on that keyboard/inset foundation (27) → storage trust and export need the editor loop to exist and must precede real users accumulating real libraries (28) → signing/CI/distribution crystallize only against a feature-complete app (29). VAL-02 (web regression) maps to Phase 25 because that is where native gating introduces the risk and where it is first provable; it is re-verified in Phase 29's final gates. VAL-01/VAL-03 map to Phase 29 because the consolidated device matrix and the size audit only become fully verifiable against a release build.

## Milestone v1.4 complete when

Derived goal-backward from the requirements:

1. A user downloads the APK from a **public GitHub Release** and installs it on an Android device by following the install docs alone (REL-03, REL-04)
2. **Productive in under a minute**: first launch lands in editable content — sample diagram pre-opened and rendering, templates available, no account/AI/blocking steps (RUN-01, RUN-02)
3. **v1.1 capability parity**: touch code editor with extra keys and a syntax-safe keyboard, live Mermaid 12 preview with pinch-zoom/fit-to-screen and the Code↔Preview toggle, local library with folders, export via share sheet or Gallery (EDIT-01..05, PREV-01..03, LIB-01, EXP-01)
4. **The library is trustworthy**: it survives an in-place APK update (device-validated) and a JSON backup/restore round-trip works; the uninstall-wipes-data caveat is documented (LIB-02, LIB-03, LIB-04)
5. **The shell feels native**: nothing obscured by system bars, the keyboard never hides the cursor, the back button navigates logically, fonts/theme/i18n work offline and on (SHELL-01..07)
6. **No web regression**: the desktop and mobile-web builds behave exactly as before the milestone — all web gates green (VAL-02)
7. **Reproducible releases**: tagged builds automatically produce signed APKs with monotonic versionCode attached to GitHub Releases (REL-01, REL-02, REL-03)

## Progress

**Execution Order:** 25 → 26 → 27 → 28 → 29 (decimal insertions, if any, execute between their surrounding integers)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 25. Platform Seams & Capacitor Scaffold | v1.4 | 0/4 | Not started | - |
| 26. Native Shell Polish | v1.4 | 0/TBD | Not started | - |
| 27. Editor & Preview Touch Parity | v1.4 | 0/TBD | Not started | - |
| 28. Storage Safety & Export/Share | v1.4 | 0/TBD | Not started | - |
| 29. Release Engineering & Launch | v1.4 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-09-16 — milestone v1.4 "App mobile Android native" (phases continue from v1.3's Phase 24)*
