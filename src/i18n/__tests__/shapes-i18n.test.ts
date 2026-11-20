// src/i18n/__tests__/shapes-i18n.test.ts
// 38-04 (SHP-05): the bilingual shape-label surface locked to the SSOT
// registry. Every structural lock below is registry-derived —
// CANONICAL_SHAPES and SHAPE_CATEGORIES from src/lib/mermaid/shapes.ts are
// the oracle, so a shape added to the registry without a label (or a label
// without a shape) fails here. No hand-typed 53-key list exists in this
// file; the only literals are the UI-SPEC Copywriting Contract's locked
// copy for the 5 category labels and 5 search/hint keys.
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import { CANONICAL_SHAPES, SHAPE_CATEGORIES, type CategoryKey } from '@/lib/mermaid/shapes';

const enShapes = en.visual.shapes as Record<string, string>;
const frShapes = fr.visual.shapes as Record<string, string>;
const enCategories = en.visual.shapeCategories as Record<string, string>;
const frCategories = fr.visual.shapeCategories as Record<string, string>;
const canonicalSlugs = CANONICAL_SHAPES.map(shape => shape.shortName);

// 38-UI-SPEC.md "Copywriting Contract" — locked category label pairs.
const LOCKED_CATEGORY_COPY: Record<CategoryKey, [string, string]> = {
  basics: ['Basics', 'Bases'],
  flow: ['Flow & Logic', 'Flux et logique'],
  data: ['Data & Storage', 'Données et stockage'],
  devices: ['Devices & Interfaces', 'Appareils et interfaces'],
  symbols: ['Symbols & Status', 'Symboles et états'],
};

// 38-UI-SPEC.md — locked search/hint copy (interpolation keys included).
const LOCKED_EN_HINTS = {
  shapeChangeHint: 'Set shape: {{shape}}',
  shapeSearch: 'Search shapes…',
  shapeSearchClear: 'Clear search',
  shapeSearchEmpty: 'No matching shape',
  shapeSearchEmptyHint:
    'No shape matches “{{query}}”. Try a shorter term or browse the categories.',
} as const;

const LOCKED_FR_HINTS = {
  shapeChangeHint: 'Définir la forme : {{shape}}',
  shapeSearch: 'Rechercher une forme…',
  shapeSearchClear: 'Effacer la recherche',
  shapeSearchEmpty: 'Aucune forme correspondante',
  shapeSearchEmptyHint:
    'Aucune forme ne correspond à « {{query}} ». Essayez un terme plus court ou parcourez les catégories.',
} as const;

