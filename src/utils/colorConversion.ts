/**
 * Color conversion utilities to ensure all colors are in hexadecimal format.
 * Required because khroma library (adjust, darken, lighten, invert) returns
 * colors in various formats (HSL, RGB, hex) depending on the input.
 */
import { adjust, darken, lighten, invert } from 'khroma';

/**
 * Convert any color format (hex, rgb, hsl) to hexadecimal format.
 * Handles both string formats and khroma library outputs.
 */
export function toHex(color: string): string {
  if (!color) return '#000000';

  // Already hex (6 or 8 characters)
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    // Expand 3/4 character hex to 6/8 characters
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    if (color.length === 5) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + color[4] + color[4];
    }
    return color;
  }

  // Create a temporary element to compute the color
  const temp = document.createElement('div');
  temp.style.color = color;
  document.body.appendChild(temp);
  const computed = window.getComputedStyle(temp).color;
  document.body.removeChild(temp);

  // Computed style returns rgb() or rgba() format
  const rgbMatch = computed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!rgbMatch) {
    // Fallback: try parsing as HSL
    return hslToHex(color);
  }

  const r = parseInt(rgbMatch[1], 10);
  const g = parseInt(rgbMatch[2], 10);
  const b = parseInt(rgbMatch[3], 10);

  return rgbToHex(r, g, b);
}

/**
 * Convert HSL string to hex.
 * Handles formats: 'hsl(h, s%, l%)', 'hsla(h, s%, l%, a)', and khroma's HSL output
 */
function hslToHex(hsl: string): string {
  // Extract H, S, L values - handle various formats
  let h = 0, s = 0, l = 0;

  // Try standard CSS format first
  const cssMatch = hsl.match(/hsla?\(([^,]+),\s*([^,]+)%,\s*([^,%]+)%/);
  if (cssMatch) {
    h = parseFloat(cssMatch[1]);
    s = parseFloat(cssMatch[2]);
    l = parseFloat(cssMatch[3]);
  } else {
    // Try khroma's format: 'hsl(214.2857142857, 0%, 81.3725490196%)'
    const khromaMatch = hsl.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (khromaMatch) {
      h = parseFloat(khromaMatch[1]);
      s = parseFloat(khromaMatch[2]);
      l = parseFloat(khromaMatch[3]);
    }
  }

  // HSL to RGB conversion
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return rgbToHex(r, g, b);
}

/**
 * Convert RGB values to hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Wrap khroma's adjust function to always return hex.
 */
export function adjustToHex(color: string, adjustment: { h?: number; s?: number; l?: number; r?: number; g?: number; b?: number }): string {
  const result = adjust(color, adjustment);
  return toHex(result);
}

/**
 * Wrap khroma's darken function to always return hex.
 */
export function darkenToHex(color: string, amount: number): string {
  const result = darken(color, amount);
  return toHex(result);
}

/**
 * Wrap khroma's lighten function to always return hex.
 */
export function lightenToHex(color: string, amount?: number): string {
  const result = lighten(color, amount);
  return toHex(result);
}

/**
 * Wrap khroma's invert function to always return hex.
 */
export function invertToHex(color: string): string {
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
