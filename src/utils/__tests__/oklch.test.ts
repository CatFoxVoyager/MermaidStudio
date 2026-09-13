import { describe, it, expect } from 'vitest';
import { oklchToHex, parseOklch } from '../oklch';

/**
 * Ground-truth anchors were computed independently from the CSS Color 4
 * pipeline and cross-checked against published references:
 * - oklch(70% 0 0) -> rgb(158.25 ...) (colorjs.io docs) -> #9e9e9e
 * - oklch(63.7% 0.237 25.331) = Tailwind v4 red-500 -> #fb2c36
 * - oklch(44.03% 0.1603 303.37) = rebeccapurple -> #663399
 * The previous implementation returned #ff1a00 for oklch(70% 0 0), dropped
 * alpha, and misparsed unitless lightness.
 */
describe('oklchToHex', () => {
  it('converts known reference colors exactly', () => {
    expect(oklchToHex('oklch(1 0 0)')).toBe('#ffffff');
    expect(oklchToHex('oklch(0 0 0)')).toBe('#000000');
    expect(oklchToHex('oklch(0.7 0 0)')).toBe('#9e9e9e');
    expect(oklchToHex('oklch(0.637 0.237 25.331)')).toBe('#fb2c36');
    expect(oklchToHex('oklch(0.4403 0.1603 303.37)')).toBe('#663399');
  });

  it('treats unitless and percent lightness identically (regression: 100x misparse)', () => {
    expect(oklchToHex('oklch(70% 0 0)')).toBe(oklchToHex('oklch(0.7 0 0)'));
    expect(oklchToHex('oklch(70% 0 0)')).toBe('#9e9e9e');
    expect(oklchToHex('oklch(100% 0 0)')).toBe('#ffffff');
  });

  it('preserves alpha as 8-digit hex (regression: alpha silently dropped)', () => {
    expect(oklchToHex('oklch(0.7 0 0 / 0.5)')).toBe('#9e9e9e80');
    expect(oklchToHex('oklch(0.7 0 0 / 50%)')).toBe('#9e9e9e80');
    expect(oklchToHex('oklch(0.637 0.237 25.331 / 0)')).toBe('#fb2c3600');
    // Fully opaque stays 6-digit
    expect(oklchToHex('oklch(0.7 0 0 / 1)')).toBe('#9e9e9e');
    expect(oklchToHex('oklch(0.7 0 0)')).toBe('#9e9e9e');
  });

  it('accepts deg-suffixed and negative hues', () => {
    expect(oklchToHex('oklch(0.637 0.237 25.331deg)')).toBe('#fb2c36');
    expect(oklchToHex('oklch(0.637 0.237 -334.669)')).toBe('#fb2c36');
  });

  it('falls back to #333333 for unparseable input (export path compatibility)', () => {
    expect(oklchToHex('not a color')).toBe('#333333');
    expect(oklchToHex('oklch(none 0.1 200)')).toBe('#333333');
  });

  it('round-trips in-gamut colors back to the same OKLab coordinates', () => {
    // Independent forward direction (linear sRGB -> OKLab), from the CSS
    // Color 4 spec. This is the opposite pipeline of the util, so agreement
    // validates the matrices rather than a shared typo.
    const hexToOklab = (hex: string): [number, number, number] => {
      const lin = (byte: number) => {
        const c = byte / 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
      const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
      const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
      const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
      const [lp, mp, sp] = [Math.cbrt(l), Math.cbrt(m), Math.cbrt(s)];
      return [
        0.2104542553 * lp + 0.793617785 * mp - 0.0040720468 * sp,
        1.9779984951 * lp - 2.428592205 * mp + 0.4505937099 * sp,
        0.0259040371 * lp + 0.7827717662 * mp - 0.808675766 * sp,
      ];
    };

    const cases: Array<[number, number, number]> = [
      [0.4403, 0.1603, 303.37], // rebeccapurple
      [0.637, 0.237, 25.331], // Tailwind red-500
      [0.7, 0.05, 150],
      [0.85, 0.08, 80],
      [0.7, 0.1, 30],
      [0.3, 0.02, 180],
      [0.208, 0.042, 265.755],
    ];

    const DEG2RAD = Math.PI / 180;
    for (const [l, c, h] of cases) {
      const hex = oklchToHex(`oklch(${l} ${c} ${h})`);
      const got = hexToOklab(hex);
      const want: [number, number, number] = [
        l,
        c * Math.cos(h * DEG2RAD),
        c * Math.sin(h * DEG2RAD),
      ];
      // 0.02 tolerance: 8-bit quantization + occasional gamut-edge clipping.
      // The previous fabricated math missed by ~1.0.
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(got[i] - want[i])).toBeLessThan(0.02);
      }
    }
  });

  it('parseOklch extracts percent and unitless forms', () => {
    expect(parseOklch('oklch(0.5 0.1 200)')).toEqual({ l: 0.5, c: 0.1, h: 200, alpha: 1 });
    expect(parseOklch('oklch(50% 0.1 200)')).toEqual({ l: 0.5, c: 0.1, h: 200, alpha: 1 });
    expect(parseOklch('oklch(50% 0.1 200 / 0.5)')).toEqual({ l: 0.5, c: 0.1, h: 200, alpha: 0.5 });
    expect(parseOklch('oklch(50% 0.1 200 / 50%)')).toEqual({ l: 0.5, c: 0.1, h: 200, alpha: 0.5 });
    expect(parseOklch('oklch(200% 0.1 200 / 150%)')).toEqual({ l: 2, c: 0.1, h: 200, alpha: 1 });
    expect(parseOklch('rgb(0 0 0)')).toBeNull();
  });
});
