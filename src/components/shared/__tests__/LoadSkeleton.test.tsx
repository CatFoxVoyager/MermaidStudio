import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render } from '@testing-library/react';
import { LoadSkeleton } from '../LoadSkeleton';

describe('LoadSkeleton', () => {
  it('renders exactly one 32px ring with the UI-SPEC tokens', () => {
    const { container } = render(<LoadSkeleton />);
    const rings = container.querySelectorAll('.animate-spin');
    expect(rings).toHaveLength(1);
    const ring = rings[0];
    expect(ring).toHaveClass(
      'w-8',
      'h-8',
      'rounded-full',
      'border-2',
      'border-t-transparent',
      'animate-spin',
    );
    // jsdom's cssstyle keeps the border-top-color longhand but silently
    // drops `border-color: var(...)` (shorthand expansion rejects var()),
    // so the top-arc token asserts through the DOM and the ring-body token
    // is pinned at source — the same bytes the bundler ships.
    expect((ring as HTMLElement).style.getPropertyValue('border-top-color')).toBe('var(--accent)');
    const src = readFileSync(resolve(__dirname, '../LoadSkeleton.tsx'), 'utf8');
    expect(src).toContain("borderColor: 'var(--border-strong)'");
  });

  it('is presenter-only: no text, hidden from assistive tech, centered host cell', () => {
    const { container } = render(<LoadSkeleton />);
    expect(container.textContent).toBe('');
    const host = container.firstElementChild as HTMLElement;
    expect(host).toHaveAttribute('aria-hidden', 'true');
    expect(host).toHaveAttribute('role', 'presentation');
    expect(host).toHaveClass('flex', 'h-full', 'w-full', 'items-center', 'justify-center');
  });
});
