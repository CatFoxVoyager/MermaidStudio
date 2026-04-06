/**
 * Encryption utilities for API key storage.
 * Uses Web Crypto API with AES-GCM-256 encryption.
 */

import { logger } from '@/utils/logger';

const log = logger.scope('encryption');

// Key material and salt for client-side encryption.
// SECURITY NOTE: This provides obfuscation rather than true security since the key
// is embedded in the JavaScript bundle. A determined attacker with access to
// the built JS can decrypt stored API keys. For true secret protection,
// a user-derived key (master password) would be needed. This is acceptable
// for a local-first app where the API key is already present in browser memory.
const KEY_MATERIAL = 'mermaid_studio_v1_enc';
const SALT = 'mermaid-studio-salt';

// Encryption parameters
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes (96 bits) - standard for GCM
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a cryptographic key from the master key material.
 * Uses PBKDF2 with SHA-256 for key derivation.
 *
 * @returns A CryptoKey for AES-GCM encryption
 */
async function deriveKey(): Promise<CryptoKey> {
  // Encode key material and salt
  const encoder = new TextEncoder();
  const keyMaterialBytes = encoder.encode(KEY_MATERIAL);
  const saltBytes = encoder.encode(SALT);

  // Import key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    keyMaterialBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM-256.
 * Each encryption uses a unique IV (Initialization Vector) to prevent
 * pattern analysis and ensure semantic security.
 *
 * The output format is: base64(IV + ciphertext)
 * where IV is 12 bytes and ciphertext is variable length.
 *
 * @param data - The plaintext data to encrypt
 * @returns Base64-encoded encrypted data (IV + ciphertext)
 *
 * @example
 * ```ts
 * const encrypted = encrypt('my-api-key');
 * const decrypted = decrypt(encrypted);
 * console.log(decrypted); // 'my-api-key'
 * ```
 */
export async function encrypt(data: string): Promise<string> {
  if (!data) {
    return '';
  }

  try {
    const key = await deriveKey();

    // Generate a unique IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode the data
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(data);

    // Encrypt using AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      plaintextBytes
    );

    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    log.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypts data that was encrypted with the encrypt() function.
 * Extracts the IV from the first 12 bytes, then decrypts the remaining ciphertext.
 *
 * @param encryptedData - Base64-encoded encrypted data (IV + ciphertext)
 * @returns The decrypted plaintext, or empty string if decryption fails
 *
 * @example
 * ```ts
 * const encrypted = encrypt('my-api-key');
 * const decrypted = decrypt(encrypted);
 * console.log(decrypted); // 'my-api-key'
 *
 * const corrupted = 'not-valid-base64';
 * decrypt(corrupted); // '' (empty string on error)
 * ```
 */
export async function decrypt(encryptedData: string): Promise<string> {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = await deriveKey();

    // Decode base64
    const combined = atob(encryptedData);
    const combinedBytes = new Uint8Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      combinedBytes[i] = combined.charCodeAt(i);
    }

    // Extract IV and ciphertext
    const iv = combinedBytes.slice(0, IV_LENGTH);
    const ciphertext = combinedBytes.slice(IV_LENGTH);

    // Decrypt using AES-GCM
    const plaintext = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      ciphertext
    );

    // Decode the result
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    // Return empty string on any decryption error
    log.error('Decryption error:', error);
    return '';
  }
}
