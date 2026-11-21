// src/i18n/__tests__/edge-i18n.test.ts
// 40-01 (EDGE-02): the bilingual Phase 40 edge-surface parity battery,
// mirroring the landed media-i18n battery. All 35 keys the plan declares
// (21 edgeStyle + 9 advancedStyle + 2 export + 3 subgraphStyle) are locked
// VERBATIM to the 40-UI-SPEC.md Copywriting Contract — accents, guillemets
// and FR apostrophes exact; the arrow option labels embed the literal
// (never-translated) token in parentheses. A copy drift or an EN/FR key
// mismatch fails here.
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const enEdge = en.edgeStyle as unknown as Record<string, string>;
const frEdge = fr.edgeStyle as unknown as Record<string, string>;
const enAdvanced = en.advancedStyle as unknown as Record<string, string>;
const frAdvanced = fr.advancedStyle as unknown as Record<string, string>;
const enExport = en.export as unknown as Record<string, string>;
const frExport = fr.export as unknown as Record<string, string>;
const enSubgraph = en.subgraphStyle as unknown as Record<string, string>;
const frSubgraph = fr.subgraphStyle as unknown as Record<string, string>;

// 40-UI-SPEC.md "Copywriting Contract" — locked copy pairs.
// Task 1 landed edgeStyle.animate; the remaining 20 edgeStyle keys + the
// 9 advancedStyle + 2 export + 3 subgraphStyle keys complete the table.
const LOCKED_EDGE_STYLE: Array<[string, string, string]> = [
  // [key, EN, FR]
  ['animate', 'Animate', 'Animer'],
  ['edgeId', 'Edge ID', 'ID du lien'],
  ['edgeIdPlaceholder', 'e.g. e1', 'ex. e1'],
  ['linkLength', 'Link length', 'Longueur du lien'],
  ['animationSpeed', 'Speed', 'Vitesse'],
  ['animationFast', 'Fast', 'Rapide'],
  ['animationSlow', 'Slow', 'Lent'],
  ['step', 'Step', 'Étape'],
  ['curve', 'Curve', 'Courbe'],
  ['curveDefault', 'Default', 'Par défaut'],
  ['animatePreset', 'Animate (preset)', 'Animer (préréglage)'],
  ['animatePresetHint', 'Adds a dash-animation classDef and applies it to this edge', "Ajoute un classDef avec animation de pointillés et l'applique à ce lien"],
  ['arrowDottedOpen', 'Dotted line (-.-)', 'Pointillé simple (-.-)'],
  ['arrowThickOpen', 'Thick line (===)', 'Ligne épaisse (===)'],
  ['arrowInvisible', 'Invisible (~~~)', 'Invisible (~~~)'],
  ['arrowBidirectionalDotted', 'Bidirectional dotted (<-.->)', 'Bidirectionnel pointillé (<-.->)'],
  ['arrowBidirectionalThick', 'Bidirectional thick (<==>)', 'Bidirectionnel épais (<==>)'],
  ['arrowCircleEnd', 'Circle end (--o)', 'Cercle final (--o)'],
  ['arrowCircleStart', 'Circle start (o--)', 'Cercle initial (o--)'],
  ['arrowCrossEnd', 'Cross end (--x)', 'Croix finale (--x)'],
  ['arrowCrossStart', 'Cross start (x--)', 'Croix initiale (x--)'],
];

const LOCKED_ADVANCED_STYLE: Array<[string, string, string]> = [
  ['curveBumpX', 'Bump X', 'Bump X'],
  ['curveBumpY', 'Bump Y', 'Bump Y'],
  ['curveMonotoneX', 'Monotone X', 'Monotone X'],
  ['curveMonotoneY', 'Monotone Y', 'Monotone Y'],
  ['curveNatural', 'Natural', 'Naturelle'],
  ['curveStep', 'Step', 'Palier'],
  ['curveRounded', 'Rounded', 'Arrondi'],
  ['stepDuration', 'Step duration', 'Durée des étapes'],
  ['markdownAutoWrap', 'Markdown auto-wrap', 'Retour à la ligne Markdown'],
];

const LOCKED_EXPORT: Array<[string, string, string]> = [
  ['stepNumbers', 'Step numbers', "Numéros d'étapes"],
  ['stepNumbersDesc', 'Freeze step-number badges into the exported PNG', "Graver les badges de numéros d'étapes dans le PNG exporté"],
];

const LOCKED_SUBGRAPH_STYLE: Array<[string, string, string]> = [
  ['collapse', 'Collapse', 'Replier'],
  ['expand', 'Expand', 'Déplier'],
  ['viewHint', "Toggles the subgraph's view: collapsed directive", 'Bascule la directive view: collapsed du sous-graphe'],
];

