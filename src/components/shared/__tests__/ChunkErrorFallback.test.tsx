import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChunkErrorFallback } from '../ChunkErrorFallback';

describe('ChunkErrorFallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the chunkLoadError line and a Reload button — no headings', () => {
    const { container } = render(<ChunkErrorFallback />);
    // react-i18next is globally mocked with a key-returning t: these assert
    // both the exact i18n keys and their real binding.
    expect(screen.getByText('common.chunkLoadError')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'update.reload' })).toBeInTheDocument();
    expect(container.querySelector('h1, h2, h3, h4')).toBeNull();
  });

  it('reloads the page when the button is clicked', () => {
    const reload = vi.fn();
    // window.location is unforgeable in jsdom, but this env's global bridge
    // is stubbable (probed: stubGlobal swaps what `window.location` reads).
    vi.stubGlobal('location', { reload });
    render(<ChunkErrorFallback />);
    fireEvent.click(screen.getByRole('button', { name: 'update.reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
