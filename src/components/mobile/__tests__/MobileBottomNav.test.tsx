import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileBottomNav } from '../MobileBottomNav';
import type { MobileView } from '@/hooks/useMobileShell';

describe('MobileBottomNav', () => {
  const mockSetActiveView = vi.fn();

  beforeEach(() => {
    mockSetActiveView.mockClear();
  });

  it('renders exactly 3 buttons with correct testids', () => {
    render(<MobileBottomNav activeView="edit" setActiveView={mockSetActiveView} />);

    expect(screen.getByTestId('mobile-nav-files')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav-edit')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav-ai')).toBeInTheDocument();
  });

  it('renders correct i18n labels', () => {
    render(<MobileBottomNav activeView="edit" setActiveView={mockSetActiveView} />);

    // i18n returns the key in test environment
    expect(screen.getByText('nav.files')).toBeInTheDocument();
    expect(screen.getByText('nav.edit')).toBeInTheDocument();
    expect(screen.getByText('nav.ai')).toBeInTheDocument();
  });

  it('calls setActiveView with correct id when Files button is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileBottomNav activeView="edit" setActiveView={mockSetActiveView} />);

    await user.click(screen.getByTestId('mobile-nav-files'));
    expect(mockSetActiveView).toHaveBeenCalledWith('files');
    expect(mockSetActiveView).toHaveBeenCalledTimes(1);
  });

  it('calls setActiveView with correct id when Edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileBottomNav activeView="files" setActiveView={mockSetActiveView} />);

    await user.click(screen.getByTestId('mobile-nav-edit'));
    expect(mockSetActiveView).toHaveBeenCalledWith('edit');
    expect(mockSetActiveView).toHaveBeenCalledTimes(1);
  });

  it('calls setActiveView with correct id when AI button is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileBottomNav activeView="edit" setActiveView={mockSetActiveView} />);

    await user.click(screen.getByTestId('mobile-nav-ai'));
    expect(mockSetActiveView).toHaveBeenCalledWith('ai');
    expect(mockSetActiveView).toHaveBeenCalledTimes(1);
  });

  it('applies active styling to files button when activeView is files', () => {
    const { container } = render(
      <MobileBottomNav activeView="files" setActiveView={mockSetActiveView} />
    );

    const filesButton = screen.getByTestId('mobile-nav-files');
    expect(filesButton).toHaveClass('text-[var(--accent)]', 'font-semibold');

    // Check border-top style via inline style
    expect(filesButton.style.getPropertyValue('border-top')).toBe('2px solid var(--accent)');
  });

  it('applies inactive styling to edit and ai buttons when activeView is files', () => {
    const { container } = render(
      <MobileBottomNav activeView="files" setActiveView={mockSetActiveView} />
    );

    const editButton = screen.getByTestId('mobile-nav-edit');
    const aiButton = screen.getByTestId('mobile-nav-ai');

    expect(editButton).toHaveClass('text-[var(--text-secondary)]');
    expect(editButton.style.getPropertyValue('border-top')).toBe('2px solid transparent');

    expect(aiButton).toHaveClass('text-[var(--text-secondary)]');
    expect(aiButton.style.getPropertyValue('border-top')).toBe('2px solid transparent');
  });

  it('applies active styling to edit button when activeView is edit', () => {
    const { container } = render(
      <MobileBottomNav activeView="edit" setActiveView={mockSetActiveView} />
    );

    const editButton = screen.getByTestId('mobile-nav-edit');
    expect(editButton).toHaveClass('text-[var(--accent)]', 'font-semibold');
    expect(editButton.style.getPropertyValue('border-top')).toBe('2px solid var(--accent)');
  });

  it('applies active styling to ai button when activeView is ai', () => {
    const { container } = render(
      <MobileBottomNav activeView="ai" setActiveView={mockSetActiveView} />
    );

    const aiButton = screen.getByTestId('mobile-nav-ai');
    expect(aiButton).toHaveClass('text-[var(--accent)]', 'font-semibold');
    expect(aiButton.style.getPropertyValue('border-top')).toBe('2px solid var(--accent)');
  });

  it('moves active styling when activeView changes from files to ai', () => {
    const { rerender } = render(
      <MobileBottomNav activeView="files" setActiveView={mockSetActiveView} />
    );

    // Initially files is active
    let filesButton = screen.getByTestId('mobile-nav-files');
    let aiButton = screen.getByTestId('mobile-nav-ai');

    expect(filesButton).toHaveClass('text-[var(--accent)]', 'font-semibold');
    expect(filesButton.style.getPropertyValue('border-top')).toBe('2px solid var(--accent)');
    expect(aiButton).toHaveClass('text-[var(--text-secondary)]');
    expect(aiButton.style.getPropertyValue('border-top')).toBe('2px solid transparent');

    // Change to ai
    rerender(<MobileBottomNav activeView="ai" setActiveView={mockSetActiveView} />);

    filesButton = screen.getByTestId('mobile-nav-files');
    aiButton = screen.getByTestId('mobile-nav-ai');

    // Now ai is active, files is inactive
    expect(filesButton).toHaveClass('text-[var(--text-secondary)]');
    expect(filesButton.style.getPropertyValue('border-top')).toBe('2px solid transparent');
    expect(aiButton).toHaveClass('text-[var(--accent)]', 'font-semibold');
    expect(aiButton.style.getPropertyValue('border-top')).toBe('2px solid var(--accent)');
  });

  it('does not apply safe-bottom or z-index token (slot owns them)', () => {
    const { container } = render(
      <MobileBottomNav activeView="edit" setActiveView={mockSetActiveView} />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();

    // Verify no safe-bottom or z-[var(--z-bottom-nav)] classes
    expect(nav?.className).not.toContain('safe-bottom');
    expect(nav?.className).not.toContain('z-[var(--z-bottom-nav)]');

    // Verify it has the expected height
    expect(nav).toHaveClass('h-[56px]');
  });
});