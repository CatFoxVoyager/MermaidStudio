/**
 * Tests for the model-download framing notice in the AI panel empty state
 * (SXO/audit M5 + Phase 4).
 *
 * A first-time visitor who opens the AI panel has no idea that the first
 * message triggers a ~400–700 MB one-off model download (cached afterwards,
 * offline ever since). The empty state must say so — but only while the model
 * is not loaded yet. i18n is mocked with t(key) => key, so assertions target
 * the keys; `isModelLoaded` is mocked per test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIPanel } from '../AIPanel';

// Referentially stable `t` (real react-i18next memoizes it): AIPanel's
// fix-mode effect lists `t` in its dependency array, and a per-call closure
// re-fires it every render (see AIPanel.test.tsx for the full post-mortem).
const { mockT, mockIsModelLoaded } = vi.hoisted(() => ({
  mockT: (key: string) => key,
  mockIsModelLoaded: vi.fn(() => false),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

vi.mock('@/services/storage/database', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storage/database')>();
  return {
    ...actual,
    getSettings: vi.fn(() =>
      Promise.resolve({
        ai_machine_size: 'low',
        ai_api_key: '',
        ai_model: '',
        ai_base_url: '',
        theme: 'dark',
        language: 'en',
      })
    ),
  };
});

vi.mock('@/services/ai/providers', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/ai/providers')>();
  return {
    ...actual,
    isModelLoaded: mockIsModelLoaded,
    callAI: vi.fn(() => Promise.resolve('flowchart LR\n  A-->B')),
    getMachineConfig: vi.fn(() => ({
      id: 'qwen3.5-0.8b-mermaid',
      label: 'Low Memory',
    })),
    isMachineAvailable: vi.fn(() => true),
  };
});

Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: vi.fn(() => Promise.resolve()) },
  configurable: true,
});

Element.prototype.scrollIntoView = vi.fn();

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `test-${Math.random()}`),
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    }),
  },
  writable: true,
});

describe('AIPanel - model download notice', () => {
  const mockProps = {
    currentContent: '',
    onApply: vi.fn(),
    onClose: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('frames the one-off model download in the empty state while the model is not loaded', () => {
    mockIsModelLoaded.mockReturnValue(false);
    render(<AIPanel {...mockProps} />);
    expect(screen.getByText(/ai\.modelDownloadNotice/)).toBeInTheDocument();
  });

  it('hides the notice once the model is loaded', () => {
    mockIsModelLoaded.mockReturnValue(true);
    render(<AIPanel {...mockProps} />);
    expect(screen.queryByText(/ai\.modelDownloadNotice/)).not.toBeInTheDocument();
  });
});
