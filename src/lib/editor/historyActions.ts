import { undo, redo } from '@codemirror/commands';
import { activateCodePane, getCodeView } from './codeViewRegistry';

/**
 * Shared undo/redo dispatch for every toolbar button (mobile topbar,
 * desktop WorkspacePanel). Sequence: surface the code pane first (no-op on
 * desktop, where no activator is registered) so a tap made while the Visual
 * pane is active acts on a visible caret; then run the CM6 history command
 * on the LIVE view from the registry; then hand focus back so the next
 * keystroke lands in the editor. Returns false (inert tap) when no view is
 * mounted — same contract as ExtraKeysRow.
 */
export function undoInView(): boolean {
  activateCodePane();
  const view = getCodeView();
  if (!view) {return false;}
  const ok = undo(view);
  view.focus();
  return ok;
}

export function redoInView(): boolean {
  activateCodePane();
  const view = getCodeView();
  if (!view) {return false;}
  const ok = redo(view);
  view.focus();
  return ok;
}
