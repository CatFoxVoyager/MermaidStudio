// THM-04 lock test — layout engines under mermaid 12.0.0 (Phase 23, plan 23-01, Task 2).
//
// ─── Suite header record (i): D13 probe outcome ─────────────────────────────
// The temporary empirical probe (src/lib/mermaid/__tests__/tmp-elk-stress-probe.test.ts —
// created, run once, DELETED on 2026-09-13, never committed; Phase 22
// probe-observe-delete pattern) observed, against a 4-node flowchart rendered
// through renderDiagram in four variants:
//
//   RESOLVES — frontmatter `config: layout: elk.stress` rendered a non-empty
//   sanitized SVG with geometry DISTINCT from both the `elk` (elk.layered)
//   render and the `dagre` renders, i.e. the stress algorithm itself executed.
//   Zero console.warn was captured during the elk.stress render — no
//   `Layout algorithm … is not registered` fallback from
//   getRegisteredLayoutAlgorithm (chunk-HQBA3IBE.mjs:112-126) occurred.
//
//   Observed probe geometry signatures (first .edgePaths path `d` +
//   first .node `transform`; ids never compared — they differ per render):
//     dagre (body-only == frontmatter dagre, byte-identical):
//       edgeD=M100.5,58L95.083,62.167C89.667,66.333,78.833,74.667,73.417,82.333C68,90,68,97,68,100.5L68,104
//       nodeTransform=translate(133, 33)
//     elk:
//       edgeD=M132,62L132,74.92893218813452Q132,82 124.92893218813452,82L117.40440114519882,82Q110.33333333333334,82 110.33333333333334,89.07106781186548L110.33333333333334,98
//       nodeTransform=translate(145.33333333333331, 37)
//     elk.stress:
//       edgeD=M141.57739876985207,190.029493630209L143.1563190318365,189.08010748010108
//       nodeTransform=translate(100, 215.029493630209)
//
//   Render-to-render determinism was established FIRST (two body-only renders
//   produced identical signatures), which is what makes the equality
//   discriminations below sound. Probe exit code: 0 (every variant rendered).
//
//   Per decision D12 the disjunction closes on RESOLVES: no degradation warning
//   toast is built (plan 23-01 Task 3 skipped; UI-SPEC condition reads:
//   resolve → no toast). A crash is the only failure — and none occurred.
//
// ─── Suite header record (ii): MermaidConfigModal orphan status ─────────────
// src/components/modals/settings/MermaidConfigModal.tsx is an ORPHANED component
// (grep-verified zero import sites; only its own definition matches). Its
// component contract is deliberately NOT tested here (documented planner
// decision, research Pitfall 6): THM-04 concerns actual layout switching,
// proven end-to-end below through the live write path
// (AdvancedStylePanel `update({ layoutEngine })` → applyStyleToContent →
// frontmatter `config.layout` → mermaid's layout registry — groups 1-3).
// Its DEFAULT_CONFIG.layout === 'dagre' is consistent with the dagre pin
// locked in group 2; its DEFAULT_CONFIG.darkMode: true / fontFamily: 'Arial'
// divergences from doInit are irrelevant while the component is unmounted.
//
// Harness conventions copied verbatim from structure-goldens.test.ts
// (getBBox swallow; describe timeout 30000; DOMParser on the sanitized svg).
// All renders go through renderDiagram — never mermaid.render directly
// (bypassing the doInit pin + hasCustomTheme gate would prove nothing).
import { describe, it, expect, vi } from 'vitest';
import { renderDiagram } from '../core';
import { parseFrontmatter } from '../codeUtils';
import { applyStyleToContent } from '@/constants/themeDerivation';

const BODY = `flowchart TD
  A[Start] --> B{Check}
  B -->|ok| C[End]
  B -->|fix| D[Retry]
  D --> A`;

/** The exact frontmatter shape the app's write path produces
 *  (themeDerivation.ts:917-920 sets newConfig.layout under `config:`). */
const withLayout = (layout: string) => `---
config:
  layout: ${layout}
---

${BODY}`;

/**
 * Render through the app's single mermaid entrypoint and parse the raw
 * post-sanitize output. getBBox errors are a jsdom text-metrics limitation,
 * not a diagram error (existing pattern from structure-goldens.test.ts).
 */
