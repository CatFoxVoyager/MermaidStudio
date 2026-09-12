---
phase: 21
slug: upgrade-compatibility
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-12
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by plan-phase §5.5 from RESEARCH.md §Validation Architecture; per-task map refined as plans are written.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 + jsdom (+ fake-indexeddb, vitest-canvas-mock) |
| **Config file** | `vitest.config.ts` (env jsdom; setup `tests/vitest.setup.ts`; `forceExit: true`; include `**/__tests__/**/*.test.ts(x)`) |
| **Quick run command** | `pnpm exec vitest run src/lib/mermaid/__tests__/structure-goldens.test.ts` |
| **Full suite command** | `pnpm exec vitest run` (~9 min) |
| **Estimated runtime** | ~540 seconds (full suite) / seconds (targeted runs) |

Project gotcha: vitest defaults to watch mode — always use `vitest run`. Full suite hangs at teardown; `forceExit: true` is already configured.

---

## Sampling Rate

- **After every task commit:** targeted vitest run for the touched surface (`structure-goldens.test.ts`, `postProcessDiagramSvg.test.ts`) + `pnpm run type-check`
- **After every plan wave:** `pnpm run build` (flip plans) + targeted suites
- **Before `/gsd-verify-work`:** full suite must be green — `pnpm exec vitest run` + `pnpm run build` + `pnpm run lint`
- **Max feedback latency:** ~60 seconds (targeted runs)
- **Build gate:** `pnpm run build` (tsc + vite build) is the true UPG-01/UPG-04 gate; inspect `dist/assets/` afterward

---

## Per-Task Verification Map

*Task map (planner-assigned 2026-09-12 — plans 21-01/02/03):*

| Requirement | Plan.Task | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-----------|----------|-----------|-------------------|-------------|--------|
| UPG-01 | 21-02 T2 | exact 12.0.0 pin + green production build | build + manifest | `pnpm run build` (gate T3) && `node -p "require('./node_modules/mermaid/package.json').version"` → `12.0.0` | n/a (commands) | ⬜ pending |
| UPG-02 | 21-01 T3 | v11 layout/look preserved on v12 | structural golden suite (re-run) | `pnpm exec vitest run src/lib/mermaid/__tests__/structure-goldens.test.ts` | ❌ Wave 0 (21-01 T1/T2 create it) | ⬜ pending |
| UPG-03 | 21-02 T2 | no layout-elk refs; build resolves | grep + build | `pnpm run type-check` + `git grep "layout-elk" -- src/ package.json` (no matches) | n/a (commands) | ⬜ pending |
| UPG-04 | 21-02 T3 | ELK in own lazy chunk; no dead mermaid-elk branch | build-artifact inspection | `pnpm run build` then `Get-ChildItem dist/assets -Name \| Select-String elk` (separate elk chunk; mermaid-core ~2.9 MB) | n/a (commands) | ⬜ pending |
| UPG-05 | 21-03 T2 | CI matrix 22.12+/24 only | static check + human-check | `node -e` exact-array check on `.github/workflows/ci.yml`; runner confirmation rides UAT | n/a (manual/CI) | ⬜ pending |
| UPG-06 | 21-03 T1 | embed @12.0.0 + valid SRI, runs standalone | script + manual browser check | live-CDN hash-comparison one-liner + `scripts/verify-cdn-embed.html` browser check (UAT) | n/a | ⬜ pending |
| PIPE-01 | 21-01 T1-T2 | structural contract v11→v12 | structural golden suite | `structure-goldens.test.ts` + `pnpm exec vitest run src/utils/__tests__/postProcessDiagramSvg.test.ts` | ❌ Wave 0 / ✅ pipeline tests exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/mermaid/__tests__/structure-goldens.test.ts` — the PIPE-01 golden suite (created and captured green under v11.17.2 in Plan 1, BEFORE the dependency flip)
- [ ] Working-tree triage of in-flight prior-session changes before the first commit (RESEARCH.md Pitfall 9)

*Otherwise, existing infrastructure (vitest config, jsdom setup, getBBox polyfill, pipeline test file) covers everything else.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Standalone embed page executes with @12 + SRI | UPG-06 | Requires a real browser + network fetch from jsDelivr | Open the standalone HTML page using the copied embed snippet; confirm the diagram renders and there is no SRI console error |
| CI matrix runs on 22.12+ / 24 only | UPG-05 | Runs on GitHub runners | CI run shows node 22.x / 24.x matrix jobs, no 20.x |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run` everywhere, never watch)
- [ ] Feedback latency < 60s (targeted runs)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
