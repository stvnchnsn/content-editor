import { useState, useCallback, useRef, useEffect } from 'react';
import {
  colLabel,
  isHiddenByMerge,
  getMergeSpan,
  type MergedCell,
} from './csvUtils';
import styles from './CsvEditor.module.css';

interface Selection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface CsvEditorProps {
  rows: string[][];
  mergedCells: Record<string, MergedCell>;
  hasHeader: boolean;
  onChange: (rows: string[][]) => void;
  onMergedCellsChange: (merged: Record<string, MergedCell>) => void;
}

export function CsvEditor({
  rows,
  mergedCells,
  hasHeader,
  onChange,
  onMergedCellsChange,
}: CsvEditorProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const numRows = rows.length;
  const numCols = rows[0]?.length ?? 0;

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const normalizedSelection = useCallback((): Selection | null => {
    if (!selection) return null;
    return {
      startRow: Math.min(selection.startRow, selection.endRow),
      startCol: Math.min(selection.startCol, selection.endCol),
      endRow: Math.max(selection.startRow, selection.endRow),
      endCol: Math.max(selection.startCol, selection.endCol),
    };
  }, [selection]);

  const isCellSelected = useCallback(
    (row: number, col: number): boolean => {
      const sel = normalizedSelection();
      if (!sel) return false;
      return row >= sel.startRow && row <= sel.endRow && col >= sel.startCol && col <= sel.endCol;
    },
    [normalizedSelection],
  );

  const updateCell = useCallback(
    (row: number, col: number, value: string) => {
      const newRows = rows.map((r) => [...r]);
      newRows[row][col] = value;
      onChange(newRows);
    },
    [rows, onChange],
  );

  const commitEdit = useCallback(() => {
    if (editingCell) {
      updateCell(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
    }
  }, [editingCell, editValue, updateCell]);

  const handleCellMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (e.button === 2) return; // right-click handled by context menu
      commitEdit();
      if (e.shiftKey && selection) {
        setSelection({ ...selection, endRow: row, endCol: col });
      } else {
        setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
        setIsDragging(true);
      }
    },
    [commitEdit, selection],
  );

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDragging && selection) {
        setSelection({ ...selection, endRow: row, endCol: col });
      }
    },
    [isDragging, selection],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      setEditingCell({ row, col });
      setEditValue(rows[row][col]);
    },
    [rows],
  );

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        // Move to next row
        if (editingCell && editingCell.row < numRows - 1) {
          const nextRow = editingCell.row + 1;
          setEditingCell({ row: nextRow, col: editingCell.col });
          setEditValue(rows[nextRow][editingCell.col]);
          setSelection({
            startRow: nextRow,
            startCol: editingCell.col,
            endRow: nextRow,
            endCol: editingCell.col,
          });
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        if (editingCell && editingCell.col < numCols - 1) {
          const nextCol = editingCell.col + 1;
          setEditingCell({ row: editingCell.row, col: nextCol });
          setEditValue(rows[editingCell.row][nextCol]);
          setSelection({
            startRow: editingCell.row,
            startCol: nextCol,
            endRow: editingCell.row,
            endCol: nextCol,
          });
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
    },
    [commitEdit, editingCell, numRows, numCols, rows],
  );

  // Keyboard navigation when not editing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCell) return;
      const sel = normalizedSelection();
      if (!sel) return;

      const { startRow, startCol } = sel;
      let newRow = startRow;
      let newCol = startCol;

      if (e.key === 'ArrowUp') newRow = Math.max(0, startRow - 1);
      else if (e.key === 'ArrowDown') newRow = Math.min(numRows - 1, startRow + 1);
      else if (e.key === 'ArrowLeft') newCol = Math.max(0, startCol - 1);
      else if (e.key === 'ArrowRight') newCol = Math.min(numCols - 1, startCol + 1);
      else if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault();
        setEditingCell({ row: startRow, col: startCol });
        setEditValue(rows[startRow][startCol]);
        return;
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Clear selected cells
        const newRows = rows.map((r) => [...r]);
        for (let r = sel.startRow; r <= sel.endRow; r++) {
          for (let c = sel.startCol; c <= sel.endCol; c++) {
            newRows[r][c] = '';
          }
        }
        onChange(newRows);
        return;
      } else {
        return;
      }

      e.preventDefault();
      if (e.shiftKey) {
        setSelection((prev) =>
          prev ? { ...prev, endRow: newRow, endCol: newCol } : null,
        );
      } else {
        setSelection({ startRow: newRow, startCol: newCol, endRow: newRow, endCol: newCol });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingCell, normalizedSelection, numRows, numCols, rows, onChange]);

  // Context menu handler
  const handleContextMenu = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.preventDefault();
      // Select the cell if not already in selection
      if (!isCellSelected(row, col)) {
        setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
      }
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [isCellSelected],
  );

  // Row header click to select full row
  const handleRowHeaderClick = useCallback(
    (row: number, e: React.MouseEvent) => {
      if (e.shiftKey && selection) {
        setSelection({ startRow: selection.startRow, startCol: 0, endRow: row, endCol: numCols - 1 });
      } else {
        setSelection({ startRow: row, startCol: 0, endRow: row, endCol: numCols - 1 });
      }
    },
    [selection, numCols],
  );

  // Col header click to select full column
  const handleColHeaderClick = useCallback(
    (col: number, e: React.MouseEvent) => {
      if (e.shiftKey && selection) {
        setSelection({ startRow: 0, startCol: selection.startCol, endRow: numRows - 1, endCol: col });
      } else {
        setSelection({ startRow: 0, startCol: col, endRow: numRows - 1, endCol: col });
      }
    },
    [selection, numRows],
  );

  // --- Table operations ---

  const insertRowAbove = useCallback(() => {
    const sel = normalizedSelection();
    const idx = sel ? sel.startRow : numRows;
    const newRow = Array(numCols).fill('');
    const newRows = [...rows.slice(0, idx), newRow, ...rows.slice(idx)];
    // Shift merged cells
    const newMerged: Record<string, MergedCell> = {};
    for (const [key, span] of Object.entries(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      newMerged[`${r >= idx ? r + 1 : r},${c}`] = span;
    }
    onMergedCellsChange(newMerged);
    onChange(newRows);
    setContextMenu(null);
  }, [normalizedSelection, numRows, numCols, rows, mergedCells, onChange, onMergedCellsChange]);

  const insertRowBelow = useCallback(() => {
    const sel = normalizedSelection();
    const idx = sel ? sel.endRow + 1 : numRows;
    const newRow = Array(numCols).fill('');
    const newRows = [...rows.slice(0, idx), newRow, ...rows.slice(idx)];
    const newMerged: Record<string, MergedCell> = {};
    for (const [key, span] of Object.entries(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      newMerged[`${r >= idx ? r + 1 : r},${c}`] = span;
    }
    onMergedCellsChange(newMerged);
    onChange(newRows);
    setContextMenu(null);
  }, [normalizedSelection, numRows, numCols, rows, mergedCells, onChange, onMergedCellsChange]);

  const deleteRows = useCallback(() => {
    const sel = normalizedSelection();
    if (!sel) return;
    if (sel.endRow - sel.startRow + 1 >= numRows) return; // Can't delete all rows
    const newRows = rows.filter((_, i) => i < sel.startRow || i > sel.endRow);
    const deletedCount = sel.endRow - sel.startRow + 1;
    // Remove merged cells in deleted rows, shift others
    const newMerged: Record<string, MergedCell> = {};
    for (const [key, span] of Object.entries(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      if (r >= sel.startRow && r <= sel.endRow) continue; // Remove
      const newR = r > sel.endRow ? r - deletedCount : r;
      newMerged[`${newR},${c}`] = span;
    }
    onMergedCellsChange(newMerged);
    onChange(newRows);
    setSelection(null);
    setContextMenu(null);
  }, [normalizedSelection, numRows, rows, mergedCells, onChange, onMergedCellsChange]);

  const insertColLeft = useCallback(() => {
    const sel = normalizedSelection();
    const idx = sel ? sel.startCol : numCols;
    const newRows = rows.map((row) => [...row.slice(0, idx), '', ...row.slice(idx)]);
    const newMerged: Record<string, MergedCell> = {};
    for (const [key, span] of Object.entries(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      newMerged[`${r},${c >= idx ? c + 1 : c}`] = span;
    }
    onMergedCellsChange(newMerged);
    onChange(newRows);
    setContextMenu(null);
  }, [normalizedSelection, numCols, rows, mergedCells, onChange, onMergedCellsChange]);

  const insertColRight = useCallback(() => {
    const sel = normalizedSelection();
    const idx = sel ? sel.endCol + 1 : numCols;
    const newRows = rows.map((row) => [...row.slice(0, idx), '', ...row.slice(idx)]);
    const newMerged: Record<string, MergedCell> = {};
    for (const [key, span] of Object.entries(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      newMerged[`${r},${c >= idx ? c + 1 : c}`] = span;
    }
    onMergedCellsChange(newMerged);
    onChange(newRows);
    setContextMenu(null);
  }, [normalizedSelection, numCols, rows, mergedCells, onChange, onMergedCellsChange]);

  const deleteCols = useCallback(() => {
    const sel = normalizedSelection();
    if (!sel) return;
    if (sel.endCol - sel.startCol + 1 >= numCols) return; // Can't delete all cols
    const newRows = rows.map((row) =>
      row.filter((_, i) => i < sel.startCol || i > sel.endCol),
    );
    const deletedCount = sel.endCol - sel.startCol + 1;
    const newMerged: Record<string, MergedCell> = {};
    for (const [key, span] of Object.entries(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      if (c >= sel.startCol && c <= sel.endCol) continue;
      const newC = c > sel.endCol ? c - deletedCount : c;
      newMerged[`${r},${newC}`] = span;
    }
    onMergedCellsChange(newMerged);
    onChange(newRows);
    setSelection(null);
    setContextMenu(null);
  }, [normalizedSelection, numCols, rows, mergedCells, onChange, onMergedCellsChange]);

  const mergeCells = useCallback(() => {
    const sel = normalizedSelection();
    if (!sel) return;
    if (sel.startRow === sel.endRow && sel.startCol === sel.endCol) return; // Single cell
    const newMerged = { ...mergedCells };
    // Remove any existing merges fully within the selection
    for (const key of Object.keys(newMerged)) {
      const [r, c] = key.split(',').map(Number);
      if (r >= sel.startRow && r <= sel.endRow && c >= sel.startCol && c <= sel.endCol) {
        delete newMerged[key];
      }
    }
    newMerged[`${sel.startRow},${sel.startCol}`] = {
      rowSpan: sel.endRow - sel.startRow + 1,
      colSpan: sel.endCol - sel.startCol + 1,
    };
    onMergedCellsChange(newMerged);
    setContextMenu(null);
  }, [normalizedSelection, mergedCells, onMergedCellsChange]);

  const unmergeCells = useCallback(() => {
    const sel = normalizedSelection();
    if (!sel) return;
    const newMerged = { ...mergedCells };
    for (const key of Object.keys(newMerged)) {
      const [r, c] = key.split(',').map(Number);
      if (r >= sel.startRow && r <= sel.endRow && c >= sel.startCol && c <= sel.endCol) {
        delete newMerged[key];
      }
    }
    onMergedCellsChange(newMerged);
    setContextMenu(null);
  }, [normalizedSelection, mergedCells, onMergedCellsChange]);

  const sortColumn = useCallback(
    (asc: boolean) => {
      const sel = normalizedSelection();
      if (!sel) return;
      const col = sel.startCol;
      const headerOffset = hasHeader ? 1 : 0;
      const headerRows = rows.slice(0, headerOffset);
      const dataRows = rows.slice(headerOffset).map((r) => [...r]);
      dataRows.sort((a, b) => {
        const va = a[col] ?? '';
        const vb = b[col] ?? '';
        // Try numeric comparison
        const na = Number(va);
        const nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          return asc ? na - nb : nb - na;
        }
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
      onChange([...headerRows, ...dataRows]);
      setContextMenu(null);
    },
    [normalizedSelection, hasHeader, rows, onChange],
  );

  const clearCells = useCallback(() => {
    const sel = normalizedSelection();
    if (!sel) return;
    const newRows = rows.map((r) => [...r]);
    for (let r = sel.startRow; r <= sel.endRow; r++) {
      for (let c = sel.startCol; c <= sel.endCol; c++) {
        newRows[r][c] = '';
      }
    }
    onChange(newRows);
    setContextMenu(null);
  }, [normalizedSelection, rows, onChange]);

  // Check if selection has any merged cells (for unmerge option)
  const selectionHasMerge = useCallback((): boolean => {
    const sel = normalizedSelection();
    if (!sel) return false;
    for (const key of Object.keys(mergedCells)) {
      const [r, c] = key.split(',').map(Number);
      if (r >= sel.startRow && r <= sel.endRow && c >= sel.startCol && c <= sel.endCol) {
        return true;
      }
    }
    return false;
  }, [normalizedSelection, mergedCells]);

  const selectionIsMultiCell = useCallback((): boolean => {
    const sel = normalizedSelection();
    if (!sel) return false;
    return sel.startRow !== sel.endRow || sel.startCol !== sel.endCol;
  }, [normalizedSelection]);

  if (numRows === 0 || numCols === 0) {
    return <div className={styles.empty}>No data. Open a CSV file or add rows.</div>;
  }

  return (
    <div className={styles.container} tabIndex={0}>
      <div className={styles.tableWrapper}>
        <table ref={tableRef} className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerHeader} />
              {Array.from({ length: numCols }, (_, c) => (
                <th
                  key={c}
                  className={styles.colHeader}
                  onClick={(e) => handleColHeaderClick(c, e)}
                >
                  {colLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={hasHeader && r === 0 ? styles.headerRow : undefined}>
                <td
                  className={styles.rowHeader}
                  onClick={(e) => handleRowHeaderClick(r, e)}
                >
                  {r + 1}
                </td>
                {row.map((cell, c) => {
                  if (isHiddenByMerge(r, c, mergedCells)) return null;
                  const span = getMergeSpan(r, c, mergedCells);
                  const isEditing = editingCell?.row === r && editingCell?.col === c;
                  const selected = isCellSelected(r, c);
                  return (
                    <td
                      key={c}
                      className={`${styles.cell} ${selected ? styles.selected : ''} ${
                        hasHeader && r === 0 ? styles.headerCell : ''
                      }`}
                      rowSpan={span?.rowSpan}
                      colSpan={span?.colSpan}
                      onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                      onMouseEnter={() => handleCellMouseEnter(r, c)}
                      onDoubleClick={() => handleCellDoubleClick(r, c)}
                      onContextMenu={(e) => handleContextMenu(r, c, e)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className={styles.cellInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onBlur={commitEdit}
                        />
                      ) : (
                        <span className={styles.cellText}>{cell}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={insertRowAbove}>Insert row above</button>
          <button onClick={insertRowBelow}>Insert row below</button>
          <button onClick={deleteRows}>Delete row(s)</button>
          <div className={styles.separator} />
          <button onClick={insertColLeft}>Insert column left</button>
          <button onClick={insertColRight}>Insert column right</button>
          <button onClick={deleteCols}>Delete column(s)</button>
          <div className={styles.separator} />
          {selectionIsMultiCell() && <button onClick={mergeCells}>Merge cells</button>}
          {selectionHasMerge() && <button onClick={unmergeCells}>Unmerge cells</button>}
          {(selectionIsMultiCell() || selectionHasMerge()) && <div className={styles.separator} />}
          <button onClick={() => sortColumn(true)}>Sort column A&rarr;Z</button>
          <button onClick={() => sortColumn(false)}>Sort column Z&rarr;A</button>
          <div className={styles.separator} />
          <button onClick={clearCells}>Clear cells</button>
        </div>
      )}
    </div>
  );
}
