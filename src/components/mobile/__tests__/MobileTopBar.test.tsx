import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTopBar } from '../MobileTopBar';

describe('MobileTopBar', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onNewDiagram: vi.fn(),
    onOpenCommandPalette: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the header with mobile-topbar testid', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      expect(header).toBeInTheDocument();
      expect(header.tagName).toBe('HEADER');
    });

    it('should render brand with Mermaid, Studio, and version', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      const brandText = header.textContent;
      expect(brandText).toMatch(/Mermaid.*Studio/);
      expect(brandText).toMatch(/v\d+\.\d+\.\d+/); // Version format
    });

    it('should render all three action buttons when onNewDiagram is provided', () => {
      render(<MobileTopBar {...defaultProps} />);
      expect(screen.getByTestId('mobile-topbar-new')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-topbar-save')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-topbar-overflow')).toBeInTheDocument();
    });

    it('should not render New button when onNewDiagram is undefined', () => {
      const props = { ...defaultProps, onNewDiagram: undefined };
      render(<MobileTopBar {...props} />);
      expect(screen.queryByTestId('mobile-topbar-new')).not.toBeInTheDocument();
      expect(screen.getByTestId('mobile-topbar-save')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-topbar-overflow')).toBeInTheDocument();
    });

    it('should have proper structural layout for 375px fit', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      expect(header.className).toContain('justify-between');
      // The brand container should be flex and use gap-2 (structural fit)
      const brandContainer = header.firstChild as HTMLElement;
      expect(brandContainer.className).toContain('flex');
      expect(brandContainer.className).toContain('items-center');
      expect(brandContainer.className).toContain('gap-2');
    });
  });

  describe('interactions', () => {
    it('should call onNewDiagram when New button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} />);
      const newButton = screen.getByTestId('mobile-topbar-new');
      await user.click(newButton);
      expect(defaultProps.onNewDiagram).toHaveBeenCalled();
    });

    it('should call onSave when Save button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} />);
      const saveButton = screen.getByTestId('mobile-topbar-save');
      await user.click(saveButton);
      expect(defaultProps.onSave).toHaveBeenCalled();
    });

    it('should call onOpenCommandPalette when overflow button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileTopBar {...defaultProps} />);
      const overflowButton = screen.getByTestId('mobile-topbar-overflow');
      await user.click(overflowButton);
      expect(defaultProps.onOpenCommandPalette).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-labels on all buttons', () => {
      render(<MobileTopBar {...defaultProps} />);

      const newButton = screen.getByTestId('mobile-topbar-new');
      expect(newButton).toHaveAttribute('aria-label');
      expect(newButton.getAttribute('aria-label')).toBeTruthy();

      const saveButton = screen.getByTestId('mobile-topbar-save');
      expect(saveButton).toHaveAttribute('aria-label');
      expect(saveButton.getAttribute('aria-label')).toBeTruthy();

      const overflowButton = screen.getByTestId('mobile-topbar-overflow');
      expect(overflowButton).toHaveAttribute('aria-label');
      expect(overflowButton.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have header with proper semantic structure', () => {
      render(<MobileTopBar {...defaultProps} />);
      const header = screen.getByTestId('mobile-topbar');
      expect(header.tagName).toBe('HEADER');
      expect(header).toHaveAttribute('role', 'banner');
    });
  });
});
