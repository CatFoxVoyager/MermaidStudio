/**
 * Tests for the canonical 53-shape SSOT registry (38-01, SHP-01).
 *
 * The load-bearing instrument is the DIST DRIFT battery: it re-runs the
 * research Instrument A/B extraction commands against the live mermaid
 * dist chunk at test time and asserts the registry exports equal the
 * extraction (same 53 names, same declaration order, same 92-entry alias
 * catalog). This is the test that goes red the day mermaid is bumped —
 * the registry must be re-extracted, never hand-patched.
 *
 * Oracle: node_modules/mermaid/dist/chunks/mermaid.core/chunk-AXFCVDMN.mjs
 * (mermaid 12.3.0 shapesDefs — the parse/render engine's own shape table).
 */
import { describe, it, expect } from 'vitest';
// Bare 'fs'/'path' + __dirname: the repo's ambient node shims
// (src/types/node-builtin-shims.d.ts) declare exactly these — the same
// convention as bundlePerf.test.ts / crawlableShell.test.ts (Phase 28).
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  CANONICAL_SHAPES,
  CANONICAL_SHORT_NAMES,
  ALIAS_TO_CANONICAL,
  SHAPE_CATEGORIES,
  BORDER_RADIUS_SHAPES,
  toDirectiveShapeName,
  shapeSupportsBorderRadius,
  type CategoryKey,
} from '../shapes';

const MERMAID_CHUNK = resolve(
  __dirname,
  '../../../..',
  'node_modules/mermaid/dist/chunks/mermaid.core/chunk-AXFCVDMN.mjs',
);

interface ExtractedDef {
  shortName: string;
  aliases: string[];
}

/**
 * Instrument A + B in one walk: scan the dist chunk for `shortName:` and
 * `aliases:[...]` occurrences in document order, pairing each aliases array
 * with the most recent shortName (shapesDefs entries are shortName-first).
 * Same commands the research used to derive the registry — kept verbatim in
 * spirit so the test fails when the dist layout or the data changes.
 */
