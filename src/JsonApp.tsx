import { useState, useCallback, useEffect } from 'react';
import { useFileHandler } from './hooks/useFileHandler';
import { confirmDiscardUnsaved } from './utils/unsavedChanges';
import { JsonEditor } from './components/JsonEditor/JsonEditor';
import { JsonToolbar } from './components/JsonEditor/JsonToolbar';
import { JsonTreeView } from './components/JsonTreeView/JsonTreeView';
import { FileActions } from './components/FileActions/FileActions';
import type { JsonViewMode, JsonDiagnostic } from './types';
import styles from './App.module.css';

/**
 * Converts Python-style single-quoted strings to JSON double-quoted strings.
 * Handles escaped quotes and apostrophes within strings.
 */
function fixPythonQuotes(input: string): string {
  const chars = [...input];
  const result: string[] = [];
  let i = 0;

  while (i < chars.length) {
    if (chars[i] === '"') {
      // Already a double-quoted string — pass through as-is
      result.push(chars[i]);
      i++;
      while (i < chars.length && chars[i] !== '"') {
        if (chars[i] === '\\') {
          result.push(chars[i], chars[i + 1] ?? '');
          i += 2;
        } else {
          result.push(chars[i]);
          i++;
        }
      }
      if (i < chars.length) {
        result.push(chars[i]); // closing "
        i++;
      }
    } else if (chars[i] === "'") {
      // Single-quoted string — convert to double-quoted
      result.push('"');
      i++;
      while (i < chars.length && chars[i] !== "'") {
        if (chars[i] === '\\' && chars[i + 1] === "'") {
          // Escaped single quote -> just the quote char
          result.push("'");
          i += 2;
        } else if (chars[i] === '"') {
          // Unescaped double quote inside single-quoted string -> escape it
          result.push('\\"');
          i++;
        } else if (chars[i] === '\\') {
          result.push(chars[i], chars[i + 1] ?? '');
          i += 2;
        } else {
          result.push(chars[i]);
          i++;
        }
      }
      if (i < chars.length) {
        result.push('"'); // closing quote
        i++;
      }
    } else {
      result.push(chars[i]);
      i++;
    }
  }

  return result.join('');
}

/**
 * Converts a parsed JSON value to Python dict/list syntax string.
 * - Strings use single quotes (with internal single quotes escaped)
 * - true/false/null → True/False/None
 * - Numbers and structure preserved
 */
function toPython(value: unknown, indent: number = 0): string {
  const pad = '    '.repeat(indent);
  const padInner = '    '.repeat(indent + 1);

  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    // Use single quotes, escape internal single quotes
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `'${escaped}'`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${padInner}${toPython(v, indent + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const items = entries.map(
      ([k, v]) => `${padInner}${toPython(k, 0)}: ${toPython(v, indent + 1)}`,
    );
    return `{\n${items.join(',\n')}\n${pad}}`;
  }

  return String(value);
}

interface JsonAppProps {
  onDirtyChange?: (dirty: boolean) => void;
}

export default function JsonApp({ onDirtyChange }: JsonAppProps) {
  const [content, setContentState] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<JsonViewMode>('editor');
  const [diagnostics, setDiagnostics] = useState<JsonDiagnostic[]>([]);
  const [maxValueLength, setMaxValueLength] = useState(100);

  const {
    fileInfo,
    cliMode,
    cwdInfo,
    loadFile,
    loadServerFile,
    saveFile,
    saveFileAs,
  } = useFileHandler('json');

  const setContent = useCallback((val: string) => {
    setContentState(val);
    setIsDirty(true);
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleLoad = useCallback(async () => {
    if (!confirmDiscardUnsaved(isDirty)) return;
    const text = await loadFile();
    if (text !== null) {
      setContentState(text);
      setIsDirty(false);
    }
  }, [loadFile, isDirty]);

  const handleLoadServerFile = useCallback(
    async (path: string) => {
      if (!confirmDiscardUnsaved(isDirty)) return;
      const text = await loadServerFile(path);
      if (text !== null) {
        setContentState(text);
        setIsDirty(false);
      }
    },
    [loadServerFile, isDirty],
  );

  // Auto-load file from ?file= query parameter
  useEffect(() => {
    if (!cliMode) return;
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    if (file) handleLoadServerFile(file);
  }, [cliMode, handleLoadServerFile]);

  const handleSave = useCallback(async () => {
    const success = await saveFile(content);
    if (success) setIsDirty(false);
  }, [saveFile, content]);

  const handleSaveAs = useCallback(async () => {
    const success = await saveFileAs(content);
    if (success) setIsDirty(false);
  }, [saveFileAs, content]);

  const handleNew = useCallback(() => {
    if (!confirmDiscardUnsaved(isDirty)) return;
    setContentState('');
    setIsDirty(false);
  }, [isDirty]);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setContentState(formatted);
      setIsDirty(true);
    } catch {
      // Can't format invalid JSON
    }
  }, [content]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(content);
      const minified = JSON.stringify(parsed);
      setContentState(minified);
      setIsDirty(true);
    } catch {
      // Can't minify invalid JSON
    }
  }, [content]);

  const handleFix = useCallback((): boolean => {
    let fixed = content;

    // Replace Python-style single quotes with double quotes
    fixed = fixPythonQuotes(fixed);

    // Replace Python True/False/None with JSON equivalents
    fixed = fixed.replace(/\bTrue\b/g, 'true');
    fixed = fixed.replace(/\bFalse\b/g, 'false');
    fixed = fixed.replace(/\bNone\b/g, 'null');

    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,\s*([\]}])/g, '$1');

    try {
      const parsed = JSON.parse(fixed);
      const formatted = JSON.stringify(parsed, null, 2);
      setContentState(formatted);
      setIsDirty(true);
      return true;
    } catch {
      // If still invalid, at least apply what we can
      if (fixed !== content) {
        setContentState(fixed);
        setIsDirty(true);
      }
      return false;
    }
  }, [content]);

  const handleToPython = useCallback(() => {
    try {
      const parsed = JSON.parse(content);
      const pythonStr = toPython(parsed);
      setContentState(pythonStr);
      setIsDirty(true);
    } catch {
      // Can't convert invalid JSON
    }
  }, [content]);

  const handleFromPython = useCallback((): boolean => {
    return handleFix();
  }, [handleFix]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  return (
    <div className={styles.editorPanel}>
      <div className={styles.panelHeader}>
        <FileActions
          fileInfo={fileInfo}
          isDirty={isDirty}
          onLoad={handleLoad}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onNew={handleNew}
          cliMode={cliMode}
          cwdFiles={cwdInfo?.files ?? []}
          onLoadServerFile={handleLoadServerFile}
        />
      </div>
      <JsonToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFormat={handleFormat}
        onMinify={handleMinify}
        onFix={handleFix}
        onToPython={handleToPython}
        onFromPython={handleFromPython}
        content={content}
        diagnostics={diagnostics}
        maxValueLength={maxValueLength}
        onMaxValueLengthChange={setMaxValueLength}
      />
      <main className={styles.editorArea}>
        {viewMode === 'editor' && (
          <JsonEditor content={content} onChange={setContent} onDiagnostics={setDiagnostics} />
        )}
        {viewMode === 'tree' && (
          <JsonTreeView content={content} maxValueLength={maxValueLength} />
        )}
      </main>
    </div>
  );
}
