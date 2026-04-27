import styles from './CsvToolbar.module.css';

export type CsvViewMode = 'table' | 'raw';

interface CsvToolbarProps {
  viewMode: CsvViewMode;
  onViewModeChange: (mode: CsvViewMode) => void;
  hasHeader: boolean;
  onToggleHeader: () => void;
  onAddRow: () => void;
  onAddCol: () => void;
  rowCount: number;
  colCount: number;
}

export function CsvToolbar({
  viewMode,
  onViewModeChange,
  hasHeader,
  onToggleHeader,
  onAddRow,
  onAddCol,
  rowCount,
  colCount,
}: CsvToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${viewMode === 'table' ? styles.active : ''}`}
            onClick={() => onViewModeChange('table')}
          >
            Table
          </button>
          <button
            className={`${styles.tab} ${viewMode === 'raw' ? styles.active : ''}`}
            onClick={() => onViewModeChange('raw')}
          >
            Raw
          </button>
        </div>
        {viewMode === 'table' && (
          <>
            <div className={styles.actions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={onToggleHeader}
                  className={styles.checkbox}
                />
                First row is header
              </label>
            </div>
            <div className={styles.actions}>
              <button onClick={onAddRow} className={styles.btn} title="Add a row at the end">
                + Row
              </button>
              <button onClick={onAddCol} className={styles.btn} title="Add a column at the end">
                + Column
              </button>
            </div>
          </>
        )}
      </div>
      <div className={styles.right}>
        <span className={styles.info}>
          {rowCount} rows, {colCount} cols
        </span>
      </div>
    </div>
  );
}
