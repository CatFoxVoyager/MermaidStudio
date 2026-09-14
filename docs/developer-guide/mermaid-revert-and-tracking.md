# Mermaid Revert Path & 12.0.x Tracking (Developer Guide)

How to retreat from mermaid 12 to the known-good mermaid 11 pair, and how to
track 12.0.x point releases without floating pins. Written for Phase 24 /
VAL-03 (decision D9). The companion browser-floor doc is
[browser-support.md](./browser-support.md).

## Current state (v1.3)

| Surface | Pin | Guard |
|---|---|---|
| `package.json` mermaid | exact `12.0.0` (no caret) | lockfile specifier synced |
| `@mermaid-js/layout-elk` | **removed** (mermaid 12 bundles ELK, lazy-loaded) | `npm run check:elk` |
| CDN embed (`src/constants/cdnEmbed.ts:19-24`) | exact `12.0.0` + sha384 SRI | `check:cdn-embed` (recomputes SRI from installed bytes) |
| Renderer defaults (`doInit()`) | `layout: 'dagre'`, `look: 'classic'` (v11 defaults) | Phase 21 locks |

## The known-good pair

**mermaid 11.17.2 + @mermaid-js/layout-elk 0.2.3.** These are the versions the
pre-migration app was verified against (the structure goldens in
`tests/goldens/README.md` were captured on 11.17.2).

## Revert procedure

```bash
git revert bf3658e
```

`bf3658e` ("feat(21-02): flip to exact mermaid 12.0.0, remove layout-elk") is
the **atomic flip commit** — verified to touch exactly three files in one
commit: `package.json`, `pnpm-lock.yaml`, and `src/lib/mermaid/core.ts`.
Reverting it restores the known-good pair in one step: the manifest returns to
`mermaid ^11.17.2` + `@mermaid-js/layout-elk ^0.2.3`, the lockfile returns to
its pre-flip content, and the ELK loader registration returns to `core.ts`.

After the revert, re-install dependencies with the canonical package manager
(pnpm 10 — `pnpm-lock.yaml` is the committed lockfile the revert restores).
The pre-flip manifest used carets (`^11.17.2` / `^0.2.3`); if you need an
exact known-good restoration, tighten both to exact pins (`11.17.2` /
`0.2.3`) after reverting so a re-resolve cannot drift within the caret range.

### What survives the revert, and why it is safe

- **The v11-default pins in `doInit()`** (`layout: 'dagre'`, `look:
  'classic'`) are harmless under v11 **by design** (Phase 21 revert-safety):
  dagre/classic were v11's own defaults, so the pins are a no-op on the
  reverted pair.
- **The Phase 22 `renderDiagram` cleanup** (error-SVG + render-container-div
  removal) is version-agnostic — it manipulates the app's own DOM state, not
  mermaid-version-specific output.
- **v12-era app content becomes inert, not broken:** the `usecase-beta`
  detector branch, autocomplete entries, and template stay in the app but can
  no longer be triggered by mermaid 11 renders (v11 has no such type). The
  `usecaseDiagram` union entry simply goes unused.

### Post-revert step the revert does NOT do: re-sync the CDN pin

`src/constants/cdnEmbed.ts` is **not part of `bf3658e`**, so after a bare
revert it still pins `mermaid@12.0.0` + the 12.0.0 SRI while the installed
package is 11.17.2. `cdnEmbed.test.ts` (the `check:cdn-embed` guard) asserts
the pinned URL version equals the **installed** mermaid version and that the
SRI matches the **installed** `mermaid.min.js` bytes — both fail until you
re-pin `MERMAID_CDN_VERSION` + `MERMAID_CDN_SRI` (and the
`scripts/verify-cdn-embed.html` fixture, which the same test holds in
agreement) to the reverted version. This is the guard doing its job: a stale
SRI silently breaks pasted embeds, so a stale pin is **blocking by design**.

## Re-verification scope after a revert (honest and specific)

Run, and **expect green** (they encode the v11-look contract):

- The Phase 22 regression set:
  - `src/lib/mermaid/__tests__/core.test.ts`
  - `src/lib/mermaid/__tests__/structure-goldens.test.ts`
  - `src/utils/__tests__/postProcessDiagramSvg.test.ts`
  - `src/lib/mermaid/__tests__/subgraph-render.test.ts` — known flake near
    the 5s mark; run it **isolated** (`npx vitest run <path>`) rather than
    reading a near-5s full-suite failure as a regression
- `npm run lint`, `npm run type-check`, `npm run build`

**Expect RED by design — v12-adoption locks do not gate the rollback.** A
revert is a feature rollback, and the locks added in Phase 24 document v12
adoption, not the v11 regression contract:

- The type sweep's **usecase cells** (`diagram-type-sweep.test.ts`) fail:
  mermaid 11 has no `usecase-beta` type, so the cells cannot render.
- The **keyword detection tests** for v12-era syntax keep matching (detection
  is app-side string matching), but every lock that **renders** v12-era
  content (usecase template render locks, sweep cells) fails. The
  railroad/cynefin/swimlane additions exist as autocomplete/detection entries,
  not sweep cells — their static-data locks keep passing and are simply inert
  under v11.
- `cdnEmbed.test.ts` fails until the CDN pin is re-synced (step above) — an
  operational consequence of the revert, not a regression.

These failures are the documented divergence between the rollback and the
v12-adoption record; do not "fix" them by weakening the locks.

## 12.0.x fast-follow procedure (no floating ranges)

12.0.x tracking is a **milestone-watch item**: no point releases existed at
the v1.3 freeze (12.0.0 was published 2026-09-10). The trigger condition is
the **first 12.0.x release**. When one ships:

1. **Bump the exact pin** in `package.json` (e.g. `12.0.0` → `12.0.1`) and
   sync the lockfile. No caret, no range.
2. **Update `MERMAID_CDN_VERSION`** in `src/constants/cdnEmbed.ts` and
   **recompute the sha384 SRI** from the installed bytes:
   `cdnEmbed.test.ts` / `check:cdn-embed` validates the hash against the
   installed `mermaid.min.js` and enforces agreement with
   `scripts/verify-cdn-embed.html` — the guard makes a **stale SRI
   blocking**, which is exactly what protects pasted embeds from
   SRI-mismatch hard blocks.
3. **Re-run the four VAL-01 gates** (full one-shot unit suite, lint,
   type-check, production build) **and the ×3 E2E matrix** (chromium,
   firefox, webkit).
4. **Record the bump in CHANGELOG.md.**
