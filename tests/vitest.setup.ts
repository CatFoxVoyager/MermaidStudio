// Test setup file for Vitest
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IndexedDB for tests that use localStorage fallback
global.indexedDB = {
  open: vi.fn().mockImplementation(() => {
    const request: any = {
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
    };
    // Trigger error immediately to force localStorage fallback in tests
    setTimeout(() => {
      if (request.onerror) {
        request.error = new Error('IndexedDB not supported in test environment');
        request.onerror();
      }
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn().mockImplementation(() => {
    const request: any = {
      onerror: null,
      onsuccess: null,
    };
    setTimeout(() => {
      if (request.onsuccess) {request.onsuccess();}
    }, 0);
    return request;
  }),
  databases: vi.fn().mockResolvedValue([]),
} as any;
