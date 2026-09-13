/**
 * CSS Color 4 `oklch()` → hex conversion (pure math, no DOM).
 *
 * Used by PNG export (ExportModal) because the canvas path cannot rely on
 * `oklch()` being understood everywhere the SVG travels — it rewrites oklch
 * colors to hex before rasterizing. Tailwind 4's palette is oklch-based, so
 * these values occur in real mermaid output.
 *
 * Implements the full pipeline from the CSS Color 4 spec / Björn Ottosson's
 * OKLab (https://bottosson.github.io/posts/oklab/):
 *   oklch → OKLab → LMS' → LMS (cube) → linear sRGB → gamma-encoded sRGB
 * replacing an earlier approximation that reused the oklch→OKLab a/b
 * coefficients as the OKLab→LMS matrix and emitted visibly wrong colors.
 */
export interface OklchComponents {
  /** Lightness, 0..1 (unitless form or percent/100) */
  l: number;
  /** Chroma, 0..~0.4 for sRGB-gamut colors */
  c: number;
  /** Hue in degrees */
  h: number;
  /** Alpha, 0..1 (defaults to 1) */
  alpha: number;
}

// Accepts `oklch(50% 0.1 200)`, `oklch(0.5 0.1 200)`, `oklch(0.5 0.1 200deg)`,
// `oklch(50% 0.1 200 / 0.5)`, `oklch(50% 0.1 200 / 50%)`, optional signs.
const OKLCH_PATTERN =
  /^oklch\s*\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:deg)?\s*(?:\/\s*([+-]?[\d.]+%?))?\s*\)$/i;

/**
 * Parse an `oklch(...)` string into components. Returns null when the string
 * is not a recognizable oklch color.
 */
export function parseOklch(oklchStr: string): OklchComponents | null {
  const match = oklchStr.match(OKLCH_PATTERN);
  if (!match) return null;

  // Per CSS Color 4, lightness and alpha accept either a number (0..1) or a
  // percentage — `oklch(0.5 ...)` and `oklch(50% ...)` are the same color.
  const toUnit = (raw: string) =>
    raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);

  return {
    l: toUnit(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
    alpha: match[4] !== undefined ? Math.min(1, Math.max(0, toUnit(match[4]))) : 1,
  };
}

const DEG2RAD = Math.PI / 180;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Linear-light sRGB → gamma-encoded sRGB (CSS Color 4 transfer function). */
const gammaEncode = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const toHexByte = (unit: number): string =>
  Math.round(clamp01(unit) * 255)
    .toString(16)
    .padStart(2, '0');

/**
 * Convert an `oklch(...)` color string to hex. Alpha is preserved: colors with
 * alpha < 1 come back as 8-digit `#rrggbbaa`, fully opaque as `#rrggbb`.
 * Returns '#333333' for unparseable input (export-compatibility fallback).
 */
export function oklchToHex(oklchStr: string): string {
  const parsed = parseOklch(oklchStr);
  if (!parsed) return '#333333';

  const { l, c, h, alpha } = parsed;
  const a = c * Math.cos(h * DEG2RAD);
  const b = c * Math.sin(h * DEG2RAD);

  // OKLab → LMS' (cone response, non-linear)
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055633458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  // Non-linearity: cube each component
  const lCubed = lPrime * lPrime * lPrime;
  const mCubed = mPrime * mPrime * mPrime;
  const sCubed = sPrime * sPrime * sPrime;

  // LMS → linear sRGB
  const rLinear = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const gLinear = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const bLinear = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  // Gamma-encode and clamp (colors outside the sRGB gamut clip)
  const hex = `#${toHexByte(gammaEncode(clamp01(rLinear)))}${toHexByte(
    gammaEncode(clamp01(gLinear))
  )}${toHexByte(gammaEncode(clamp01(bLinear)))}`;

  return alpha < 1 ? hex + toHexByte(alpha) : hex;
}
