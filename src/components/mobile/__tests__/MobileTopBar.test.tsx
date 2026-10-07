import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTopBar } from '../MobileTopBar';

/**
 * Current mobile topbar contract (2026-10 rework): "MS" wordmark + six icon
 * actions — undo/redo were restored by user request (2026-10-04, see
 * MobileTopBar.undo.test.tsx for dispatch details), Save is dirty-aware
 * (disabled + dimmed when clean, amber dot when dirty), and the overflow
 * button opens the Menu sheet, so its accessible name says Menu (critique
 * iter-7: "Commands" was a lie screen readers read).
 *
 * The former tests asserted a removed generation of this bar (New button,
 * full-wordmark brand, version-badge About entry) and were rewritten to
 * the shipped component.
 */

describe('MobileTopBar', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onExport: vi.fn(),
    onToggleTheme: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onOpenMenu: vi.fn(),
    isDirty: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the header with mobile-topbar testid', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('HEADER');
      expect(header).toHaveAttribute('role', 'banner');
    });

    it('renders the compact MS wordmark with the full name accessible', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      // Compact mark (iter-9): "MermaidStudio" measured 113px in the 68px
      // available — ellipsis ate the brand on every view. The full name
      // rides as the accessible label of the wordmark span (iter-14: the h1
      // shows the ACTIVE DIAGRAM title while editing; without a title the
      // wordmark returns).
      expect(header.textContent).toContain('MS');
      const wordmark = header.querySelector('h1 span[aria-label]');
      expect(wordmark).toHaveAttribute('aria-label', 'MermaidStudio');
      // The About version badge was removed — About lives in the menu sheet.
      expect(header.textContent).not.toMatch(/v\d+\.\d+\.\d+/);
      expect(screen.queryByTestId('mobile-topbar-about')).not.toBeInTheDocument();
      // No New button in this generation of the bar.
      expect(screen.queryByTestId('mobile-topbar-new')).not.toBeInTheDocument();
    });

    it('renders the MS wordmark permanently (user decision 2026-10-06, mirrored from the -app)', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      expect(header.textContent).not.toContain('Welcome Diagram');
      expect(header.querySelector('h1')?.textContent).toBe('MS');
    });

    it('renders the six action buttons', () => {
      render(<MobileTopBar {...defaultProps} />);
      const ids = [
        'mobile-topbar-undo',
        'mobile-topbar-redo',
        'mobile-topbar-save',
        'mobile-topbar-export',
        'mobile-topbar-theme',
        'mobile-topbar-overflow',
      ];
      ids.forEach(id => expect(screen.getByTestId(id)).toBeInTheDocument());
    });

    it('keeps the structural two-sided layout', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      expect(header.className).toContain('justify-between');
      const brandContainer = header.firstChild as HTMLElement;
      expect(brandContainer.className).toContain('flex');
      expect(brandContainer.className).toContain('items-center');
    });
  });

  describe('save dirty state (critique iter-7: no save signal anywhere)', () => {
    it('is disabled and dimmed when clean', () => {
      render(<MobileTopBar {...defaultProps} isDirty={false} />);
      const save = screen.getByTestId('mobile-topbar-save');
      expect(save).toBeDisabled();
      expect(screen.queryByTestId('mobile-topbar-dirty-dot')).not.toBeInTheDocument();
    });

    it('is enabled and shows the amber dirty dot when dirty', () => {
      render(<MobileTopBar {...defaultProps} isDirty />);
      const save = screen.getByTestId('mobile-topbar-save');
      expect(save).toBeEnabled();
      expect(screen.getByTestId('mobile-topbar-dirty-dot')).toBeInTheDocument();
    });

    it('calls onSave when dirty', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} isDirty />);
      await user.click(screen.getByTestId('mobile-topbar-save'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('interactions', () => {
    it('calls onExport when Export is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} />);
      await user.click(screen.getByTestId('mobile-topbar-export'));
      expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
    });

    it('calls onToggleTheme when the theme button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} />);
      await user.click(screen.getByTestId('mobile-topbar-theme'));
      expect(defaultProps.onToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('opens the Menu sheet from the overflow button', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} />);
      await user.click(screen.getByTestId('mobile-topbar-overflow'));
      expect(defaultProps.onOpenMenu).toHaveBeenCalledTimes(1);
      expect(defaultProps.onOpenCommandPalette).not.toHaveBeenCalled();
    });

    it('falls back to the command palette when no menu handler is wired', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} onOpenMenu={undefined} />);
      await user.click(screen.getByTestId('mobile-topbar-overflow'));
      expect(defaultProps.onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('labels every action button', () => {
      render(<MobileTopBar {...defaultProps} />);
      const ids = [
        'mobile-topbar-undo',
        'mobile-topbar-redo',
        'mobile-topbar-save',
        'mobile-topbar-export',
        'mobile-topbar-theme',
        'mobile-topbar-overflow',
      ];
      ids.forEach(id => {
        const el = screen.getByTestId(id);
        expect(el).toHaveAttribute('aria-label');
        expect(el.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('names the overflow button Menu, not Commands', () => {
      render(<MobileTopBar {...defaultProps} />);
      const overflow = screen.getByTestId('mobile-topbar-overflow');
      expect(overflow.getAttribute('aria-label')).not.toBe('header.commandPalette');
      expect(overflow.getAttribute('aria-label')).toMatch(/menu/i);
    });
  });
});
