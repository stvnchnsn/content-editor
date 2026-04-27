import { useState, useCallback } from 'react';
import type { FileInfo } from '../../types';
import styles from './FileActions.module.css';

interface FileActionsProps {
  fileInfo: FileInfo | null;
  isDirty: boolean;
  onLoad: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onNew: () => void;
  onCopy?: () => Promise<void> | void;
  cliMode?: boolean;
  cwdFiles?: string[];
  onLoadServerFile?: (path: string) => void;
}

export function FileActions({
  fileInfo,
  isDirty,
  onLoad,
  onSave,
  onSaveAs,
  onNew,
  onCopy,
  cliMode,
  cwdFiles,
  onLoadServerFile,
}: FileActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!onCopy) return;
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  return (
    <div className={styles.fileActions}>
      <button onClick={onNew} className={styles.button}>
        New
      </button>
      {cliMode && cwdFiles && cwdFiles.length > 0 && onLoadServerFile ? (
        <select
          className={styles.select}
          value=""
          onChange={(e) => {
            if (e.target.value) onLoadServerFile(e.target.value);
          }}
        >
          <option value="">Open file...</option>
          {cwdFiles.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      ) : (
        <button onClick={onLoad} className={styles.button}>
          Open
        </button>
      )}
      <button onClick={onSave} className={styles.button}>
        Save{isDirty ? ' *' : ''}
      </button>
      <button onClick={onSaveAs} className={styles.button}>
        Save As
      </button>
      {onCopy && (
        <button onClick={handleCopy} className={styles.button}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
      {fileInfo && (
        <span className={styles.fileName}>
          {fileInfo.name}
          {isDirty ? ' (unsaved)' : ''}
        </span>
      )}
    </div>
  );
}