function extractShapesDefs(): ExtractedDef[] {
  const chunk = readFileSync(MERMAID_CHUNK, 'utf8');
  const re = /shortName:\s*['"]([^'"]+)['"]|aliases:\s*\[([^\]]*)\]/g;
  const defs: ExtractedDef[] = [];
  let current: ExtractedDef | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk)) !== null) {
    if (m[1] !== undefined) {
      current = { shortName: m[1], aliases: [] };
      defs.push(current);
    } else if (current) {
      const aliases = m[2]
        .split(',')
        .map((raw) => raw.trim().replace(/^['"]|['"]$/g, ''))
        .filter((alias) => alias.length > 0);
      current.aliases.push(...aliases);
    }
  }
  return defs;
}

describe('shapes registry — dist drift (can-fail instrument)', () => {
  it('exports exactly the dist shapesDefs shortNames, in dist declaration order', () => {
    const extracted = extractShapesDefs();
    const extractedNames = extracted.map((d) => d.shortName);

    expect(extractedNames, 'dist oracle itself must expose exactly 53 defs').toHaveLength(53);
    expect(CANONICAL_SHAPES).toHaveLength(53);
    expect(CANONICAL_SHAPES.map((s) => s.shortName)).toEqual(extractedNames);
  });

  it('carries each dist def aliases array verbatim (92 raw entries total)', () => {
    const extracted = extractShapesDefs();
    const byShortName = new Map<string, (typeof CANONICAL_SHAPES)[number]>(
      CANONICAL_SHAPES.map((s) => [s.shortName, s] as [string, (typeof CANONICAL_SHAPES)[number]]),
    );

    const rawTotal = extracted.reduce((acc, d) => acc + d.aliases.length, 0);
    expect(rawTotal).toBe(92);
    for (const def of extracted) {
      const entry = byShortName.get(def.shortName);
      expect(entry, `registry entry for ${def.shortName}`).toBeDefined();
      expect(entry?.aliases).toEqual(def.aliases);
    }
  });

  it('resolves every dist alias to the shape that declares it', () => {
    const extracted = extractShapesDefs();
    for (const def of extracted) {
      for (const alias of def.aliases) {
        expect(
          ALIAS_TO_CANONICAL.get(alias),
          `alias ${alias} must resolve to ${def.shortName}`,
        ).toBe(def.shortName);
      }
    }
  });
});

describe('shapes registry — count locks', () => {
  it('holds exactly 53 canonical shapes with 53 distinct shortNames', () => {
    expect(CANONICAL_SHAPES).toHaveLength(53);
    expect(new Set(CANONICAL_SHAPES.map((s) => s.shortName)).size).toBe(53);
    expect(CANONICAL_SHORT_NAMES.size).toBe(53);
  });

  it('holds the measured alias map: 92 raw entries + 6 net-new legacy keys = 98', () => {
    // 92 unique dist entries + 9 legacy mappings, of which exactly 3
    // (subroutine, cylinder, trapezoid) land on identical existing targets.
    // Any other collision shrinks the map below 98 — a silent override is
    // forbidden, so the exact size IS the uniqueness lock.
    expect(ALIAS_TO_CANONICAL.size).toBe(98);
  });

  it('is a frozen build-time constant (no runtime mutation path)', () => {
    expect(Object.isFrozen(CANONICAL_SHAPES)).toBe(true);
    expect(Object.isFrozen(SHAPE_CATEGORIES)).toBe(true);
    for (const shape of CANONICAL_SHAPES) {
      expect(Object.isFrozen(shape.aliases)).toBe(true);
    }
  });
});

describe('shapes registry — mapping uniqueness', () => {
  it('raw dist alias set is duplicate-free (92 entries, 92 unique)', () => {
    const extracted = extractShapesDefs();
    const all = extracted.flatMap((d) => d.aliases);
    expect(all).toHaveLength(92);
    expect(new Set(all).size).toBe(92);
  });

  it('every alias resolves to exactly one target — no key was overwritten', () => {
    const extracted = extractShapesDefs();
    const expected = new Map<string, string>();
    for (const def of extracted) {
      for (const alias of def.aliases) {
        expected.set(alias, def.shortName);
      }
    }
    // Expected derived independently from the same extraction — sizes must
    // agree (92 raw unique) and every key must carry its extraction target.
    expect(expected.size).toBe(92);
    for (const [alias, target] of expected) {
      expect(ALIAS_TO_CANONICAL.get(alias)).toBe(target);
    }
  });
});

describe('shapes registry — self-aliases', () => {
  it('the 5 self-aliases map to themselves in the alias map', () => {
    const SELF_ALIASES = ['bang', 'cloud', 'hourglass', 'doc', 'tag-doc'] as const;
    for (const self of SELF_ALIASES) {
      expect(ALIAS_TO_CANONICAL.get(self), `${self} is its own alias`).toBe(self);
    }
  });
});

describe('shapes registry — legacy REQUIREMENTS mappings', () => {
  it('resolves all 9 legacy keys through toDirectiveShapeName', () => {
    const LEGACY: Array<[string, string]> = [
      ['round', 'rounded'],
      ['rhombus', 'diam'],
      ['subroutine', 'fr-rect'],
      ['cylinder', 'cyl'],
      ['parallelogram', 'lean-r'],
      ['parallelogram-alt', 'lean-l'],
      ['trapezoid', 'trap-b'],
      ['trapezoid-alt', 'trap-t'],
      ['asymmetric', 'odd'],
    ];
    for (const [legacyKey, canonical] of LEGACY) {
      expect(toDirectiveShapeName(legacyKey), `${legacyKey} → ${canonical}`).toBe(canonical);
    }
  });
});

describe('shapes registry — null-on-unknown (string-exact contract)', () => {
  it('returns null for a fabricated key — never a silent rect fallback', () => {
    expect(toDirectiveShapeName('Definitely-Not-A-Shape')).toBeNull();
  });

  it('returns null for uppercase variants — no case-folding anywhere in the lookup path', () => {
    expect(toDirectiveShapeName('RECT')).toBeNull();
    expect(toDirectiveShapeName('Rect')).toBeNull();
  });

  it('returns null for padded tokens — no trimming inside the lookup', () => {
    expect(toDirectiveShapeName(' rounded')).toBeNull();
    expect(toDirectiveShapeName('odd ')).toBeNull();
  });

  it('passes canonical names through untouched', () => {
    expect(toDirectiveShapeName('rect')).toBe('rect');
    expect(toDirectiveShapeName('odd')).toBe('odd');
    expect(toDirectiveShapeName('tag-doc')).toBe('tag-doc');
  });
});

describe('shapes registry — category coverage', () => {
  it('declares exactly the 5 category keys in picker display order', () => {
    expect([...SHAPE_CATEGORIES]).toEqual(['basics', 'flow', 'data', 'devices', 'symbols']);
  });

  it('assigns every one of the 53 shapes a declared category', () => {
    const declared = new Set<string>(SHAPE_CATEGORIES);
    for (const shape of CANONICAL_SHAPES) {
      expect(
        declared.has(shape.category),
        `${shape.shortName} carries undeclared category ${shape.category}`,
      ).toBe(true);
    }
  });

  it('holds the planner-locked 13/13/11/5/11 per-category split', () => {
    const counts = new Map<CategoryKey, number>();
    for (const shape of CANONICAL_SHAPES) {
      counts.set(shape.category, (counts.get(shape.category) ?? 0) + 1);
    }
    expect(counts.get('basics')).toBe(13);
    expect(counts.get('flow')).toBe(13);
    expect(counts.get('data')).toBe(11);
    expect(counts.get('devices')).toBe(5);
    expect(counts.get('symbols')).toBe(11);
  });
});

describe('shapes registry — border-radius capability', () => {
  const EXPECTED_BORDER_RADIUS = ['rect', 'rounded', 'datastore', 'console', 'browser', 'person', 'text'];

  it('contains exactly the 7 rect-backed Mermaid 12.3 shapes', () => {
    expect(BORDER_RADIUS_SHAPES.size).toBe(7);
    for (const s of EXPECTED_BORDER_RADIUS) {
      expect(shapeSupportsBorderRadius(s)).toBe(true);
    }
    const unsupported = CANONICAL_SHAPES
      .map(s => s.shortName)
      .filter(s => !EXPECTED_BORDER_RADIUS.includes(s));
    expect(unsupported).toHaveLength(46);
    for (const s of unsupported) {
      expect(shapeSupportsBorderRadius(s), `${s} should not report rx/ry support`).toBe(false);
    }
  });

  it('resolves aliases and excludes media (icon/image) or unknown shapes', () => {
    expect(shapeSupportsBorderRadius('round')).toBe(true);
    expect(shapeSupportsBorderRadius('rectangle')).toBe(true);
    expect(shapeSupportsBorderRadius('diamond')).toBe(false);
    expect(shapeSupportsBorderRadius('rect', true)).toBe(false);
    expect(shapeSupportsBorderRadius('browser', true)).toBe(false);
    expect(shapeSupportsBorderRadius(undefined)).toBe(false);
    expect(shapeSupportsBorderRadius('not-a-shape')).toBe(false);
  });
});