// The 9 new arrow option keys — the parenthesized token is grammar data and
// must survive verbatim in BOTH locales (tokens are never translated).
const ARROW_TOKEN_KEYS: Array<[string, string]> = [
  ['arrowDottedOpen', '(-.-)'],
  ['arrowThickOpen', '(===)'],
  ['arrowInvisible', '(~~~)'],
  ['arrowBidirectionalDotted', '(<-.->)'],
  ['arrowBidirectionalThick', '(<==>)'],
  ['arrowCircleEnd', '(--o)'],
  ['arrowCircleStart', '(o--)'],
  ['arrowCrossEnd', '(--x)'],
  ['arrowCrossStart', '(x--)'],
];

describe('edge i18n parity battery (40-01)', () => {
  const total = LOCKED_EDGE_STYLE.length + LOCKED_ADVANCED_STYLE.length + LOCKED_EXPORT.length + LOCKED_SUBGRAPH_STYLE.length;

  it('carries exactly the 35 declared keys in both locales (no more, no fewer per table)', () => {
    expect(total).toBe(35);
    const tables: Array<[Record<string, string>, Record<string, string>, Array<[string, string, string]>]> = [
      [enEdge, frEdge, LOCKED_EDGE_STYLE],
      [enAdvanced, frAdvanced, LOCKED_ADVANCED_STYLE],
      [enExport, frExport, LOCKED_EXPORT],
      [enSubgraph, frSubgraph, LOCKED_SUBGRAPH_STYLE],
    ];
    for (const [enNs, frNs, table] of tables) {
      for (const [key] of table) {
        expect(typeof enNs[key]).toBe('string');
        expect(typeof frNs[key]).toBe('string');
      }
    }
  });

  it('keeps EN and FR non-empty for every declared key and locks the copy verbatim', () => {
    const tables: Array<[Record<string, string>, Record<string, string>, Array<[string, string, string]>]> = [
      [enEdge, frEdge, LOCKED_EDGE_STYLE],
      [enAdvanced, frAdvanced, LOCKED_ADVANCED_STYLE],
      [enExport, frExport, LOCKED_EXPORT],
      [enSubgraph, frSubgraph, LOCKED_SUBGRAPH_STYLE],
    ];
    for (const [enNs, frNs, table] of tables) {
      for (const [key, enV, frV] of table) {
        expect(enNs[key].length).toBeGreaterThan(0);
        expect(frNs[key].length).toBeGreaterThan(0);
        // The locked copy must actually be what the catalogs carry.
        expect(enNs[key]).toBe(enV);
        expect(frNs[key]).toBe(frV);
      }
    }
  });

  it('embeds the untranslated arrow token in parentheses in every new arrow label', () => {
    for (const [key, token] of ARROW_TOKEN_KEYS) {
      expect(enEdge[key]).toContain(token);
      expect(frEdge[key]).toContain(token);
      // The token closes the label: "Name (token)" pattern both sides.
      expect(enEdge[key].endsWith(token)).toBe(true);
      expect(frEdge[key].endsWith(token)).toBe(true);
    }
  });

  it('locks the FR accents byte-exact (no mojibake, no ASCII fallbacks)', () => {
    expect(frEdge['step']).toBe('Étape');
    expect(frEdge['step']).toContain('É');
    expect(frEdge['animatePreset']).toContain('préréglage');
    expect(frEdge['animatePreset']).toContain('é');
    expect(frAdvanced['curveNatural']).toBe('Naturelle');
    expect(frAdvanced['curveStep']).toBe('Palier');
    expect(frAdvanced['curveRounded']).toBe('Arrondi');
    expect(frAdvanced['stepDuration']).toBe('Durée des étapes');
    expect(frSubgraph['collapse']).toBe('Replier');
    expect(frSubgraph['expand']).toBe('Déplier');
    expect(frExport['stepNumbers']).toBe("Numéros d'étapes");
    // Arrow-family accents: Épais-family labels stay exact.
    expect(frEdge['arrowThickOpen']).toBe('Ligne épaisse (===)');
    expect(frEdge['arrowThickOpen']).toContain('é');
  });

  it("keeps the FR apostrophes exact (d'étapes, l'applique, subgraph's view)", () => {
    expect(frExport['stepNumbersDesc']).toContain("d'étapes");
    expect(frEdge['animatePresetHint']).toContain("l'applique");
    expect(enSubgraph['viewHint']).toContain("subgraph's view: collapsed");
    expect(frSubgraph['viewHint']).toContain('view: collapsed');
  });

  it('does not disturb the landed incumbent keys in the touched namespaces', () => {
    // Spot pins either side of the appended blocks — additions only.
    expect(enEdge['connection']).toBe('Connection');
    expect(frEdge['connection']).toBe('Connexion');
    expect(enEdge['arrowArrow']).toBe('Arrow (-->)');
    expect(frEdge['arrowArrow']).toBe('Flèche (-->)');
    expect(enAdvanced['curveSmooth']).toBe('Smooth');
    expect(frAdvanced['curveSmooth']).toBe('Lisse');
    expect(enExport['transparentBackground']).toBe('Transparent background');
    expect(frExport['transparentBackground']).toBe('Arrière-plan transparent');
    expect(enSubgraph['subgraphId']).toBe('Subgraph ID');
    expect(frSubgraph['subgraphId']).toBe('ID du sous-graphe');
  });
});
