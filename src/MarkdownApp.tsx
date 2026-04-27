import { useCallback, useEffect } from 'react';
import { useMarkdownEditor } from './hooks/useMarkdownEditor';
import { useFileHandler } from './hooks/useFileHandler';
import { TabBar } from './components/TabBar/TabBar';
import { RawView } from './components/RawView/RawView';
import { EditingView } from './components/EditingView/EditingView';
import { PreviewView } from './components/PreviewView/PreviewView';
import { FileActions } from './components/FileActions/FileActions';
import type { Theme } from './hooks/useTheme';
import styles from './App.module.css';

export default function MarkdownApp({ theme }: { theme: Theme }) {
  const {
    content,
    setContent,
    viewMode,
    setViewMode,
    isDirty,
    setIsDirty,
    mdxEditorRef,
  } = useMarkdownEditor();

  const {
    fileInfo,
    cliMode,
    cwdInfo,
    loadFile,
    loadServerFile,
    saveFile,
    saveFileAs,
  } = useFileHandler('markdown');

  const handleLoad = useCallback(async () => {
    const text = await loadFile();
    if (text !== null) {
      setContent(text);
      setIsDirty(false);
      mdxEditorRef.current?.setMarkdown(text);
    }
  }, [loadFile, setContent, setIsDirty, mdxEditorRef]);

  const handleLoadServerFile = useCallback(
    async (path: string) => {
      const text = await loadServerFile(path);
      if (text !== null) {
        setContent(text);
        setIsDirty(false);
        mdxEditorRef.current?.setMarkdown(text);
      }
    },
    [loadServerFile, setContent, setIsDirty, mdxEditorRef],
  );

  // Auto-load file from ?file= query parameter (CLI mode)
  useEffect(() => {
    if (!cliMode) return;
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    if (file) {
      handleLoadServerFile(file);
    }
  }, [cliMode, handleLoadServerFile]);

  const handleSave = useCallback(async () => {
    const success = await saveFile(content);
    if (success) setIsDirty(false);
  }, [saveFile, content, setIsDirty]);

  const handleSaveAs = useCallback(async () => {
    const success = await saveFileAs(content);
    if (success) setIsDirty(false);
  }, [saveFileAs, content, setIsDirty]);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    setContent('');
    setIsDirty(false);
    mdxEditorRef.current?.setMarkdown('');
  }, [isDirty, setContent, setIsDirty, mdxEditorRef]);

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
      <TabBar activeTab={viewMode} onTabChange={setViewMode} />
      <main className={styles.editorArea}>
        {viewMode === 'raw' && (
          <RawView content={content} onChange={setContent} />
        )}
        {viewMode === 'editing' && (
          <EditingView
            editorRef={mdxEditorRef}
            content={content}
            onChange={setContent}
            darkMode={theme === 'dark'}
          />
        )}
        {viewMode === 'preview' && <PreviewView content={content} />}
      </main>
    </div>
  );
}
