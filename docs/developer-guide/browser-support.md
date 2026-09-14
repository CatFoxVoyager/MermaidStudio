# Browser Support (Developer Guide)

Technical detail behind the user-facing **[Browser Support](../../README.md#-browser-support)**
section in the README. Scope: why the floor exists, how it is locked, and what
the planned long-term fix is. Written for Phase 24 / VAL-02 (decision D8).

## Build target

- `vite.config.ts` sets `build.target: 'esnext'` (the `build:` block,
  `vite.config.ts:84`).
- The value is **locked by a guard test**:
  [`src/constants/__tests__/buildTarget.test.ts`](../../src/constants/__tests__/buildTarget.test.ts)
  reads the config as text and asserts the `esnext` target inside the `build:`
  block. Lowering the floor fails the unit suite. Per decision D8 the guard's
  job is to **LOCK** the target, not to change it.
- The committed Playwright ×3 browser matrix (chromium, firefox, webkit) is
  locked by the same guard test against silent narrowing.

## Why the floor is ES2024

Mermaid 12's distribution ships modern (ES2024-era) JavaScript syntax, so the
app's effective language floor is the mermaid floor regardless of what our own
sources compile to. There is **no transpilation or polyfill fallback** for
mermaid's modern syntax in this app: lowering `build.target` would not restore
compatibility on older browsers — mermaid 12 itself would still ship modern
syntax — it would only move the failure later. `esnext` passes modern syntax
through untouched, which keeps the build honest about the real floor.

## E2E browser matrix

`playwright.config.ts` declares exactly three projects — **chromium**,
**firefox**, **webkit** — and the complete E2E suite is proven on all three
(VAL-02). Playwright's **webkit build ≈ Safari 17.4+**, so a green webkit run
is the runtime proof of the Safari/macOS floor; the config guard keeps the
matrix from being silently narrowed below ×3.

## iOS ≤ 17.3 behavior

iOS ≤ 17.3 (Safari ≤ 17.3) is **below the floor**. There is no graceful
degradation: the app bundle fails to parse and the app does not load — no
partial functionality. This is stated in the README rather than hidden behind
"older browsers may experience glitches", because the failure mode is a parse
error, not cosmetic drift.

## The real fix: FR-03

The planned long-term fix for pre-ES2024 browsers is **FR-03 — dynamic
`import('mermaid')`** so the app itself can boot and show a degradation message
even when mermaid cannot load. It is deferred to v2 (see REQUIREMENTS.md). The
iOS ≤ 17.3 statement above points here as the real future fix; a lower build
target is explicitly not the fix.
