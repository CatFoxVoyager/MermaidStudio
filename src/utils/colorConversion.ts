/**
 * Color conversion utilities to ensure all colors are in hexadecimal format.
 * Required because khroma library (adjust, darken, lighten, invert) returns
 * colors in various formats (HSL, RGB, hex) depending on the input.
 */
import { adjust, darken, lighten, invert } from 'khroma';

const HEX_BYTE: readonly string[] = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
);

const RGB_COMMA_RE =
  /^rgba?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?)\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?)\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?)(?:\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i;

const RGB_SPACE_RE =
  /^rgba?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?)\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?)\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?)(?:\s*\/\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i;

const HSL_COMMA_RE =
  /^hsla?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)%?\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)%?(?:\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i;

const HSL_SPACE_RE =
  /^hsla?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)%?\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)%?(?:\s*\/\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?))?\s*\)$/i;

function round10(n: number): number {
  return Math.round(n * 1e10) / 1e10;
}

function clamp100(n: number): number {
  return n >= 100 ? 100 : n < 0 ? 0 : n;
}

function clamp255(n: number): number {
  return n >= 255 ? 255 : n < 0 ? 0 : n;
}

/**
 * Pure-numeric equivalent of CSS Color 4 / @asamuzakjp/css-color
 * 4-significant-digit 8-bit channel rounding.
 */
function roundCss8Bit(unit: number): number {
  const x = unit * 255;
  if (x <= 0) return 0;
  if (x >= 255) return 255;
  const scaled =
    x >= 100
      ? Math.round(x * 10) / 10
      : x >= 10
        ? Math.round(x * 100) / 100
        : x >= 1
          ? Math.round(x * 1000) / 1000
          : x >= 0.1
            ? Math.round(x * 10000) / 10000
            : 0;
  const rounded = Math.round(scaled);
  return rounded <= 0 ? 0 : rounded >= 255 ? 255 : rounded;
}

