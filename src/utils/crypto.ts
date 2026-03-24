/**
 * Cryptographically secure ID generation utilities.
 * Uses Web Crypto API for secure random number generation.
 */

/**
 * Generates a cryptographically secure random ID.
 * Uses 128 bits of entropy (16 bytes) encoded as hexadecimal.
 *
 * @param prefix - Optional prefix to add to the ID (e.g., 'diagram_')
 * @returns A secure random ID with optional prefix
 *
 * @example
 * ```ts
 * generateSecureId('diagram') // 'diagram_a1b2c3d4e5f6...'
 * generateSecureId() // 'a1b2c3d4e5f6...'
 * ```
 */
export function generateSecureId(prefix: string = ''): string {
  // Generate 16 bytes (128 bits) of random data
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Convert to hexadecimal string
  const hex = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  // Add prefix if provided
  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Generates a URL-safe base64 encoded ID.
 * Uses 128 bits of entropy (16 bytes).
 *
 * @returns A URL-safe base64 encoded ID without padding
 *
 * @example
 * ```ts
 * generateUrlSafeId() // 'k7JXm9kNQpR4f8Gw'
 * ```
 */
export function generateUrlSafeId(): string {
  // Generate 16 bytes (128 bits) of random data
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Convert to base64 and make URL-safe
  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')  // Replace + with -
    .replace(/\//g, '_')  // Replace / with _
    .replace(/=/g, '');   // Remove padding

  return base64;
}

/**
 * Validates if an ID has the correct format.
 * Checks for hex characters after an optional prefix.
 *
 * @param id - The ID to validate
 * @returns True if the ID format is valid
 *
 * @example
 * ```ts
 * isValidId('diagram_abc123') // true
 * isValidId('invalid!') // false
 * ```
 */
export function isValidId(id: string): boolean {
  if (!id || id.length === 0) {
    return false;
  }

  // Extract hex part (after prefix if exists)
  const hexPart = id.includes('_') ? id.split('_')[1] : id;

  // Must be 32 hex chars (128 bits)
  return /^[a-f0-9]{32}$/i.test(hexPart);
}
