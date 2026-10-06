import type { EditorView } from '@codemirror/view';

/**
 * Mobile topbar buttons (undo/redo) dispatch CM6 commands against the code
 * editor's LIVE view, but the topbar renders outside MobileWorkspace (which
 * owns codeEditorRef). A module-level registry is the sanctioned seam here
 * (precedent: the remount-safe snackbar store): CodeEditor itself registers
 * the view accessor on mount (covering every host, mobile and desktop) and
 * clears it on unmount — ownership-checked so a late teardown during a
 * layout switch cannot erase the live host's registration (see
 * unregisterCodeViewAccessor). MobileWorkspace registers only the pane
 * activator. Null view = taps inert (same contract as ExtraKeysRow).
 */
let viewAccessor: (() => EditorView | null) | null = null;
// Critique P2: the cursor pair's effect is invisible while the code pane is
// hidden (Visual active). MobileWorkspace registers a pane activator so the
// topbar's taps first surface the Code pane, then move the visible caret.
let paneActivator: (() => void) | null = null;

export function registerCodeViewAccessor(access: () => EditorView | null): void {
  viewAccessor = access;
}

/**
 * Ownership-checked teardown: during a mobile↔desktop layout switch the old
 * editor's passive-effect cleanup can run AFTER the new editor has already
 * registered. A bare `viewAccessor = null` would then erase the LIVE host's
 * accessor and leave every toolbar button inert. Passing the accessor makes
 * the unregister effective only when it comes from the current owner
 * (omitting the argument keeps the legacy unconditional clear).
 */
export function unregisterCodeViewAccessor(access?: () => EditorView | null): void {
  if (!access || viewAccessor === access) {
    viewAccessor = null;
  }
}

export function getCodeView(): EditorView | null {
  return viewAccessor ? viewAccessor() : null;
}

export function registerCodePaneActivator(activate: () => void): void {
  paneActivator = activate;
}

export function unregisterCodePaneActivator(): void {
  paneActivator = null;
}

/** Surface the Code pane if it is not the active view (no-op otherwise). */
export function activateCodePane(): void {
  paneActivator?.();
}