function hexDigit(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

function parseOpaqueHexRgb(color: string): [number, number, number] | null {
  const len = color.length;
  if ((len !== 7 && len !== 4) || color.charCodeAt(0) !== 35) return null;
  if (len === 7) {
    const r1 = hexDigit(color.charCodeAt(1));
    const r2 = hexDigit(color.charCodeAt(2));
    const g1 = hexDigit(color.charCodeAt(3));
    const g2 = hexDigit(color.charCodeAt(4));
    const b1 = hexDigit(color.charCodeAt(5));
    const b2 = hexDigit(color.charCodeAt(6));
    if ((r1 | r2 | g1 | g2 | b1 | b2) < 0) return null;
    return [(r1 << 4) | r2, (g1 << 4) | g2, (b1 << 4) | b2];
  }
  const r = hexDigit(color.charCodeAt(1));
  const g = hexDigit(color.charCodeAt(2));
  const b = hexDigit(color.charCodeAt(3));
  if ((r | g | b) < 0) return null;
  return [r * 17, g * 17, b * 17];
}

function expandOpaqueHexPreserveCase(color: string): string {
  if (color.length === 4) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
}

function parseAnyHexPreserveCase(color: string): string | null {
  const len = color.length;
  if (color.charCodeAt(0) !== 35) return null;
  if (len === 7) {
    if (
      (hexDigit(color.charCodeAt(1)) |
        hexDigit(color.charCodeAt(2)) |
        hexDigit(color.charCodeAt(3)) |
        hexDigit(color.charCodeAt(4)) |
        hexDigit(color.charCodeAt(5)) |
        hexDigit(color.charCodeAt(6))) <
      0
    ) {
      return null;
    }
    return color;
  }
  if (len === 4) {
    if (
      (hexDigit(color.charCodeAt(1)) |
        hexDigit(color.charCodeAt(2)) |
        hexDigit(color.charCodeAt(3))) <
      0
    ) {
      return null;
    }
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  if (len === 9) {
    if (
      (hexDigit(color.charCodeAt(1)) |
        hexDigit(color.charCodeAt(2)) |
        hexDigit(color.charCodeAt(3)) |
        hexDigit(color.charCodeAt(4)) |
        hexDigit(color.charCodeAt(5)) |
        hexDigit(color.charCodeAt(6)) |
        hexDigit(color.charCodeAt(7)) |
        hexDigit(color.charCodeAt(8))) <
      0
    ) {
      return null;
    }
    return color;
  }
  if (len === 5) {
    if (
      (hexDigit(color.charCodeAt(1)) |
        hexDigit(color.charCodeAt(2)) |
        hexDigit(color.charCodeAt(3)) |
        hexDigit(color.charCodeAt(4))) <
      0
    ) {
      return null;
    }
    return (
      '#' +
      color[1] +
      color[1] +
      color[2] +
      color[2] +
      color[3] +
      color[3] +
      color[4] +
      color[4]
    );
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l * 100];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) * 60;
  } else {
    h = ((rn - gn) / d + 4) * 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHexDirect(h: number, s: number, l: number): string {
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
    return '#000000';
  }
  const hNorm = ((h % 360) + 360) % 360;
  const sClamped = clamp100(s);
  const lClamped = clamp100(l);
  const h12 = (hNorm / 360) * 12;
  const ln = lClamped / 100;
  const a = (sClamped / 100) * Math.min(ln, 1 - ln);
  const k0 = h12 % 12;
  const k8 = (8 + h12) % 12;
  const k4 = (4 + h12) % 12;
  const r = ln - a * Math.max(-1, Math.min(k0 - 3, 9 - k0, 1));
  const g = ln - a * Math.max(-1, Math.min(k8 - 3, 9 - k8, 1));
  const b = ln - a * Math.max(-1, Math.min(k4 - 3, 9 - k4, 1));
  return '#' + HEX_BYTE[roundCss8Bit(r)] + HEX_BYTE[roundCss8Bit(g)] + HEX_BYTE[roundCss8Bit(b)];
}

function startsWithRgbFn(s: string): boolean {
  const len = s.length;
  if (len < 4) return false;
  if ((s.charCodeAt(0) | 32) !== 114) return false; // 'r'
  if ((s.charCodeAt(1) | 32) !== 103) return false; // 'g'
  if ((s.charCodeAt(2) | 32) !== 98) return false; // 'b'
  const c3 = s.charCodeAt(3);
  if (c3 === 40) return true; // '('
  return len >= 5 && (c3 | 32) === 97 && s.charCodeAt(4) === 40; // 'a('
}

function startsWithHslFn(s: string): boolean {
  const len = s.length;
  if (len < 4) return false;
  if ((s.charCodeAt(0) | 32) !== 104) return false; // 'h'
  if ((s.charCodeAt(1) | 32) !== 115) return false; // 's'
  if ((s.charCodeAt(2) | 32) !== 108) return false; // 'l'
  const c3 = s.charCodeAt(3);
  if (c3 === 40) return true; // '('
  return len >= 5 && (c3 | 32) === 97 && s.charCodeAt(4) === 40; // 'a('
}

function parseRgbChannel(token: string): number {
  const isPercent = token.charCodeAt(token.length - 1) === 37;
  const raw = parseFloat(token);
  if (!Number.isFinite(raw)) return Number.NaN;
  if (isPercent) {
    return roundCss8Bit(raw / 100);
  }
  return Math.round(clamp255(raw));
}

function parseRgbString(str: string): string | null {
  const match = RGB_COMMA_RE.exec(str) || RGB_SPACE_RE.exec(str);
  if (!match) return null;
  const r = parseRgbChannel(match[1]);
  const g = parseRgbChannel(match[2]);
  const b = parseRgbChannel(match[3]);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  if (match[4] !== undefined && !Number.isFinite(parseFloat(match[4]))) return null;
  return '#' + HEX_BYTE[r] + HEX_BYTE[g] + HEX_BYTE[b];
}

function parseHslString(str: string): string | null {
  const match = HSL_COMMA_RE.exec(str) || HSL_SPACE_RE.exec(str);
  if (!match) return null;
  let h = parseFloat(match[1]);
  const unit = match[2];
  if (unit) {
    const lowerUnit = unit.toLowerCase();
    if (lowerUnit === 'grad') h *= 0.9;
    else if (lowerUnit === 'rad') h = (h * 180) / Math.PI;
    else if (lowerUnit === 'turn') h *= 360;
  }
  const s = parseFloat(match[3]);
  const l = parseFloat(match[4]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  if (match[5] !== undefined && !Number.isFinite(parseFloat(match[5]))) return null;
  return hslToHexDirect(h, s, l);
}

/**
 * Convert any color format (hex, rgb, hsl) to hexadecimal format.
 * Handles both string formats and khroma library outputs in pure JS without DOM mutations.
 */
export function toHex(color: string): string {
  if (!color) return '#000000';
  const trimmed = color.trim();
  if (!trimmed) return '#000000';

  if (trimmed.charCodeAt(0) === 35) {
    return parseAnyHexPreserveCase(trimmed) ?? '#000000';
  }

  if (startsWithRgbFn(trimmed)) {
    return parseRgbString(trimmed) ?? '#000000';
  }

  if (startsWithHslFn(trimmed)) {
    return parseHslString(trimmed) ?? '#000000';
  }

  // Fallback for named CSS colors or unrecognized non-hex/rgb/hsl formats
  if (typeof document !== 'undefined' && document.body) {
    const temp = document.createElement('div');
    temp.style.color = trimmed;
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
    if (computed) {
      return parseRgbString(computed) ?? '#000000';
    }
  }

  return '#000000';
}

/**
 * Parse an opaque `#rgb` or `#rrggbb` hex string directly into its raw
 * `[h, s, l]` tuple matching khroma's `rgb2hsl` output, or `null` otherwise.
 */
export function parseHexToHsl(color: string): readonly [number, number, number] | null {
  const rgb = parseOpaqueHexRgb(color);
  if (!rgb) return null;
  return rgbToHsl(rgb[0], rgb[1], rgb[2]);
}

/**
 * Apply an HSL delta directly to a pre-parsed `[h, s, l]` tuple and format as `#rrggbb`.
 */
export function adjustParsedHslToHex(
  hsl: readonly [number, number, number],
  dh: number,
  ds: number,
  dl: number
): string {
  const h = dh !== 0 ? (hsl[0] + dh) % 360 : hsl[0];
  const s = ds !== 0 ? clamp100(hsl[1] + ds) : hsl[1];
  const l = dl !== 0 ? clamp100(hsl[2] + dl) : hsl[2];
  return hslToHexDirect(round10(h), round10(s), round10(l));
}

/**
 * Wrap khroma's adjust function to always return hex.
 */
export function adjustToHex(
  color: string,
  adjustment: { h?: number; s?: number; l?: number; r?: number; g?: number; b?: number }
): string {
  const rgb = parseOpaqueHexRgb(color);
  if (rgb) {
    const dh = adjustment.h || 0;
    const ds = adjustment.s || 0;
    const dl = adjustment.l || 0;
    const dr = adjustment.r || 0;
    const dg = adjustment.g || 0;
    const db = adjustment.b || 0;
    const hasHsl = dh !== 0 || ds !== 0 || dl !== 0;
    const hasRgb = dr !== 0 || dg !== 0 || db !== 0;

    if (!hasHsl && !hasRgb) {
      return expandOpaqueHexPreserveCase(color);
    }
    if (hasRgb && !hasHsl) {
      const r = dr !== 0 ? Math.round(clamp255(rgb[0] + dr)) : rgb[0];
      const g = dg !== 0 ? Math.round(clamp255(rgb[1] + dg)) : rgb[1];
      const b = db !== 0 ? Math.round(clamp255(rgb[2] + db)) : rgb[2];
      return '#' + HEX_BYTE[r] + HEX_BYTE[g] + HEX_BYTE[b];
    }
    if (hasHsl && !hasRgb) {
      const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      return adjustParsedHslToHex(hsl, dh, ds, dl);
    }
  }
  const result = adjust(color, adjustment);
  return toHex(result);
}

/**
 * Wrap khroma's darken function to always return hex.
 *
 * `amount` is optional, mirroring lightenToHex and the themeDerivation
 * quadrant defaults, which call this with no amount. khroma's own .d.ts
 * requires a number, but the pass-through below is deliberate: a missing
 * amount has always reached khroma as NaN (invalid hsl → toHex falls back to
 * #000000), and substituting a numeric default here would change rendered
 * colors.
 */
export function darkenToHex(color: string, amount?: number): string {
  if (amount === undefined || Number.isNaN(amount)) return '#000000';
  const rgb = parseOpaqueHexRgb(color);
  if (rgb) {
    const [h0, s0, l0] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    const lNext = clamp100(l0 - amount);
    if (lNext === l0) {
      return expandOpaqueHexPreserveCase(color);
    }
    return hslToHexDirect(round10(h0), round10(s0), round10(lNext));
  }
  const result = darken(color, amount);
  return toHex(result);
}

/**
 * Wrap khroma's lighten function to always return hex.
 *
 * Same pass-through rationale as darkenToHex: khroma's .d.ts requires a
 * number, but callers may omit `amount`, and the resulting NaN path is the
 * long-standing runtime behavior.
 */
export function lightenToHex(color: string, amount?: number): string {
  if (amount === undefined || Number.isNaN(amount)) return '#000000';
  const rgb = parseOpaqueHexRgb(color);
  if (rgb) {
    const [h0, s0, l0] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    const lNext = clamp100(l0 + amount);
    if (lNext === l0) {
      return expandOpaqueHexPreserveCase(color);
    }
    return hslToHexDirect(round10(h0), round10(s0), round10(lNext));
  }
  const result = lighten(color, amount);
  return toHex(result);
}

/**
 * Wrap khroma's invert function to always return hex.
 */
export function invertToHex(color: string): string {
  const rgb = parseOpaqueHexRgb(color);
  if (rgb) {
    return '#' + HEX_BYTE[255 - rgb[0]] + HEX_BYTE[255 - rgb[1]] + HEX_BYTE[255 - rgb[2]];
  }
  const result = invert(color);
  return toHex(result);
}

/**
 * Ensure a color value is in hex format.
 * Useful for sanitizing user-provided colors or theme values.
 */
export function ensureHex(color: string | undefined): string {
  if (!color) return '#000000';
  return toHex(color);
}
