import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { Decoration, keymap, type DecorationSet } from '@codemirror/view';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { mermaidLanguage } from '@/lib/mermaid/language';
import { mermaidAutocomplete } from '@/lib/mermaid/autocomplete';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSave?: () => void;
  theme: 'dark' | 'light';
}

export interface CodeEditorRef {
  highlightLine: (line: number) => void;
  scrollToLine: (line: number) => void;
}

// StateEffects for adding/removing line highlight
const highlightLineEffect = StateEffect.define<number>();
const clearHighlightEffect = StateEffect.define<void>();

// StateField that manages the highlight decoration
const highlightField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(highlightLineEffect)) {
        const line = effect.value;
        if (line >= 1 && line <= tr.state.doc.lines) {
          const lineInfo = tr.state.doc.line(line);
          const decoration = Decoration.line({
            attributes: { class: 'cm-active-line-highlight' },
          });
          decorations = Decoration.set([decoration.range(lineInfo.from)]);
        }
      }
      if (effect.is(clearHighlightEffect)) {
        decorations = Decoration.none;
      }
    }
    decorations = decorations.map(tr.changes);
    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

export const CodeEditor = forwardRef<CodeEditorRef, Props>(function CodeEditor({ value, onChange, onSave, theme }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Latest-ref pattern: assign DURING RENDER. CodeMirror's updateListener
  // fires synchronously inside view.dispatch(); syncing these refs in a
  // passive useEffect left a window (render committed, effect not yet run)
  // where a dispatch — e.g. an E2E setCode immediately after a tab switch,
  // or a fast typist — wrote through the PREVIOUS tab's onChange closure,
  // corrupting the wrong tab's content (clobbered again by the value-sync
  // effect). Webkit's slower pipeline hit the window on every run; chromium
  // masked it by winning the race (VAL-02, plan 24-05).
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  useImperativeHandle(ref, () => ({
    highlightLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const clampedLine = Math.min(Math.max(1, line), view.state.doc.lines);
      view.dispatch({
        effects: [
          highlightLineEffect.of(clampedLine),
          EditorView.scrollIntoView(view.state.doc.line(clampedLine).from),
        ],
      });
      // Auto-clear after 2 seconds
      setTimeout(() => {
        if (viewRef.current) {
          viewRef.current.dispatch({ effects: clearHighlightEffect.of(undefined) });
        }
      }, 2000);
    },
    scrollToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const clampedLine = Math.min(Math.max(1, line), view.state.doc.lines);
      const lineInfo = view.state.doc.line(clampedLine);
      view.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from),
      });
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        mermaidLanguage,
        mermaidAutocomplete,
        bracketMatching(),
        highlightField,
        ...(theme === 'dark' ? [oneDark] : []),
        keymap.of([
          { key: 'Mod-s', run: () => { onSaveRef.current?.(); return true; } },
          indentWithTab,
          ...defaultKeymap,
        ]),
        EditorView.updateListener.of(u => {
          if (u.docChanged) {onChangeRef.current(u.state.doc.toString());}
        }),
        EditorView.theme({ '&': { height: '100%' } }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    // Store EditorView instance on DOM element for E2E test access
    const dom = containerRef.current.querySelector('.cm-editor');
    if (dom) {
      (dom as { cmView?: EditorView }).cmView = view;
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {return;}
    const cur = view.state.doc.toString();
    if (cur !== value) {
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }
  }, [value]);

  return <div data-testid="code-editor" ref={containerRef} className="h-full overflow-hidden" />;
});
