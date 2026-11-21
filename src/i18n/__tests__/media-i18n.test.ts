// src/i18n/__tests__/media-i18n.test.ts
// 39-04 (ICON-03): the bilingual media-surface parity battery, mirroring the
// 38-04 shapes battery. The 16 keys this plan declares are locked VERBATIM
// to the UI-SPEC Copywriting table (transplanted mechanically from the spec
// at execution — accents, U+2026 ellipsis, U+00D7 multiplication sign and
// FR apostrophes exact); a copy drift or an EN/FR key mismatch fails here.
// The Image-tab keys belong to 39-05 and are intentionally absent.
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const enNode = en.nodeStyle as unknown as Record<string, string>;
const frNode = fr.nodeStyle as unknown as Record<string, string>;

// 39-UI-SPEC.md "Copywriting Contract" — locked copy pairs for this plan's
// 16 keys (15 nodeStyle.* + 1 visual.iconChangeHint).
const LOCKED_COPY: Array<[string, string, string]> = [
  // [key-path leaf, EN, FR]
  ['media', 'Content', 'Contenu'],
  ['tabText', 'Text', 'Texte'],
  ['tabIcon', 'Icon', 'Icône'],
  ['tabImage', 'Image', 'Image'],
  ['iconPickAction', 'Choose an icon…', 'Choisir une icône…'],
  ['iconForm', 'Form', 'Forme'],
  ['iconFormSquare', 'Square', 'Carré'],
  ['iconFormCircle', 'Circle', 'Cercle'],
  ['iconFormRounded', 'Rounded', 'Arrondi'],
  ['iconPosition', 'Position', 'Position'],
  ['iconPositionTop', 'Top', 'Haut'],
  ['iconPositionBottom', 'Bottom', 'Bas'],
  ['iconSize', 'Size (W × H)', 'Taille (l × h)'],
  ['iconSizeAuto', 'Auto', 'Auto'],
  ['iconRemove', 'Remove icon', "Retirer l'icône"],
];

describe('media i18n parity battery (39-04)', () => {
  it('carries exactly the 16 declared keys in both locales (no more, no fewer)', () => {
    const enKeys = LOCKED_COPY.map(([k]) => k).sort();
    const enNodeMedia = enKeys;
    expect(enNodeMedia.length).toBe(15);
    for (const key of enNodeMedia) {
      expect(typeof enNode[key]).toBe('string');
      expect(typeof frNode[key]).toBe('string');
    }
    // The visual-side key exists exactly once per locale.
    expect(typeof (en.visual as unknown as Record<string, string>).iconChangeHint).toBe('string');
    expect(typeof (fr.visual as unknown as Record<string, string>).iconChangeHint).toBe('string');
    // The 39-05 Image-tab keys are NOT this plan's surface — their presence
    // would mean a plan boundary was crossed.
    expect(enNode['imageUpload']).toBeUndefined();
    expect(enNode['imageConstraint']).toBeUndefined();
  });

  it('keeps EN and FR non-empty for every declared key', () => {
    for (const [key, enV, frV] of LOCKED_COPY) {
      expect(enNode[key].length).toBeGreaterThan(0);
      expect(frNode[key].length).toBeGreaterThan(0);
      // And the locked copy must actually be what the catalogs carry.
      expect(enNode[key]).toBe(enV);
      expect(frNode[key]).toBe(frV);
    }
  });

  it('locks the FR accents byte-exact (no mojibake, no ASCII fallbacks)', () => {
    expect(frNode['tabIcon']).toBe('Icône');
    expect(frNode['iconPickAction']).toBe('Choisir une icône…');
    expect(frNode['iconPickAction']).toContain('…');
    expect(frNode['iconFormSquare']).toBe('Carré');
    expect(frNode['iconFormCircle']).toBe('Cercle');
    expect(frNode['iconFormRounded']).toBe('Arrondi');
    expect(frNode['iconPositionTop']).toBe('Haut');
    expect(frNode['iconPositionBottom']).toBe('Bas');
    expect(frNode['iconRemove']).toBe("Retirer l'icône");
    // FR size label carries the multiplication sign and lowercase l/h.
    expect(frNode['iconSize']).toBe('Taille (l × h)');
    expect(frNode['iconSize']).toContain('×');
    expect(enNode['iconSize']).toBe('Size (W × H)');
  });

  it('preserves i18next interpolation placeholders in both locales', () => {
    const enHint = (en.visual as unknown as Record<string, string>).iconChangeHint;
    const frHint = (fr.visual as unknown as Record<string, string>).iconChangeHint;
    expect(enHint).toBe('Set icon: {{icon}}');
    expect(frHint).toBe("Définir l'icône : {{icon}}");
    expect(enHint).toContain('{{icon}}');
    expect(frHint).toContain('{{icon}}');
  });
});
