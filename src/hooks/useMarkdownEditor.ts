import { useState, useCallback, useRef } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type { ViewMode } from '../types';

export function useMarkdownEditor() {
  const [content, setContentState] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('editing');
  const [isDirty, setIsDirty] = useState(false);
  const mdxEditorRef = useRef<MDXEditorMethods>(null);

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
    setIsDirty(true);
  }, []);

  return {
    content,
    setContent,
    viewMode,
    setViewMode,
    isDirty,
    setIsDirty,
    mdxEditorRef,
  };
}
