import { useState, useCallback, useEffect } from 'react';
import type { FileInfo, CwdInfo, EditorType } from '../types';

const supportsFileSystemAccess =
  typeof window !== 'undefined' && 'showOpenFilePicker' in window;

const FILE_TYPE_CONFIG = {
  markdown: {
    description: 'Markdown files',
    accept: { 'text/markdown': ['.md', '.markdown', '.mdx', '.txt'] } as Record<string, string[]>,
    inputAccept: '.md,.markdown,.mdx,.txt',
    defaultName: 'document.md',
    mimeType: 'text/markdown',
    saveDescription: 'Markdown file',
    saveAccept: { 'text/markdown': ['.md'] } as Record<string, string[]>,
  },
  json: {
    description: 'JSON files',
    accept: { 'application/json': ['.json'] } as Record<string, string[]>,
    inputAccept: '.json',
    defaultName: 'document.json',
    mimeType: 'application/json',
    saveDescription: 'JSON file',
    saveAccept: { 'application/json': ['.json'] } as Record<string, string[]>,
  },
  csv: {
    description: 'CSV files',
    accept: { 'text/csv': ['.csv', '.tsv'] } as Record<string, string[]>,
    inputAccept: '.csv,.tsv',
    defaultName: 'document.csv',
    mimeType: 'text/csv',
    saveDescription: 'CSV file',
    saveAccept: { 'text/csv': ['.csv'] } as Record<string, string[]>,
  },
};

export function useFileHandler(fileType: EditorType = 'markdown') {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [cliMode, setCliMode] = useState(false);
  const [cwdInfo, setCwdInfo] = useState<CwdInfo | null>(null);
  const config = FILE_TYPE_CONFIG[fileType];

  // Detect CLI mode on mount
  useEffect(() => {
    fetch(`/api/cwd?type=${fileType}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not CLI mode');
      })
      .then((data: CwdInfo) => {
        setCliMode(true);
        setCwdInfo(data);
      })
      .catch(() => {
        setCliMode(false);
      });
  }, [fileType]);

  const refreshFileList = useCallback(async () => {
    try {
      const res = await fetch(`/api/cwd?type=${fileType}`);
      if (res.ok) {
        const data: CwdInfo = await res.json();
        setCwdInfo(data);
      }
    } catch {
      // ignore
    }
  }, [fileType]);

  const loadServerFile = useCallback(
    async (path: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
        if (!res.ok) return null;
        const data = await res.json();
        setFileInfo({ name: data.name, serverPath: data.name });
        return data.content;
      } catch {
        return null;
      }
    },
    [],
  );

  const loadFile = useCallback(async (): Promise<string | null> => {
    if (supportsFileSystemAccess) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: config.description,
              accept: config.accept,
            },
          ],
        });
        const file = await handle.getFile();
        const text = await file.text();
        setFileInfo({ name: file.name, handle });
        return text;
      } catch {
        return null;
      }
    }

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = config.inputAccept;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const text = await file.text();
        setFileInfo({ name: file.name });
        resolve(text);
      };
      input.click();
    });
  }, [config]);

  const saveFile = useCallback(
    async (content: string): Promise<boolean> => {
      // CLI mode: save to server if we have a server path
      if (cliMode && fileInfo?.serverPath) {
        try {
          const res = await fetch(
            `/api/file?path=${encodeURIComponent(fileInfo.serverPath)}`,
            { method: 'POST', body: content },
          );
          if (res.ok) {
            await refreshFileList();
            return true;
          }
        } catch {
          // Fall through
        }
      }

      if (supportsFileSystemAccess && fileInfo?.handle) {
        try {
          const writable = await (fileInfo.handle as any).createWritable();
          await writable.write(content);
          await writable.close();
          return true;
        } catch {
          // Fall through to Save As
        }
      }

      if (supportsFileSystemAccess) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileInfo?.name || config.defaultName,
            types: [
              {
                description: config.saveDescription,
                accept: config.saveAccept,
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          setFileInfo({ name: handle.name, handle });
          return true;
        } catch {
          return false;
        }
      }

      // CLI mode fallback: prompt for filename and save to server
      if (cliMode) {
        const name = prompt('Save as:', fileInfo?.name || config.defaultName);
        if (!name) return false;
        try {
          const res = await fetch(`/api/file?path=${encodeURIComponent(name)}`, {
            method: 'POST',
            body: content,
          });
          if (res.ok) {
            setFileInfo({ name, serverPath: name });
            await refreshFileList();
            return true;
          }
        } catch {
          // Fall through
        }
        return false;
      }

      const blob = new Blob([content], { type: config.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo?.name || config.defaultName;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    },
    [fileInfo, cliMode, refreshFileList, config],
  );

  const saveFileAs = useCallback(
    async (content: string): Promise<boolean> => {
      if (supportsFileSystemAccess) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileInfo?.name || config.defaultName,
            types: [
              {
                description: config.saveDescription,
                accept: config.saveAccept,
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          setFileInfo({ name: handle.name, handle });
          return true;
        } catch {
          return false;
        }
      }

      // CLI mode: prompt for filename
      if (cliMode) {
        const name = prompt('Save as:', fileInfo?.name || config.defaultName);
        if (!name) return false;
        try {
          const res = await fetch(`/api/file?path=${encodeURIComponent(name)}`, {
            method: 'POST',
            body: content,
          });
          if (res.ok) {
            setFileInfo({ name, serverPath: name });
            await refreshFileList();
            return true;
          }
        } catch {
          // Fall through
        }
        return false;
      }

      const blob = new Blob([content], { type: config.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo?.name || config.defaultName;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    },
    [fileInfo, cliMode, refreshFileList, config],
  );

  return {
    fileInfo,
    cliMode,
    cwdInfo,
    loadFile,
    loadServerFile,
    saveFile,
    saveFileAs,
    refreshFileList,
  };
}
