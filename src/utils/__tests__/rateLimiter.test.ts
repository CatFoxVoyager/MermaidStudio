import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, aiRateLimiter, exportRateLimiter } from '../rateLimiter';

describe('Rate Limiter Utilities', () => {
  describe('RateLimiter class', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter(5, 10000); // 5 requests per 10 seconds
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should allow first request', () => {
      const result = limiter.canMakeRequest('user1');
      expect(result).toBe(true);
    });

    it('should block requests after maxRequests reached', () => {
      // Make 5 requests (all should succeed)
      for (let i = 0; i < 5; i++) {
        expect(limiter.canMakeRequest('user1')).toBe(true);
      }

      // 6th request should be blocked
      expect(limiter.canMakeRequest('user1')).toBe(false);
    });

    it('should allow requests for different identifiers independently', () => {
      // User1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.canMakeRequest('user1')).toBe(true);
      }
      expect(limiter.canMakeRequest('user1')).toBe(false);

      // User2 should still be able to make requests
      expect(limiter.canMakeRequest('user2')).toBe(true);
    });

    it('should return correct remaining requests', () => {
      expect(limiter.getRemainingRequests('user1')).toBe(5);

      limiter.canMakeRequest('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(4);

      limiter.canMakeRequest('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(3);
    });

    it('should return correct reset time', () => {
      limiter.canMakeRequest('user1');
      const resetTime = limiter.getResetTime('user1');

      // Should be approximately 10 seconds (10000ms) from now
      expect(resetTime).toBeGreaterThan(9000);
      expect(resetTime).toBeLessThan(11000);
    });

    it('should reset after window expires', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.canMakeRequest('user1')).toBe(true);
      }
      expect(limiter.canMakeRequest('user1')).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(10500);

      // Should allow requests again
      expect(limiter.canMakeRequest('user1')).toBe(true);
    });

    it('should clean up expired entries automatically', () => {
      limiter.canMakeRequest('user1');
      limiter.canMakeRequest('user2');

      // Advance time past window
      vi.advanceTimersByTime(10500);

      // Trigger cleanup by making a new request
      limiter.canMakeRequest('user3');

      // Old entries should be cleaned up (reset to full capacity)
      expect(limiter.getRemainingRequests('user1')).toBe(5);
      expect(limiter.getRemainingRequests('user2')).toBe(5);
    });

    it('should allow manual reset of rate limit', () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.canMakeRequest('user1');
      }
      expect(limiter.canMakeRequest('user1')).toBe(false);

      // Reset manually
      limiter.reset('user1');

      // Should allow requests again
      expect(limiter.canMakeRequest('user1')).toBe(true);
    });

    it('should handle non-existent identifiers gracefully', () => {
      expect(limiter.getRemainingRequests('nonexistent')).toBe(5);
      expect(limiter.getResetTime('nonexistent')).toBe(0);

      // Reset should not throw
      expect(() => limiter.reset('nonexistent')).not.toThrow();
    });

    it('should track requests separately per identifier', () => {
      limiter.canMakeRequest('user1');
      limiter.canMakeRequest('user1');
      limiter.canMakeRequest('user2');

      expect(limiter.getRemainingRequests('user1')).toBe(3);
      expect(limiter.getRemainingRequests('user2')).toBe(4);
    });
  });

  describe('Singleton instances', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create aiRateLimiter with correct configuration', () => {
      expect(aiRateLimiter).toBeInstanceOf(RateLimiter);
      // Verify it works
      expect(aiRateLimiter.canMakeRequest('test-user')).toBe(true);
    });

    it('should create exportRateLimiter with correct configuration', () => {
      expect(exportRateLimiter).toBeInstanceOf(RateLimiter);
      // Verify it works
      expect(exportRateLimiter.canMakeRequest('test-user')).toBe(true);
    });

    it('should maintain independent rate limits for each singleton', () => {
      // AI rate limiter: 20 requests per minute
      for (let i = 0; i < 20; i++) {
        expect(aiRateLimiter.canMakeRequest('user1')).toBe(true);
      }
      expect(aiRateLimiter.canMakeRequest('user1')).toBe(false);

      // Export rate limiter should still allow requests for same user
      expect(exportRateLimiter.canMakeRequest('user1')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle empty identifier', () => {
      const limiter = new RateLimiter(5, 10000);
      expect(limiter.canMakeRequest('')).toBe(true);
    });

    it('should handle very long identifiers', () => {
      const limiter = new RateLimiter(5, 10000);
      const longId = 'x'.repeat(10000);
      expect(limiter.canMakeRequest(longId)).toBe(true);
    });

    it('should handle special characters in identifier', () => {
      const limiter = new RateLimiter(5, 10000);
      const specialId = 'user@example.com#123';
      expect(limiter.canMakeRequest(specialId)).toBe(true);
    });

    it('should handle zero maxRequests', () => {
      const limiter = new RateLimiter(0, 10000);
      expect(limiter.canMakeRequest('user1')).toBe(false);
    });

    it('should handle very short window (1ms)', () => {
      const limiter = new RateLimiter(1, 1);
      expect(limiter.canMakeRequest('user1')).toBe(true);

      // Advance time past window
      vi.advanceTimersByTime(10);

      // Should allow request again
      expect(limiter.canMakeRequest('user1')).toBe(true);
    });
  });
});
