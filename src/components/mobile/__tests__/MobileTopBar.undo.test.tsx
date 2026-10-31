/**
 * Undo/redo buttons in the mobile topbar (restore of the d1a62c2 removal,
 * user request 2026-10-04): taps dispatch CM6 history commands through the
 * codeViewRegistry seam, with the same pointerdown-preventDefault guard as
 * the cursor buttons so the soft keyboard stays open.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTopBar } from '../MobileTopBar';
import * as codeViewRegistry from '@/lib/editor/codeViewRegistry';

// 29-03: the CM6 commands are registry-sourced (registered by CodeEditor on
// mount; this suite renders the topbar standalone), so the mock seam is
// registerHistoryCommands — NOT a @codemirror/commands module mock.
const mockUndo = vi.fn();
const mockRedo = vi.fn();

describe('MobileTopBar undo/redo buttons', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onOpenCommandPalette: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    codeViewRegistry.registerHistoryCommands({ undo: mockUndo, redo: mockRedo });
  });

  afterEach(() => {
    codeViewRegistry.unregisterHistoryCommands();
  });

  it('renders undo and redo buttons', () => {
    render(<MobileTopBar {...defaultProps} />);
    expect(screen.getByTestId('mobile-topbar-undo')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-topbar-redo')).toBeInTheDocument();
  });

  it('dispatches undo through the registry and refocuses the view', async () => {
    const user = userEvent.setup();
    const mockView = { focus: vi.fn() };
    const activateSpy = vi.spyOn(codeViewRegistry, 'activateCodePane');
    vi.spyOn(codeViewRegistry, 'getCodeView').mockReturnValue(mockView as any);

    render(<MobileTopBar {...defaultProps} />);
    await user.click(screen.getByTestId('mobile-topbar-undo'));

    expect(activateSpy).toHaveBeenCalled();
    expect(mockUndo).toHaveBeenCalledWith(mockView);
    expect(mockView.focus).toHaveBeenCalled();
  });

  it('dispatches redo through the registry and refocuses the view', async () => {
    const user = userEvent.setup();
    const mockView = { focus: vi.fn() };
    vi.spyOn(codeViewRegistry, 'getCodeView').mockReturnValue(mockView as any);

    render(<MobileTopBar {...defaultProps} />);
    await user.click(screen.getByTestId('mobile-topbar-redo'));

    expect(mockRedo).toHaveBeenCalledWith(mockView);
    expect(mockView.focus).toHaveBeenCalled();
  });

  it('is inert when no live view is registered (no throw)', async () => {
    const user = userEvent.setup();
    vi.spyOn(codeViewRegistry, 'getCodeView').mockReturnValue(null);

    render(<MobileTopBar {...defaultProps} />);
    await user.click(screen.getByTestId('mobile-topbar-undo'));
    await user.click(screen.getByTestId('mobile-topbar-redo'));

    expect(mockUndo).not.toHaveBeenCalled();
    expect(mockRedo).not.toHaveBeenCalled();
  });

  it('prefers explicit onUndo/onRedo props over the registry fallback', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    vi.spyOn(codeViewRegistry, 'getCodeView').mockReturnValue({ focus: vi.fn() } as any);

    render(<MobileTopBar {...defaultProps} onUndo={onUndo} onRedo={onRedo} />);
    await user.click(screen.getByTestId('mobile-topbar-undo'));
    await user.click(screen.getByTestId('mobile-topbar-redo'));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('prevents default on pointerdown so the soft keyboard stays open', () => {
    render(<MobileTopBar {...defaultProps} />);
    const undoBtn = screen.getByTestId('mobile-topbar-undo');
    const prevented = !undoBtn.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    expect(prevented).toBe(true);
  });
});
