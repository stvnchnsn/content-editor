import { useState, useCallback } from 'react';
import type { JsonViewMode, JsonDiagnostic } from '../../types';
import styles from './JsonToolbar.module.css';

interface JsonToolbarProps {
  viewMode: JsonViewMode;
  onViewModeChange: (mode: JsonViewMode) => void;
  onFormat: () => void;
  onMinify: () => void;
  onFix: () => boolean;
  onToPython: () => void;
  onFromPython: () => boolean;
  content: string;
  diagnostics: JsonDiagnostic[];
  maxValueLength: number;
  onMaxValueLengthChange: (len: number) => void;
}

export function JsonToolbar({
  viewMode,
  onViewModeChange,
  onFormat,
  onMinify,
  onFix,
  onToPython,
  onFromPython,
  content,
  diagnostics,
  maxValueLength,
  onMaxValueLengthChange,
}: JsonToolbarProps) {
  const hasErrors = diagnostics.some((d) => d.severity === 'error');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [content]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${viewMode === 'editor' ? styles.active : ''}`}
            onClick={() => onViewModeChange('editor')}
          >
            Editor
          </button>
          <button
            className={`${styles.tab} ${viewMode === 'tree' ? styles.active : ''}`}
            onClick={() => onViewModeChange('tree')}
          >
            Tree View
          </button>
        </div>
        <div className={styles.actions}>
          <button onClick={onFormat} className={styles.btn} title="Format JSON (2-space indent)">
            Format
          </button>
          <button onClick={onMinify} className={styles.btn} title="Minify JSON">
            Minify
          </button>
          {hasErrors && (
            <button onClick={onFix} className={`${styles.btn} ${styles.btnFix}`} title="Fix common issues (single quotes, trailing commas, Python syntax)">
              Fix
            </button>
          )}
        </div>
        <div className={styles.actions}>
          {!hasErrors && (
            <button onClick={onToPython} className={`${styles.btn} ${styles.btnPython}`} title="Convert JSON to Python dict syntax">
              To Python
            </button>
          )}
          {hasErrors && (
            <button onClick={onFromPython} className={`${styles.btn} ${styles.btnPython}`} title="Convert Python dict syntax to JSON">
              From Python
            </button>
          )}
        </div>
        <div className={styles.actions}>
          <button
            onClick={handleCopy}
            className={`${styles.btn} ${copied ? styles.btnCopied : ''}`}
            title="Copy to clipboard"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {viewMode === 'tree' && (
          <div className={styles.truncateControl}>
            <label className={styles.truncateLabel}>Truncate at:</label>
            <select
              className={styles.truncateSelect}
              value={maxValueLength}
              onChange={(e) => onMaxValueLengthChange(Number(e.target.value))}
            >
              <option value={50}>50 chars</option>
              <option value={100}>100 chars</option>
              <option value={200}>200 chars</option>
              <option value={500}>500 chars</option>
              <option value={99999}>No limit</option>
            </select>
          </div>
        )}
      </div>
      <div className={styles.right}>
        {diagnostics.length > 0 && (
          <span className={`${styles.status} ${hasErrors ? styles.statusError : styles.statusWarn}`}>
            {diagnostics.length} {diagnostics.length === 1 ? 'issue' : 'issues'}
          </span>
        )}
        {diagnostics.length === 0 && (
          <span className={`${styles.status} ${styles.statusOk}`}>Valid JSON</span>
        )}
      </div>
    </div>
  );
}
