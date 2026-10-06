/**
 * Undo/redo dispatch helpers — the shared seam for undo/redo buttons
 * (mobile topbar + desktop toolbar). They surface the code pane (no-op on
 * desktop), fetch the live EditorView from the registry, run the CM6
 * command, and hand focus back so the next keystroke lands in the editor.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { redoInView, undoInView } from '../historyActions';
import { registerCodeViewAccessor, unregisterCodeViewAccessor } from '../codeViewRegistry';

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
  });

  afterEach(() => {
    unregisterCodeViewAccessor();
    view.destroy();
    parent.remove();
  });

  it('returns false when no view is registered', () => {
    unregisterCodeViewAccessor();
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
