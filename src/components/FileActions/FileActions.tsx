import type { FileInfo } from '../../types';
import styles from './FileActions.module.css';

interface FileActionsProps {
  fileInfo: FileInfo | null;
  isDirty: boolean;
  onLoad: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onNew: () => void;
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
  cliMode,
  cwdFiles,
  onLoadServerFile,
}: FileActionsProps) {
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
      {fileInfo && (
        <span className={styles.fileName}>
          {fileInfo.name}
          {isDirty ? ' (unsaved)' : ''}
        </span>
      )}
    </div>
  );
}