describe('shapes i18n parity battery (38-04)', () => {
  it('carries exactly the canonical slug set in both locales (registry-derived)', () => {
    expect(Object.keys(enShapes)).toHaveLength(CANONICAL_SHAPES.length);
    expect(Object.keys(frShapes)).toHaveLength(CANONICAL_SHAPES.length);
    expect([...Object.keys(enShapes)].sort()).toEqual([...canonicalSlugs].sort());
    expect([...Object.keys(frShapes)].sort()).toEqual([...canonicalSlugs].sort());
  });

  it('keeps en and fr key sets identical with non-empty string values', () => {
    expect([...Object.keys(enShapes)].sort()).toEqual([...Object.keys(frShapes)].sort());
    for (const slug of canonicalSlugs) {
      expect(typeof enShapes[slug]).toBe('string');
      expect(enShapes[slug].length).toBeGreaterThan(0);
      expect(typeof frShapes[slug]).toBe('string');
      expect(frShapes[slug].length).toBeGreaterThan(0);
    }
  });

  it('resolves the flag/asymmetric collision at the data level', () => {
    expect(enShapes.odd).toBe('Asymmetric');
    expect(frShapes.odd).toBe('Asymétrique');
    expect(enShapes.flag).toBe('Flag');
    expect(frShapes.flag).toBe('Drapeau');
  });

  it('carries real UTF-8 accents in FR labels (no mojibake, no escaped forms)', () => {
    expect(frShapes['trap-b']).toBe('Trapèze (bas)');
    expect(frShapes['trap-b']).toContain('(bas)');
    expect(frShapes['trap-t']).toBe('Trapèze (haut)');
    expect(frShapes['lean-r']).toBe('Parallélogramme (droite)');
    expect(frShapes['lean-l']).toBe('Parallélogramme (gauche)');
    expect(frShapes.bolt).toContain('É');
    expect(fr.visual.shapeChangeHint).toContain('Définir');
    expect(fr.visual.shapeSearch).toContain('Rechercher');
    expect(fr.visual.shapeSearchEmpty).toContain('Aucune');
    // Typographic punctuation survives end-to-end: guillemets in FR,
    // curly quotes + ellipsis in EN — an escaped-form or codepage
    // regression flips these.
    expect(fr.visual.shapeSearchEmptyHint).toContain('«');
    expect(fr.visual.shapeSearchEmptyHint).toContain('»');
    expect(en.visual.shapeSearchEmptyHint).toContain('“');
    expect(en.visual.shapeSearch).toContain('…');
  });

  it('declares exactly the five UI-SPEC categories with the locked copy', () => {
    expect(Object.keys(enCategories).sort()).toEqual([...SHAPE_CATEGORIES].sort());
    expect(Object.keys(frCategories).sort()).toEqual([...SHAPE_CATEGORIES].sort());
    for (const category of SHAPE_CATEGORIES) {
      expect(enCategories[category]).toBe(LOCKED_CATEGORY_COPY[category][0]);
      expect(frCategories[category]).toBe(LOCKED_CATEGORY_COPY[category][1]);
    }
  });

  it('maps every canonical shape to one of the five declared categories', () => {
    for (const shape of CANONICAL_SHAPES) {
      expect(SHAPE_CATEGORIES).toContain(shape.category);
    }
  });

  it('keeps the interpolation placeholders in both locales', () => {
    expect(en.visual.shapeChangeHint).toContain('{{shape}}');
    expect(fr.visual.shapeChangeHint).toContain('{{shape}}');
    expect(en.visual.shapeSearchEmptyHint).toContain('{{query}}');
    expect(fr.visual.shapeSearchEmptyHint).toContain('{{query}}');
  });

  it('locks the five search/hint keys to the UI-SPEC copy verbatim', () => {
    expect(en.visual.shapeChangeHint).toBe(LOCKED_EN_HINTS.shapeChangeHint);
    expect(en.visual.shapeSearch).toBe(LOCKED_EN_HINTS.shapeSearch);
    expect(en.visual.shapeSearchClear).toBe(LOCKED_EN_HINTS.shapeSearchClear);
    expect(en.visual.shapeSearchEmpty).toBe(LOCKED_EN_HINTS.shapeSearchEmpty);
    expect(en.visual.shapeSearchEmptyHint).toBe(LOCKED_EN_HINTS.shapeSearchEmptyHint);
    expect(fr.visual.shapeChangeHint).toBe(LOCKED_FR_HINTS.shapeChangeHint);
    expect(fr.visual.shapeSearch).toBe(LOCKED_FR_HINTS.shapeSearch);
    expect(fr.visual.shapeSearchClear).toBe(LOCKED_FR_HINTS.shapeSearchClear);
    expect(fr.visual.shapeSearchEmpty).toBe(LOCKED_FR_HINTS.shapeSearchEmpty);
    expect(fr.visual.shapeSearchEmptyHint).toBe(LOCKED_FR_HINTS.shapeSearchEmptyHint);
  });

  it('preserves the sibling top-level shapes block (24 keys, Phase 42 scope)', () => {
    // The CodeMirror autocomplete label block (`shapes` at the JSON root)
    // is owned by Phase 42 (EDIT-01) — 38-04 must not touch it. The count
    // is the pre-phase pin; only a Phase 42 plan may move it.
    expect(Object.keys(en.shapes)).toHaveLength(24);
    expect(Object.keys(fr.shapes)).toHaveLength(24);
  });
});
