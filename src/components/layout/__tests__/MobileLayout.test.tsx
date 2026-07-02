import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileLayout } from '../MobileLayout';

describe('MobileLayout', () => {
  it('should render root with h-dvh class and mobile-layout-root testid', () => {
    const { container } = render(<MobileLayout theme="light" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('h-dvh');
    expect(root.className).not.toContain('h-screen');
    expect(root.getAttribute('data-testid')).toBe('mobile-layout-root');
  });

  it('should render dark class when theme is dark', () => {
    const { container } = render(<MobileLayout theme="dark" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('dark');
  });

  it('should not render dark class when theme is light', () => {
    const { container } = render(<MobileLayout theme="light" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain('dark');
  });

  it('should render three placeholder slots with correct testids', () => {
    render(<MobileLayout theme="light" />);
    expect(screen.getByTestId('mobile-topbar-slot')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-workspace-slot')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-bottomnav-slot')).toBeInTheDocument();
  });

  it('should apply per-zone safe-area utilities (never on root)', () => {
    const { container } = render(<MobileLayout theme="light" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain('safe-top');
    expect(root.className).not.toContain('safe-bottom');

    const topbarSlot = screen.getByTestId('mobile-topbar-slot');
    expect(topbarSlot.className).toContain('safe-top');

    const bottomnavSlot = screen.getByTestId('mobile-bottomnav-slot');
    expect(bottomnavSlot.className).toContain('safe-bottom');
  });

  it('should apply z-index token only to bottom-nav slot', () => {
    render(<MobileLayout theme="light" />);
    const bottomnavSlot = screen.getByTestId('mobile-bottomnav-slot');
    expect(bottomnavSlot.className).toContain('z-[var(--z-bottom-nav)]');

    const topbarSlot = screen.getByTestId('mobile-topbar-slot');
    expect(topbarSlot.className).not.toContain('z-[var(--z-');
  });

  it('should inherit surface vars from existing design system', () => {
    const { container } = render(<MobileLayout theme="light" />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.background).toBe('var(--surface-base)');
    expect(root.style.color).toBe('var(--text-primary)');
  });
});
