import { useTranslation } from 'react-i18next';
import { FOCUS_RING_CLASSES } from '@/components/shared/touchTargets';
import type { Command, EditorView } from '@codemirror/view';
import {
  cursorCharLeft,
  cursorCharRight,
  cursorLineDown,
  cursorLineUp,
  indentWithTab,
} from '@codemirror/commands';

/**
 * ExtraKeysRow (EDIT-02, D-01) — touch keys for Mermaid symbols the soft
 * keyboard cannot type reliably on the mobile code pane. Mobile tree only
 * (D-08): the row mounts at the bottom of the MobileWorkspace code pane.
 *
 * Contract (UI-SPEC section A):
 * - Insertion dispatches a CM6 transaction to the LIVE EditorView (via the
 *   `getView` accessor) — never through the React value prop, whose sync
 *   effect would jump the caret and churn focus.
 * - Every key button calls preventDefault() on pointerdown so focus never
 *   leaves the contenteditable host — losing focus is what dismisses the
 *   soft keyboard.
 * - 48x48px minimum touch targets, JetBrains Mono glyphs, token-only colors.
 * - Key set/order/testids are the UI-SPEC section A binding table. No Enter
 *   key (GBoard provides it). Every symbol of the acceptance fixture
 *   `graph TD; A-->|label|B{id}` is reachable from GBoard + this row.
 * - Any key-count change must re-derive the 320px wrap-budget arithmetic in
 *   ExtraKeysRow.test.tsx (hard limit: <= 12 keys, <= 2 rows at 320px).
 */

/**
 * Insert `insert` at the current caret as a single CM6 transaction,
 * replacing any active selection exactly like hardware-keyboard typing
 * would (select-then-type is the most common mobile edit gesture). The
 * caret lands after the inserted text; the change lands as one undo step
 * (userEvent 'input.extraKeys') and flows back through CodeEditor's
 * onChange into the existing per-keystroke persistence.
 */
export function insertAtCaret(view: EditorView, insert: string): void {
  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: { anchor: sel.from + insert.length },
    scrollIntoView: true,
    userEvent: 'input.extraKeys',
  });
}

/** Character keys insert at the caret; Tab and cursor keys dispatch the same
 *  @codemirror/commands command objects the editor keymap uses, so
 *  indentation and movement semantics match keyboard behavior exactly. */
type ExtraKeyAction = { kind: 'insert'; text: string } | { kind: 'command'; command: Command };

interface ExtraKeyDef {
  testid: string;
  /** i18n key path under editor.extraKeys.* (aria-label; en+fr parity). */
  labelKey: string;
  /** Rendered glyph — for insert keys it visually equals the inserted text. */
  glyph: string;
  action: ExtraKeyAction;
}

/** The UI-SPEC section A key set, GROUPED BY SEMANTICS (iter-13 P2: row 2
 *  mixed an insert key ('), the indent key, and cursor keys — and the row-1
 *  `-->` insert read near-identical to the row-2 `→` cursor. All six INSERT
 *  keys now lead row 1; row 2 is exclusively commands (indent + cursors), so
 *  the two visually-similar arrows are far apart). Module-level constant so
 *  the wrap-budget test can import and re-derive the arithmetic. */
export const EXTRA_KEYS: readonly ExtraKeyDef[] = [
  { testid: 'extra-key-arrow', labelKey: 'editor.extraKeys.arrow', glyph: '-->', action: { kind: 'insert', text: '-->' } },
  { testid: 'extra-key-pipe', labelKey: 'editor.extraKeys.pipe', glyph: '|', action: { kind: 'insert', text: '|' } },
  { testid: 'extra-key-brace-open', labelKey: 'editor.extraKeys.braceOpen', glyph: '{', action: { kind: 'insert', text: '{' } },
  { testid: 'extra-key-brace-close', labelKey: 'editor.extraKeys.braceClose', glyph: '}', action: { kind: 'insert', text: '}' } },
  { testid: 'extra-key-quote-double', labelKey: 'editor.extraKeys.quoteDouble', glyph: '"', action: { kind: 'insert', text: '"' } },
  { testid: 'extra-key-quote-single', labelKey: 'editor.extraKeys.quoteSingle', glyph: "'", action: { kind: 'insert', text: "'" } },
  // Tab runs the keymap's own binding run-command (CodeEditor keymap carries
  // `indentWithTab`), so indentation semantics match a hardware Tab exactly.
  { testid: 'extra-key-tab', labelKey: 'editor.extraKeys.tab', glyph: '⇥', action: { kind: 'command', command: indentWithTab.run as Command } },
  // Cursor keys dispatch the commands CM's own defaultKeymap binds to the
  // arrow keys: cursorCharLeft/Right horizontally, cursorLineUp/Down
  // vertically. (The UI-SPEC's "cursorLineLeft/Right" names do not exist in
  // @codemirror/commands — cursorCharLeft/Right are the keymap's real
  // horizontal-arrow commands.)
  { testid: 'extra-key-cursor-left', labelKey: 'editor.extraKeys.cursorLeft', glyph: '←', action: { kind: 'command', command: cursorCharLeft } },
  { testid: 'extra-key-cursor-right', labelKey: 'editor.extraKeys.cursorRight', glyph: '→', action: { kind: 'command', command: cursorCharRight } },
  { testid: 'extra-key-cursor-up', labelKey: 'editor.extraKeys.cursorUp', glyph: '↑', action: { kind: 'command', command: cursorLineUp } },
  { testid: 'extra-key-cursor-down', labelKey: 'editor.extraKeys.cursorDown', glyph: '↓', action: { kind: 'command', command: cursorLineDown } },
] as const;

