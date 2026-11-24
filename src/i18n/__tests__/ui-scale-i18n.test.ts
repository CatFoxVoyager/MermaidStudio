import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

describe('uiScale i18n parity', () => {
  it('en.uiScale and fr.uiScale exist, have the same non-empty keys, and interpolate {{percent}} in label, autoHint, and notice', () => {
    const enSection = (en as unknown as Record<string, Record<string, string>>).uiScale;
    const frSection = (fr as unknown as Record<string, Record<string, string>>).uiScale;

    expect(enSection).toBeDefined();
    expect(frSection).toBeDefined();

    const enKeys = Object.keys(enSection).sort();
    const frKeys = Object.keys(frSection).sort();
    expect(enKeys).toEqual(frKeys);
    expect(enKeys).toEqual(
      expect.arrayContaining([
        'title',
        'label',
        'auto',
        'autoHint',
        'sliderLabel',
        'notice',
        'noticeAction',
      ])
    );

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
    expect(enSection.notice).toContain('{{percent}}');
    expect(frSection.notice).toContain('{{percent}}');
  });

  it('en.shortcuts and fr.shortcuts define interface scale shortcut keys', () => {
    const enShortcuts = (en as unknown as Record<string, Record<string, string>>).shortcuts;
    const frShortcuts = (fr as unknown as Record<string, Record<string, string>>).shortcuts;

    for (const key of ['interface', 'uiScaleOut', 'uiScaleIn', 'uiScaleReset']) {
      expect(typeof enShortcuts[key]).toBe('string');
      expect(typeof frShortcuts[key]).toBe('string');
      expect(enShortcuts[key].trim().length).toBeGreaterThan(0);
      expect(frShortcuts[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('en.commands and fr.commands define uiScale and uiScaleDesc', () => {
    const enCommands = (en as unknown as Record<string, Record<string, string>>).commands;
    const frCommands = (fr as unknown as Record<string, Record<string, string>>).commands;

    for (const key of ['uiScale', 'uiScaleDesc']) {
      expect(typeof enCommands[key]).toBe('string');
      expect(typeof frCommands[key]).toBe('string');
      expect(enCommands[key].trim().length).toBeGreaterThan(0);
      expect(frCommands[key].trim().length).toBeGreaterThan(0);
    }
  });
});
