import { describe, it, expect } from 'vitest';
import { generateSecureId, generateUrlSafeId, isValidId } from '../crypto';
import { encrypt, decrypt } from '../encryption';

describe('Crypto Utilities', () => {
  describe('generateSecureId', () => {
    it('should generate unique IDs with correct format', () => {
      const id1 = generateSecureId('test');
      const id2 = generateSecureId('test');

      // Should have prefix
      expect(id1).toMatch(/^test_/);
      expect(id2).toMatch(/^test_/);

      // Should be unique
      expect(id1).not.toBe(id2);

      // Should be 32 hex chars (128 bits) after prefix
      const hexPart = id1.replace('test_', '');
      expect(hexPart).toHaveLength(32);
      expect(hexPart).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should work without prefix', () => {
      const id = generateSecureId();
      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('generateUrlSafeId', () => {
    it('should generate URL-safe base64 encoded IDs', () => {
      const id = generateUrlSafeId();

      // Should be base64 url-safe (no +, /, or = padding)
      expect(id).not.toMatch(/[+//=]/);

      // Should be consistent length
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = generateUrlSafeId();
      const id2 = generateUrlSafeId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidId', () => {
    it('should validate correct ID format', () => {
      const validId = generateSecureId('test');
      expect(isValidId(validId)).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId('invalid')).toBe(false);
      expect(isValidId('test_invalid_hex_chars!')).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should successfully roundtrip data', async () => {
      const plaintext = 'my-secret-api-key-12345';
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', async () => {
      const encrypted = await encrypt('');
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', async () => {
      const plaintext = 'key-with-special-chars-!@#$%^&*()';
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle corrupted data gracefully', async () => {
      // Corrupted base64
      const corrupted = 'not-valid-base64!!!';
      const result = await decrypt(corrupted);
      expect(result).toBe('');
    });

    it('should handle truncated data', async () => {
      const validEncrypted = await encrypt('test-data');
      const truncated = validEncrypted.substring(0, 10);
      const result = await decrypt(truncated);
      expect(result).toBe('');
    });

    it('should use unique IV per encryption', async () => {
      const plaintext = 'same-data';
      const encrypted1 = await encrypt(plaintext);
      const encrypted2 = await encrypt(plaintext);

      // Encrypted data should be different (different IVs)
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt correctly
      expect(await decrypt(encrypted1)).toBe(plaintext);
      expect(await decrypt(encrypted2)).toBe(plaintext);
    });

    it('should produce base64-encoded output', async () => {
      const encrypted = await encrypt('test-data');
      // Should be valid base64
      expect(() => atob(encrypted)).not.toThrow();
    });
  });
});
