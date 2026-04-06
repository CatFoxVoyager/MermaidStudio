/**
 * Production-safe logging utility
 *
 * In development, all logs are emitted to console
 * In production, only warnings and errors are logged
 *
 * Usage:
 * ```ts
 * import { log } from '@/utils/logger';
 * log.debug('Detailed info for debugging');
 * log.info('General information');
 * log.warn('Warning condition');
 * log.error('Error occurred', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Determine if we're in development mode
 */
const isDevelopment = import.meta.env.DEV;

/**
 * Format a log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const { level, message, timestamp, context, error } = entry;

  const parts = [
    `[${timestamp}]`,
    `[${level.toUpperCase()}]`,
    message,
  ];

  if (context) {
    parts.push(JSON.stringify(context));
  }

  if (error) {
    parts.push(`\n  Error: ${error.message}`);
    if (error.stack && isDevelopment) {
      parts.push(`\n  Stack: ${error.stack}`);
    }
  }

  return parts.join(' ');
}

/**
 * Core logging function
 */
function log(entry: LogEntry): void {
  // In production, suppress debug and info logs
  if (!isDevelopment && (entry.level === 'debug' || entry.level === 'info')) {
    return;
  }

  const formatted = formatLogEntry(entry);
  const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;
  console[consoleMethod](formatted);
}

/**
 * Logger API with descriptive method names
 */
export const logger = {
  /**
   * Debug-level logs - only emitted in development
   * Use for detailed debugging information that's not needed in production
   */
  debug(message: string, context?: Record<string, unknown>): void {
    log({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  },

  /**
   * Info-level logs - only emitted in development
   * Use for general informational messages
   */
  info(message: string, context?: Record<string, unknown>): void {
    log({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  },

  /**
   * Warning logs - always emitted
   * Use for warning conditions that should be visible in production
   */
  warn(message: string, context?: Record<string, unknown>): void {
    log({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context,
    });
  },

  /**
   * Error logs - always emitted
   * Use for errors that need to be visible in production
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    log({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error : undefined,
      context,
    });
  },

  /**
   * Create a scoped logger with a prefix
   * Useful for logging within specific modules
   *
   * @example
   * ```ts
   * const log = logger.scope('AI Panel');
   * log.info('Sending request'); // "[AI Panel] Sending request"
   * ```
   */
  scope(scopeName: string) {
    const prefix = `[${scopeName}]`;
    return {
      debug: (message: string, context?: Record<string, unknown>) =>
        logger.debug(`${prefix} ${message}`, context),
      info: (message: string, context?: Record<string, unknown>) =>
        logger.info(`${prefix} ${message}`, context),
      warn: (message: string, context?: Record<string, unknown>) =>
        logger.warn(`${prefix} ${message}`, context),
      error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
        logger.error(`${prefix} ${message}`, error, context),
    };
  }
};

// Export a default 'log' object for convenience
export { logger as log };

/**
 * LocalStorage abstraction with graceful error handling
 * Handles private browsing mode and other localStorage access issues
 */
export const storage = {
  /**
   * Get an item from localStorage
   * Returns null if localStorage is unavailable or key doesn't exist
   */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      log.debug('localStorage unavailable for get:', key);
      return null;
    }
  },

  /**
   * Set an item in localStorage
   * Silently fails if localStorage is unavailable
   */
  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      log.debug('localStorage unavailable for set:', key);
      return false;
    }
  },

  /**
   * Remove an item from localStorage
   * Silently fails if localStorage is unavailable
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      log.debug('localStorage unavailable for remove:', key);
      return false;
    }
  },
};
