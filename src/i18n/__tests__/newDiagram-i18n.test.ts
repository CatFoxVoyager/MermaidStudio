// src/i18n/__tests__/newDiagram-i18n.test.ts
import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

// [clé, EN, FR]
const LOCKED: Array<[string, string, string]> = [
  ['title', 'New Diagram', 'Nouveau diagramme'],
  ['nameLabel', 'Diagram Name', 'Nom du diagramme'],
  ['namePlaceholder', 'E.g. Network map', 'ex. Carte du réseau'],
  ['defaultName', 'Untitled Diagram', 'Diagramme sans titre'],
  ['create', 'Create', 'Créer'],
];

describe('newDiagramDialog i18n parity', () => {
  it('carries exactly the 5 keys in both locales with the locked copy', () => {
    const enNs = en.newDiagramDialog as unknown as Record<string, string>;
    const frNs = fr.newDiagramDialog as unknown as Record<string, string>;
    const keys = LOCKED.map(([k]) => k).sort();
    expect(Object.keys(enNs).sort()).toEqual(keys);
    expect(Object.keys(frNs).sort()).toEqual(keys);
    for (const [key, enValue, frValue] of LOCKED) {
      expect(enNs[key]).toBe(enValue);
      expect(frNs[key]).toBe(frValue);
    }
  });
});
