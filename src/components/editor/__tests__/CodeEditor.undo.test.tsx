/**
 * Undo/redo keyboard bindings for CodeEditor (bug 2026-10-04).
 *
 * Root cause of the user-reported "undo/redo ne fonctionne pas": CM6's
 * historyKeymap does NOT bind Mod-Shift-z on Windows/Linux (its redo keys
 * are Mod-y, with Mod-Shift-z only as a mac variant of the Mod-y entry).
 * Ctrl+Shift+Z therefore falls through to the browser's NATIVE contenteditable
 * undo, which destroys text outside CM6's history — the user sees redo
 * "delete" characters instead of restoring them.
 *
 * These pins require the editor's own keymap to carry an explicit
 * Mod-Shift-z → redoCommand binding (the app's shortcut help already
 * documents Ctrl+Shift+Z as Redo, see KeyboardShortcuts.tsx).
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { redo } from '@codemirror/commands';
import { CodeEditor } from '../CodeEditor';
import type { CodeEditorRef } from '../CodeEditor';

function typeIntoView(view: EditorView, text: string): void {
  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.to, insert: text },
    selection: { anchor: sel.to + text.length },
    userEvent: 'input.type',
  });
}

function pressKey(container: HTMLElement, key: string, mods: { ctrl?: boolean; shift?: boolean } = {}): void {
  const content = container.querySelector('.cm-content') as HTMLElement | null;
  const target = content ?? (container.querySelector('.cm-editor') as HTMLElement);
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: !!mods.ctrl,
      shiftKey: !!mods.shift,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('CodeEditor undo/redo keybindings', () => {
  let mockOnChange: Mock<(v: string) => void>;

  beforeEach(() => {
    mockOnChange = vi.fn<(v: string) => void>();
  });

  function setup(value = 'graph TD') {
    const ref = createRef<CodeEditorRef>();
    const { container } = render(<CodeEditor ref={ref} value={value} onChange={mockOnChange} theme="light" />);
    const view = ref.current!.getView();
    if (!view) throw new Error('EditorView not mounted');
    view.focus();
    const cursor = view.state.doc.length;
    view.dispatch({ selection: { anchor: cursor } });
    return { container, view: view as EditorView };
  }

  it('undoes with Ctrl+Z', () => {
    const { container, view } = setup();
    typeIntoView(view, 'abc');
    expect(view.state.doc.toString()).toBe('graph TDabc');

    pressKey(container, 'z', { ctrl: true });
    expect(view.state.doc.toString()).toBe('graph TD');
  });

  it('redoes with Ctrl+Shift+Z (the binding the in-app shortcut help documents)', () => {
    const { container, view } = setup();
    typeIntoView(view, 'abc');
    pressKey(container, 'z', { ctrl: true });
    expect(view.state.doc.toString()).toBe('graph TD');

    pressKey(container, 'z', { ctrl: true, shift: true });
    expect(view.state.doc.toString()).toBe('graph TDabc');
  });

  it('redoes with Ctrl+Y (CM6 native redo key)', () => {
    const { container, view } = setup();
    typeIntoView(view, 'abc');
    pressKey(container, 'z', { ctrl: true });
    pressKey(container, 'y', { ctrl: true });
    expect(view.state.doc.toString()).toBe('graph TDabc');
  });

  it('redo command is importable for the keymap pin', () => {
    // Sanity: the binding added to the editor's keymap wraps this command.
    expect(typeof redo).toBe('function');
  });
});
