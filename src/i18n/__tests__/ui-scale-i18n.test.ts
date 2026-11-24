import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

describe('uiScale i18n parity', () => {
  it('en.uiScale and fr.uiScale exist, have the same non-empty keys, and interpolate {{percent}} in label and autoHint', () => {
    const enSection = (en as unknown as Record<string, Record<string, string>>).uiScale;
    const frSection = (fr as unknown as Record<string, Record<string, string>>).uiScale;

    expect(enSection).toBeDefined();
    expect(frSection).toBeDefined();

    const enKeys = Object.keys(enSection).sort();
    const frKeys = Object.keys(frSection).sort();
    expect(enKeys).toEqual(frKeys);
    expect(enKeys).toEqual(expect.arrayContaining(['title', 'label', 'auto', 'autoHint']));

    for (const key of enKeys) {
      expect(typeof enSection[key]).toBe('string');
      expect(typeof frSection[key]).toBe('string');
      expect(enSection[key].trim().length).toBeGreaterThan(0);
      expect(frSection[key].trim().length).toBeGreaterThan(0);
    }

    expect(enSection.label).toContain('{{percent}}');
    expect(frSection.label).toContain('{{percent}}');
    expect(enSection.autoHint).toContain('{{percent}}');
    expect(frSection.autoHint).toContain('{{percent}}');
  });
});
