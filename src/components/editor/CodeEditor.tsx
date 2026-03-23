import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
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

export function CodeEditor({ value, onChange, onSave, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  // Update refs when callbacks change
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  }, [onChange, onSave]);

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

  return <div ref={containerRef} className="h-full overflow-hidden" />;
}
