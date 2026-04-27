export type ViewMode = 'raw' | 'editing' | 'preview';

export type JsonViewMode = 'editor' | 'tree';

export type EditorType = 'markdown' | 'json' | 'csv';

export interface FileInfo {
  name: string;
  handle?: FileSystemFileHandle;
  serverPath?: string;
}

export interface CwdInfo {
  cwd: string;
  files: string[];
}

export interface JsonDiagnostic {
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning';
}