async function renderFixture(source: string, id: string): Promise<Document> {
  const { svg, error } = await renderDiagram(source, id);
  if (error && !error.includes('getBBox')) {
    throw new Error(`Unexpected render error: ${error}`);
  }
  expect(svg).not.toBe('');
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

/** Geometry comparator (D13/D15): first .edgePaths path `d` + first .node
 *  `transform`. NEVER element ids — mermaid derives them from unique per-render
 *  safeIds, so they legitimately differ between renders. */
interface GeometrySignature {
  edgeD: string;
  nodeTransform: string;
}

function geometrySignature(doc: Document): GeometrySignature {
  return {
    edgeD: doc.querySelector('.edgePaths path')?.getAttribute('d') ?? '<no-edge-path>',
    nodeTransform: doc.querySelector('.node')?.getAttribute('transform') ?? '<no-node>',
  };
}

function expectGeometryPresent(sig: GeometrySignature): void {
  // Non-vacuous guard (Phase 22 Pitfall-3 discipline): a selector that matched
  // nothing would make every equality/difference assertion below vacuous.
  expect(sig.edgeD).not.toBe('<no-edge-path>');
  expect(sig.nodeTransform).not.toBe('<no-node>');
}

describe('THM-04 — layout engines under mermaid 12 (Phase 23 / 23-01)', { timeout: 30000 }, () => {
  // ── Group 1: non-empty render per entry (D13) ────────────────────────────
  describe('each selector entry renders a non-empty sanitized SVG', () => {
    it.each(['dagre', 'elk', 'elk.stress'] as const)(
      'renders non-empty via frontmatter config.layout: %s',
      async engine => {
        const doc = await renderFixture(
          withLayout(engine),
          `thm04_entry_${engine.replace('.', '_')}`
        );
        const sig = geometrySignature(doc);
        expectGeometryPresent(sig);
      }
    );

    it('elk.stress RESOLVES under bundled ELK (probe-observed branch, D12/D13)', async () => {
      // The D13 probe (2026-09-13) observed elk.stress resolving: the stress
      // algorithm itself ran — geometry distinct from both dagre and elk.layered —
      // with no fallback warning. A fallback CANNOT hide silently: mermaid's
      // last-resort is dagre (deterministic — would equal the dagre render), and
      // an elk fallback would equal the elk render. Both are discriminated below.
      const warns: string[] = [];
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
        warns.push(args.map(a => String(a)).join(' '));
      });
      let doc: Document;
      try {
        doc = await renderFixture(withLayout('elk.stress'), 'thm04_stress_resolves');
      } finally {
        warnSpy.mockRestore();
      }
      // Source-grounded fallback signal (chunk-HQBA3IBE.mjs:112-126):
      // getRegisteredLayoutAlgorithm log.warns this exact text when it falls back.
      expect(
        warns.filter(w => /not registered/i.test(w)),
        'elk.stress fell back — getRegisteredLayoutAlgorithm emitted its not-registered warning'
      ).toEqual([]);

      const stressSig = geometrySignature(doc);
      expectGeometryPresent(stressSig);

      const dagreSig = geometrySignature(
        await renderFixture(withLayout('dagre'), 'thm04_stress_cmp_dagre')
      );
      const elkSig = geometrySignature(
        await renderFixture(withLayout('elk'), 'thm04_stress_cmp_elk')
      );
      // Distinct from dagre → no dagre last-resort fallback.
      expect(stressSig).not.toEqual(dagreSig);
      // Distinct from elk → the stress algorithm (not elk.layered) executed.
      expect(stressSig).not.toEqual(elkSig);
    });
  });

  // ── Group 2: dagre-pin discriminator (D15) ───────────────────────────────
  describe('dagre-pin discriminator (D15) — the doInit pin holds on real renders', () => {
    it('body-only geometry equals explicit frontmatter dagre and differs from elk', async () => {
      // Task 1's double body-only render established render-to-render geometry
      // determinism — the premise this equality relies on.
      const bodyOnly = geometrySignature(await renderFixture(BODY, 'thm04_pin_body'));
      const explicitDagre = geometrySignature(
        await renderFixture(withLayout('dagre'), 'thm04_pin_dagre')
      );
      const explicitElk = geometrySignature(
        await renderFixture(withLayout('elk'), 'thm04_pin_elk')
      );
      expectGeometryPresent(bodyOnly);
      expectGeometryPresent(explicitDagre);
      expectGeometryPresent(explicitElk);

      // A diagram WITHOUT frontmatter layout produces dagre geometry identical
      // to an explicit frontmatter layout-dagre render — the initialize
      // `layout: 'dagre'` pin (core.ts doInit) is doing real work on mermaid 12
      // (whose defaultConfig flipped to `layout: 'elk'`).
      expect(bodyOnly).toEqual(explicitDagre);
      // ...and that pinned geometry is genuinely dagre, not the v12 elk default.
      expect(bodyOnly).not.toEqual(explicitElk);
    });
  });

  // ── Group 3: selector write path (the "selector switches" side of THM-04) ─
  describe('layout selector write path — applyStyleToContent → frontmatter config.layout', () => {
    // The app's real transform, exactly what AdvancedStylePanel's
    // `update({ layoutEngine })` triggers (themeDerivation.ts:917-920 — the
    // write fires for flowchart-family bodies, which the fixture is).
    it.each(['dagre', 'elk', 'elk.stress'] as const)(
      'writes layoutEngine %s into frontmatter config.layout',
      engine => {
        const written = applyStyleToContent(BODY, { layoutEngine: engine });
        const { frontmatter } = parseFrontmatter(written);
        expect(frontmatter.config?.layout).toBe(engine);
      }
    );

    it('emits frontmatter of the same shape the render suites consume', () => {
      // Cross-check group 3 against groups 1-2: the write path's output must be
      // parseable frontmatter carrying exactly the chosen engine (no quoting or
      // ordering surprise), i.e. the literal string groups 1-2 render.
      const written = applyStyleToContent(BODY, { layoutEngine: 'elk.stress' });
      const { frontmatter, body } = parseFrontmatter(written);
      expect(frontmatter.config?.layout).toBe('elk.stress');
      expect(body).toContain('flowchart TD');
    });
  });
});
