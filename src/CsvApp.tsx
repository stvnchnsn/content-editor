import { useState, useCallback, useEffect } from 'react';
import { useFileHandler } from './hooks/useFileHandler';
import { CsvEditor } from './components/CsvEditor/CsvEditor';
import { CsvToolbar, type CsvViewMode } from './components/CsvEditor/CsvToolbar';
import { RawView } from './components/RawView/RawView';
import { FileActions } from './components/FileActions/FileActions';
import { parseCsv, serializeCsv, type MergedCell } from './components/CsvEditor/csvUtils';
import styles from './App.module.css';

export default function CsvApp() {
  const [rawContent, setRawContent] = useState('');
  const [rows, setRows] = useState<string[][]>([['', '', '']]);
  const [mergedCells, setMergedCells] = useState<Record<string, MergedCell>>({});
  const [hasHeader, setHasHeader] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<CsvViewMode>('table');

  const {
    fileInfo,
    cliMode,
    cwdInfo,
    loadFile,
    loadServerFile,
    saveFile,
    saveFileAs,
  } = useFileHandler('csv');

  // Sync raw content to rows when switching to table view
  const syncToRows = useCallback((text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setRows([['', '', '']]);
    } else {
      setRows(parsed);
    }
    setMergedCells({});
  }, []);

  // Sync rows to raw content when switching to raw view
  const syncToRaw = useCallback(() => {
    setRawContent(serializeCsv(rows));
  }, [rows]);

  const handleViewModeChange = useCallback(
    (mode: CsvViewMode) => {
      if (mode === 'raw' && viewMode === 'table') {
        syncToRaw();
      } else if (mode === 'table' && viewMode === 'raw') {
        syncToRows(rawContent);
      }
      setViewMode(mode);
    },
    [viewMode, syncToRaw, syncToRows, rawContent],
  );

  const handleRowsChange = useCallback(
    (newRows: string[][]) => {
      setRows(newRows);
      setIsDirty(true);
    },
    [],
  );

  const handleRawChange = useCallback(
    (text: string) => {
      setRawContent(text);
      setIsDirty(true);
    },
    [],
  );

  const getCurrentContent = useCallback((): string => {
    if (viewMode === 'table') {
      return serializeCsv(rows);
    }
    return rawContent;
  }, [viewMode, rows, rawContent]);

  const loadContent = useCallback(
    (text: string) => {
      setRawContent(text);
      syncToRows(text);
      setIsDirty(false);
    },
    [syncToRows],
  );

  const handleLoad = useCallback(async () => {
    const text = await loadFile();
    if (text !== null) loadContent(text);
  }, [loadFile, loadContent]);

  const handleLoadServerFile = useCallback(
    async (path: string) => {
      const text = await loadServerFile(path);
      if (text !== null) loadContent(text);
    },
    [loadServerFile, loadContent],
  );

  // Auto-load file from ?file= query parameter
  useEffect(() => {
    if (!cliMode) return;
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    if (file) handleLoadServerFile(file);
  }, [cliMode, handleLoadServerFile]);

  const handleSave = useCallback(async () => {
    const success = await saveFile(getCurrentContent());
    if (success) setIsDirty(false);
  }, [saveFile, getCurrentContent]);

  const handleSaveAs = useCallback(async () => {
    const success = await saveFileAs(getCurrentContent());
    if (success) setIsDirty(false);
  }, [saveFileAs, getCurrentContent]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(getCurrentContent());
  }, [getCurrentContent]);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    setRawContent('');
    setRows([['', '', '']]);
    setMergedCells({});
    setIsDirty(false);
  }, [isDirty]);

  const handleAddRow = useCallback(() => {
    const numCols = rows[0]?.length ?? 3;
    setRows([...rows, Array(numCols).fill('')]);
    setIsDirty(true);
  }, [rows]);

  const handleAddCol = useCallback(() => {
    setRows(rows.map((row) => [...row, '']));
    setIsDirty(true);
  }, [rows]);

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

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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
          onCopy={handleCopy}
          cliMode={cliMode}
          cwdFiles={cwdInfo?.files ?? []}
          onLoadServerFile={handleLoadServerFile}
        />
      </div>
      <CsvToolbar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        hasHeader={hasHeader}
        onToggleHeader={() => setHasHeader(!hasHeader)}
        onAddRow={handleAddRow}
        onAddCol={handleAddCol}
        rowCount={rows.length}
        colCount={rows[0]?.length ?? 0}
      />
      <main className={styles.editorArea}>
        {viewMode === 'table' && (
          <CsvEditor
            rows={rows}
            mergedCells={mergedCells}
            hasHeader={hasHeader}
            onChange={handleRowsChange}
            onMergedCellsChange={setMergedCells}
          />
        )}
        {viewMode === 'raw' && (
          <RawView content={rawContent} onChange={handleRawChange} />
        )}
      </main>
    </div>
  );
}
