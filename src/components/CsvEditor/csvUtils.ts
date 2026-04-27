/** A merged cell span definition keyed by "row,col" */
export interface MergedCell {
  rowSpan: number;
  colSpan: number;
}

export interface CsvData {
  rows: string[][];
  mergedCells: Record<string, MergedCell>;
}

/**
 * Parse a CSV string into a 2D array of strings.
 * Handles quoted fields (with commas, newlines, and escaped quotes).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    // Start of field
    if (text[i] === '"') {
      // Quoted field
      i++; // skip opening quote
      let field = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            // Escaped quote
            field += '"';
            i += 2;
          } else {
            // End of quoted field
            i++; // skip closing quote
            break;
          }
        } else {
          field += text[i];
          i++;
        }
      }
      row.push(field);
      // After quoted field, expect comma, newline, or EOF
      if (i < len && text[i] === ',') {
        i++;
      } else if (i < len && (text[i] === '\r' || text[i] === '\n')) {
        if (text[i] === '\r' && i + 1 < len && text[i + 1] === '\n') i++;
        i++;
        rows.push(row);
        row = [];
      }
    } else {
      // Unquoted field
      let field = '';
      while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
        field += text[i];
        i++;
      }
      row.push(field);
      if (i < len && text[i] === ',') {
        i++;
      } else if (i < len && (text[i] === '\r' || text[i] === '\n')) {
        if (text[i] === '\r' && i + 1 < len && text[i + 1] === '\n') i++;
        i++;
        rows.push(row);
        row = [];
      }
    }
  }

  // Push the last row if non-empty
  if (row.length > 0) {
    rows.push(row);
  }

  // Normalize: ensure all rows have the same number of columns
  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  for (const r of rows) {
    while (r.length < maxCols) r.push('');
  }

  return rows;
}

/**
 * Serialize a 2D array of strings into a CSV string.
 * Quotes fields that contain commas, newlines, or double quotes.
 */
export function serializeCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(','),
    )
    .join('\n');
}

/** Generate a column letter label (A, B, ..., Z, AA, AB, ...) */
export function colLabel(index: number): string {
  let label = '';
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

/** Check if a cell at (row, col) is hidden by a merged cell */
export function isHiddenByMerge(
  row: number,
  col: number,
  mergedCells: Record<string, MergedCell>,
): boolean {
  for (const [key, span] of Object.entries(mergedCells)) {
    const [mr, mc] = key.split(',').map(Number);
    if (row === mr && col === mc) continue; // The anchor cell itself is not hidden
    if (row >= mr && row < mr + span.rowSpan && col >= mc && col < mc + span.colSpan) {
      return true;
    }
  }
  return false;
}

/** Get the merge span for a cell, if it's an anchor */
export function getMergeSpan(
  row: number,
  col: number,
  mergedCells: Record<string, MergedCell>,
): MergedCell | null {
  return mergedCells[`${row},${col}`] ?? null;
}