/**
 * Impeccable comp 18:4 layout: the eleven keys render as two centered rows —
 * five keycaps on the first, six on the second — at 44x44px with 4px
 * horizontal and 2px vertical gaps.
 */
// Iter-13 semantic grouping: row 1 = the six INSERT keys, row 2 = commands
// (indent + cursor moves). The break follows the group boundary, not a fixed
// count.
const EXTRA_KEYS_ROW_BREAK = 6;

// Key hit zones are 48px (44px key + 2px/side pseudo-stretch): at gap-1
// (48px pitch) adjacent zones abut with zero gap — the exact topbar defect
// fixed at iter-13. gap-2 (52px pitch) restores 4px of separation.
const KEY_ROW_GAP = 'gap-2';

interface ExtraKeysRowProps {
  /** Accessor for the live EditorView. Returning null (editor not yet
   *  mounted / destroyed) makes taps inert instead of throwing. */
  getView: () => EditorView | null;
}

/** Shared key-button styling: 44px keycap (comp 18:4) whose invisible ::before
 *  stretches the hit area to the 48dp Android floor, mono glyph, token colors.
 *  Pressed/active uses the type-badge accent pattern (UI-SPEC section A). */
const KEY_BUTTON_CLASSES = [
  'relative',
  'min-w-[44px]',
  'min-h-[44px]',
  'before:absolute',
  'before:-inset-0.5',
  "before:content-['']",
  'font-mono',
  'whitespace-nowrap',
  'rounded-[10px]',
  'border',
  'border-[var(--border-subtle)]',
  'text-[var(--text-primary)]',
  'active:bg-[var(--accent-dim)]',
  'active:border-[var(--accent)]',
].join(' ');

export function ExtraKeysRow({ getView }: ExtraKeysRowProps) {
  const { t } = useTranslation();

  const activate = (key: ExtraKeyDef) => {
    const view = getView();
    if (!view) return;
    if (key.action.kind === 'insert') {
      insertAtCaret(view, key.action.text);
    } else {
      key.action.command(view);
    }
  };

  const renderKey = (key: ExtraKeyDef) => (
    <button
      key={key.testid}
      type="button"
      data-testid={key.testid}
      aria-label={t(key.labelKey)}
      /* Iter-14: insert keys get an accent-tinted floor, command keys a
         neutral one — the "→" that TYPES "-->" and the "→" that MOVES the
         cursor were visually identical twins 48px apart. */
      className={`${KEY_BUTTON_CLASSES} ${key.action.kind === 'insert' ? 'bg-[var(--accent-dim)]' : 'bg-[var(--surface-container)]'}`}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => activate(key)}
    >
      {key.glyph}
    </button>
  );

  return (
    <div
      data-testid="extra-keys-row"
      role="group"
      aria-label={t('editor.extraKeys.label')}
      className="flex flex-col items-center gap-0.5 px-3 py-2 border-t"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className={`flex justify-center ${KEY_ROW_GAP}`}>
        {EXTRA_KEYS.slice(0, EXTRA_KEYS_ROW_BREAK).map(renderKey)}
      </div>
      <div className={`flex justify-center ${KEY_ROW_GAP}`}>
        {EXTRA_KEYS.slice(EXTRA_KEYS_ROW_BREAK).map(renderKey)}
      </div>
    </div>
  );
}
