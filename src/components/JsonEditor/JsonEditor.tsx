import { useRef, useEffect } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { defaultKeymap, indentWithTab, history, historyKeymap, undo, redo } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import type { JsonDiagnostic } from '../../types';
import styles from './JsonEditor.module.css';

interface JsonEditorProps {
  content: string;
  onChange: (content: string) => void;
  onDiagnostics: (diagnostics: JsonDiagnostic[]) => void;
}

function jsonLinter() {
  return linter((view) => {
    const doc = view.state.doc.toString();
    if (!doc.trim()) return [];
    try {
      JSON.parse(doc);
      return [];
    } catch (e) {
      const msg = (e as SyntaxError).message;
      // Try to extract position from error message
      const posMatch = msg.match(/position\s+(\d+)/i);
      let pos = 0;
      if (posMatch) {
        pos = Math.min(parseInt(posMatch[1], 10), doc.length);
      } else {
        // Try "at line X column Y"
        const lineMatch = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        if (lineMatch) {
          const line = Math.min(parseInt(lineMatch[1], 10), view.state.doc.lines);
          const lineObj = view.state.doc.line(line);
          const col = Math.min(parseInt(lineMatch[2], 10) - 1, lineObj.length);
          pos = lineObj.from + col;
        }
      }
      return [{
        from: pos,
        to: Math.min(pos + 1, doc.length),
        severity: 'error' as const,
        message: msg,
      }];
    }
  });
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
  },
  '.cm-scroller': {
    fontFamily: "var(--font-mono)",
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '16px 0',
  },
  '.cm-gutters': {
    background: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  },
  '.cm-activeLineGutter': {
    background: 'var(--color-border)',
  },
  '.cm-activeLine': {
    background: 'rgba(0, 0, 0, 0.04)',
  },
  '.cm-selectionMatch': {
    background: 'rgba(13, 110, 253, 0.15)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-text)',
  },
  '.cm-foldGutter': {
    width: '16px',
  },
});

export function JsonEditor({ content, onChange, onDiagnostics }: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onDiagnosticsRef = useRef(onDiagnostics);
  const readOnlyCompartment = useRef(new Compartment());

  onChangeRef.current = onChange;
  onDiagnosticsRef.current = onDiagnostics;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const doc = update.state.doc.toString();
        onChangeRef.current(doc);

        // Report diagnostics
        if (!doc.trim()) {
          onDiagnosticsRef.current([]);
        } else {
          try {
            JSON.parse(doc);
            onDiagnosticsRef.current([]);
          } catch (e) {
            const msg = (e as SyntaxError).message;
            const posMatch = msg.match(/position\s+(\d+)/i);
            let line = 1, col = 1;
            if (posMatch) {
              const pos = parseInt(posMatch[1], 10);
              const lineObj = update.state.doc.lineAt(Math.min(pos, update.state.doc.length));
              line = lineObj.number;
              col = pos - lineObj.from + 1;
            }
            onDiagnosticsRef.current([{ line, col, message: msg, severity: 'error' }]);
          }
        }
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        json(),
        jsonLinter(),
        lintGutter(),
        editorTheme,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        updateListener,
        readOnlyCompartment.current.of(EditorState.readOnly.of(false)),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only create editor once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync content from outside (file load, format, etc.)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
    }
  }, [content]);

  return <div ref={containerRef} className={styles.editor} />;
}

// Expose undo/redo for toolbar
export function undoEditor(view: EditorView) { undo(view); }
export function redoEditor(view: EditorView) { redo(view); }
