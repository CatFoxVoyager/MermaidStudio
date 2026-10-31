/**
 * Undo/redo dispatch helpers — the shared seam for undo/redo buttons
 * (mobile topbar + desktop toolbar). They surface the code pane (no-op on
 * desktop), fetch the live EditorView from the registry, run the CM6
 * command, and hand focus back so the next keystroke lands in the editor.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { undo, redo } from '@codemirror/commands';
import { redoInView, undoInView } from '../historyActions';
import {
  registerCodeViewAccessor,
  unregisterCodeViewAccessor,
  registerHistoryCommands,
  unregisterHistoryCommands,
} from '../codeViewRegistry';

describe('historyActions', () => {
  let parent: HTMLDivElement;
  let view: EditorView;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    view = new EditorView({
      state: EditorState.create({ doc: '', extensions: [basicSetup] }),
      parent,
    });
    registerCodeViewAccessor(() => view);
    // 29-03: production registers the CM6 commands from inside CodeEditor;
    // tests may touch CM directly — register the REAL pair so the pinned
    // sync-boolean assertions below exercise the actual commands.
    registerHistoryCommands({ undo, redo });
  });

  afterEach(() => {
    unregisterCodeViewAccessor();
    unregisterHistoryCommands();
    view.destroy();
    parent.remove();
  });

  it('returns false when no view is registered', () => {
    unregisterCodeViewAccessor();
    expect(undoInView()).toBe(false);
    expect(redoInView()).toBe(false);
  });

  it('returns false when no commands are registered (inert-tap contract, 29-03)', () => {
    unregisterHistoryCommands();
    expect(undoInView()).toBe(false);
    expect(redoInView()).toBe(false);
  });

  it('undoInView undoes a dispatched insertion and returns true', () => {
    const sel = view.state.selection.main.to;
    view.dispatch({
      changes: { from: sel, insert: 'abc' },
      selection: { anchor: sel + 3 },
      userEvent: 'input.type',
    });
    expect(view.state.doc.toString()).toBe('abc');

    expect(undoInView()).toBe(true);
    expect(view.state.doc.toString()).toBe('');
  });

  it('redoInView redoes after undo and returns true', () => {
    const sel = view.state.selection.main.to;
    view.dispatch({
      changes: { from: sel, insert: 'abc' },
      selection: { anchor: sel + 3 },
      userEvent: 'input.type',
    });
    undoInView();
    expect(view.state.doc.toString()).toBe('');

    expect(redoInView()).toBe(true);
    expect(view.state.doc.toString()).toBe('abc');
  });

  it('refocuses the editor view after the command', () => {
    (document.activeElement as HTMLElement | null)?.blur();
    expect(view.hasFocus).toBe(false);
    undoInView();
    expect(view.hasFocus).toBe(true);
  });
});
