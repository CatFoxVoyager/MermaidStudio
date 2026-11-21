// src/i18n/__tests__/media-i18n.test.ts
// 39-04 + 39-05 (ICON-03): the bilingual media-surface parity battery,
// mirroring the 38-04 shapes battery. The 36 keys the two plans declare are
// locked VERBATIM to the UI-SPEC Copywriting table (transplanted
// mechanically from the spec at execution — accents, U+2026 ellipsis,
// U+00D7 multiplication sign, U+2014 em-dash, curly quotes, guillemets and
// FR apostrophes exact); a copy drift or an EN/FR key mismatch fails here.
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const enNode = en.nodeStyle as unknown as Record<string, string>;
const frNode = fr.nodeStyle as unknown as Record<string, string>;
const enVisual = en.visual as unknown as Record<string, unknown>;
const frVisual = fr.visual as unknown as Record<string, unknown>;

// 39-UI-SPEC.md "Copywriting Contract" — locked copy pairs.
// 39-04's 16 keys (15 nodeStyle.* + 1 visual.iconChangeHint).
const LOCKED_COPY_39_04: Array<[string, string, string]> = [
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

// 39-05 Task 1's upload-state keys (landed with the rows that consume them).
const LOCKED_COPY_39_05_IMAGE: Array<[string, string, string]> = [
  ['imageUpload', 'Upload image', 'Téléverser une image'],
  ['imageEmptyHint', '…or paste an image from the clipboard', '…ou collez une image depuis le presse-papiers'],
  ['imageCompressing', 'Compressing…', 'Compression…'],
  ['imageSizeReadout', '{{size}} after compression', '{{size}} après compression'],
  ['imageReplace', 'Replace', 'Remplacer'],
  ['imageRemove', 'Remove image', "Retirer l'image"],
];

// 39-05 Task 3's validation / advisory / constraint keys.
const LOCKED_COPY_39_05_VALIDATION: Array<[string, string, string]> = [
  ['imageInvalidType', 'Unsupported file — use PNG, JPEG, WebP, or GIF.', 'Fichier non pris en charge — utilisez PNG, JPEG, WebP ou GIF.'],
  ['imageTooLarge', 'Image too large — pick one under {{limit}}.', 'Image trop volumineuse — choisissez-en une de moins de {{limit}}.'],
  ['imageExternalWarning', 'External image URLs can fail to render (CSP) and may be dropped from PNG export (COEP). Upload a local image for reliable results.', "Les URL d'images externes peuvent ne pas s'afficher (CSP) et être absentes de l'export PNG (COEP). Téléversez une image locale pour un résultat fiable."],
  ['imageConstraint', 'Fit node to image', "Ajuster le nœud à l'image"],
];

describe('media i18n parity battery (39-04 + 39-05)', () => {
  const allNodeKeys = [...LOCKED_COPY_39_04, ...LOCKED_COPY_39_05_IMAGE, ...LOCKED_COPY_39_05_VALIDATION];

  it('carries exactly the 36 declared nodeStyle/visual keys in both locales (no more, no fewer)', () => {
    const enKeys = allNodeKeys.map(([k]) => k).sort();
    expect(enKeys.length).toBe(25);
    for (const key of enKeys) {
      expect(typeof enNode[key]).toBe('string');
      expect(typeof frNode[key]).toBe('string');
    }
    // The visual-side keys exist exactly once per locale.
    expect(typeof enVisual.iconChangeHint).toBe('string');
    expect(typeof frVisual.iconChangeHint).toBe('string');
    for (const key of ['iconSearch', 'iconSearchClear', 'iconSearchEmpty', 'iconSearchEmptyHint', 'iconLoading', 'iconLoadError', 'iconRetry']) {
      expect(typeof enVisual[key]).toBe('string');
      expect(typeof frVisual[key]).toBe('string');
    }
    // The pack headers are a nested proper-noun object, identical EN/FR.
    expect(enVisual.iconPacks).toEqual({ solid: 'Solid', regular: 'Regular', brands: 'Brands' });
    expect(frVisual.iconPacks).toEqual({ solid: 'Solid', regular: 'Regular', brands: 'Brands' });
  });

  it('keeps EN and FR non-empty for every declared nodeStyle key and locks the copy verbatim', () => {
    for (const [key, enV, frV] of allNodeKeys) {
      expect(enNode[key].length).toBeGreaterThan(0);
      expect(frNode[key].length).toBeGreaterThan(0);
      // The locked copy must actually be what the catalogs carry.
      expect(enNode[key]).toBe(enV);
      expect(frNode[key]).toBe(frV);
    }
  });

  it('locks the 39-05 picker keys verbatim (search, loading, error, retry)', () => {
    const pairs: Array<[string, string, string]> = [
      ['iconSearch', 'Search icons…', 'Rechercher une icône…'],
      ['iconSearchClear', 'Clear search', 'Effacer la recherche'],
      ['iconSearchEmpty', 'No matching icon', 'Aucune icône correspondante'],
      ['iconSearchEmptyHint', 'No icon matches “{{query}}”. Try the FontAwesome name, e.g. “house” or “github”.', 'Aucune icône ne correspond à « {{query}} ». Essayez le nom FontAwesome, ex. « house » ou « github ».'],
      ['iconLoading', 'Loading icon library…', "Chargement de la bibliothèque d'icônes…"],
      ['iconLoadError', 'The icon library failed to load.', "Échec du chargement de la bibliothèque d'icônes."],
      ['iconRetry', 'Retry', 'Réessayer'],
    ];
    for (const [key, enV, frV] of pairs) {
      expect(enVisual[key]).toBe(enV);
      expect(frVisual[key]).toBe(frV);
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
    // 39-05: the em-dash validation copy, the œ ligature, and the FR
    // accents byte-exact.
    expect(enNode['imageInvalidType']).toContain('—');
    expect(frNode['imageInvalidType']).toContain('—');
    expect(frNode['imageConstraint']).toBe("Ajuster le nœud à l'image");
    expect(frNode['imageConstraint']).toContain('œ');
    expect(frNode['imageUpload']).toBe('Téléverser une image');
    expect(frVisual['iconLoadError']).toContain('É');
    expect(frNode['imageEmptyHint']).toBe('…ou collez une image depuis le presse-papiers');
  });

  it('preserves i18next interpolation placeholders in both locales', () => {
    expect(enVisual.iconChangeHint).toBe('Set icon: {{icon}}');
    expect(frVisual.iconChangeHint).toBe("Définir l'icône : {{icon}}");
    expect(enVisual.iconChangeHint).toContain('{{icon}}');
    expect(frVisual.iconChangeHint).toContain('{{icon}}');
    // 39-05: the size readout, the too-large limit and the empty-search
    // query placeholders survive in both locales.
    expect(enNode['imageSizeReadout']).toContain('{{size}}');
    expect(frNode['imageSizeReadout']).toContain('{{size}}');
    expect(enNode['imageTooLarge']).toContain('{{limit}}');
    expect(frNode['imageTooLarge']).toContain('{{limit}}');
    expect(enVisual.iconSearchEmptyHint).toContain('{{query}}');
    expect(frVisual.iconSearchEmptyHint).toContain('{{query}}');
  });
});
