import { activateCodePane, getCodeView, getHistoryCommands } from './codeViewRegistry';

/**
 * Shared undo/redo dispatch for every toolbar button (mobile topbar,
 * desktop WorkspacePanel). Sequence: surface the code pane first (no-op on
 * desktop, where no activator is registered) so a tap made while the Visual
 * pane is active acts on a visible caret; then run the CM6 history command
 * on the LIVE view from the registry; then hand focus back so the next
 * keystroke lands in the editor. Returns false (inert tap) when no view is
 * mounted — same contract as ExtraKeysRow.
 *
 * 29-03: the CM6 command pair itself is registry-sourced too (registered by
 * CodeEditor on mount) — this module carries no @codemirror/commands value
 * import, so no eager path reaches CodeMirror. Missing commands = inert
 * tap, the same contract as a missing view.
 */
export function undoInView(): boolean {
  activateCodePane();
  const view = getCodeView();
  const cmds = getHistoryCommands();
  if (!view || !cmds) {return false;}
  const ok = cmds.undo(view);
  view.focus();
  return ok;
}

export function redoInView(): boolean {
  activateCodePane();
  const view = getCodeView();
  const cmds = getHistoryCommands();
  if (!view || !cmds) {return false;}
  const ok = cmds.redo(view);
  view.focus();
  return ok;
}
