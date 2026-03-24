/**
 * Tests for hooks barrel export
 */

import { describe, it, expect } from 'vitest';
import * as hooks from '../index';

describe('hooks barrel export', () => {
  it('should export useTheme', () => {
    expect(hooks.useTheme).toBeDefined();
    expect(typeof hooks.useTheme).toBe('function');
  });

  it('should export useLanguage', () => {
    expect(hooks.useLanguage).toBeDefined();
    expect(typeof hooks.useLanguage).toBe('function');
  });

  it('should export useTabs', () => {
    expect(hooks.useTabs).toBeDefined();
    expect(typeof hooks.useTabs).toBe('function');
  });

  it('should export useToast', () => {
    expect(hooks.useToast).toBeDefined();
    expect(typeof hooks.useToast).toBe('function');
  });

  it('should export useKeyboardShortcuts', () => {
    expect(hooks.useKeyboardShortcuts).toBeDefined();
    expect(typeof hooks.useKeyboardShortcuts).toBe('function');
  });

  it('should export useModalManager', () => {
    expect(hooks.useModalManager).toBeDefined();
    expect(typeof hooks.useModalManager).toBe('function');
  });

  it('should export useDiagramActions', () => {
    expect(hooks.useDiagramActions).toBeDefined();
    expect(typeof hooks.useDiagramActions).toBe('function');
  });

  it('should export useAppHandlers', () => {
    expect(hooks.useAppHandlers).toBeDefined();
    expect(typeof hooks.useAppHandlers).toBe('function');
  });

  it('should export useAppShortcuts', () => {
    expect(hooks.useAppShortcuts).toBeDefined();
    expect(typeof hooks.useAppShortcuts).toBe('function');
  });

  it('should export useModalProviderProps', () => {
    expect(hooks.useModalProviderProps).toBeDefined();
    expect(typeof hooks.useModalProviderProps).toBe('function');
  });

  it('should export all hooks as named exports', () => {
    const hookNames = [
      'useTheme',
      'useLanguage',
      'useTabs',
      'useToast',
      'useKeyboardShortcuts',
      'useModalManager',
      'useDiagramActions',
      'useAppHandlers',
      'useAppShortcuts',
      'useModalProviderProps'
    ];

    hookNames.forEach(name => {
      expect(hooks[name]).toBeDefined();
      expect(typeof hooks[name]).toBe('function');
    });
  });
});
