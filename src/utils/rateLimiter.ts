/**
 * Rate limiting utilities for API calls.
 * Provides in-memory rate limiting with automatic cleanup to prevent memory leaks.
 */

/**
 * Rate limit entry for tracking request counts per identifier
 */
interface RateLimitEntry {
  /** Number of requests made in the current window */
  count: number;
  /** Timestamp when the rate limit window resets (milliseconds since epoch) */
  resetTime: number;
}

/**
 * Rate limiter class for managing request rate limits.
 * Uses an in-memory Map to track request counts per identifier.
 * Automatically cleans up expired entries to prevent memory leaks.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter(10, 60000); // 10 requests per minute
 *
 * if (limiter.canMakeRequest('user-123')) {
 *   // Make the API call
 *   makeApiCall();
 * } else {
 *   // Handle rate limit exceeded
 *   console.log('Rate limit exceeded');
 * }
 * ```
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly entries: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  /**
   * Creates a new rate limiter
   *
   * @param maxRequests - Maximum number of requests allowed in the time window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.entries = new Map();
    this.cleanupInterval = null;

    // Start automatic cleanup every 60 seconds
    this.startCleanup();
  }

  /**
   * Checks if a request is allowed for the given identifier.
   * Increments the request count if allowed.
   *
   * @param identifier - Unique identifier (user ID, API key, IP address, etc.)
   * @returns true if request is allowed, false if rate limit exceeded
   */
  canMakeRequest(identifier: string): boolean {
    // Handle zero maxRequests (always block)
    if (this.maxRequests <= 0) {
      return false;
    }

    const now = Date.now();
    const entry = this.entries.get(identifier);

    // If no entry exists or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
      this.entries.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    // Check if limit has been exceeded
    if (entry.count >= this.maxRequests) {
      return false;
    }

    // Increment request count
    entry.count++;
    return true;
  }

  /**
   * Gets the number of remaining requests for the given identifier.
   *
   * @param identifier - Unique identifier
   * @returns Number of remaining requests, or maxRequests if no entry exists
   */
  getRemainingRequests(identifier: string): number {
    const entry = this.entries.get(identifier);
    const now = Date.now();

    // If no entry or window has expired, return max requests
    if (!entry || now >= entry.resetTime) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Gets the time in milliseconds until the rate limit resets.
   *
   * @param identifier - Unique identifier
   * @returns Milliseconds until reset, or 0 if no active limit
   */
  getResetTime(identifier: string): number {
    const entry = this.entries.get(identifier);
    const now = Date.now();

    // If no entry or window has expired, return 0
    if (!entry || now >= entry.resetTime) {
      return 0;
    }

    return entry.resetTime - now;
  }

  /**
   * Manually resets the rate limit for the given identifier.
   * Useful for admin functions or testing.
   *
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.entries.delete(identifier);
  }

  /**
   * Removes expired entries from the map to prevent memory leaks.
   * This is called automatically every 60 seconds.
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.entries.entries()) {
      if (now >= entry.resetTime) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.entries.delete(key);
    }
  }

  /**
   * Starts the automatic cleanup interval.
   * Runs every 60 seconds to remove expired entries.
   */
  private startCleanup(): void {
    // Clean up every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stops the automatic cleanup interval.
   * Call this when destroying the rate limiter to prevent memory leaks.
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }
}

/**
 * Rate limiter for AI API calls.
 * 20 requests per minute per user.
 *
 * Use this for limiting AI provider API calls (OpenAI, Anthropic, etc.)
 */
export const aiRateLimiter = new RateLimiter(20, 60000);

/**
 * Rate limiter for export operations.
 * 10 requests per minute per user.
 *
 * Use this for limiting expensive export operations (PNG, SVG, PDF generation)
 */
export const exportRateLimiter = new RateLimiter(10, 60000);
