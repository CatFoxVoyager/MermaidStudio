/**
 * Undo/redo buttons in the mobile topbar (restore of the d1a62c2 removal,
 * user request 2026-10-04): taps dispatch CM6 history commands through the
 * codeViewRegistry seam, with the same pointerdown-preventDefault guard as
 * the cursor buttons so the soft keyboard stays open.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTopBar } from '../MobileTopBar';
import * as codeViewRegistry from '@/lib/editor/codeViewRegistry';
import * as cmCommands from '@codemirror/commands';

vi.mock('@codemirror/commands', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codemirror/commands')>();
  return {
    ...actual,
    undo: vi.fn(),
    redo: vi.fn(),
  };
});

describe('MobileTopBar undo/redo buttons', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onOpenCommandPalette: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(cmCommands.undo).toHaveBeenCalledWith(mockView);
    expect(mockView.focus).toHaveBeenCalled();
  });

  it('dispatches redo through the registry and refocuses the view', async () => {
    const user = userEvent.setup();
    const mockView = { focus: vi.fn() };
    vi.spyOn(codeViewRegistry, 'getCodeView').mockReturnValue(mockView as any);

    render(<MobileTopBar {...defaultProps} />);
    await user.click(screen.getByTestId('mobile-topbar-redo'));

    expect(cmCommands.redo).toHaveBeenCalledWith(mockView);
    expect(mockView.focus).toHaveBeenCalled();
  });

  it('is inert when no live view is registered (no throw)', async () => {
    const user = userEvent.setup();
    vi.spyOn(codeViewRegistry, 'getCodeView').mockReturnValue(null);

    render(<MobileTopBar {...defaultProps} />);
    await user.click(screen.getByTestId('mobile-topbar-undo'));
    await user.click(screen.getByTestId('mobile-topbar-redo'));

    expect(cmCommands.undo).not.toHaveBeenCalled();
    expect(cmCommands.redo).not.toHaveBeenCalled();
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
    expect(cmCommands.undo).not.toHaveBeenCalled();
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
