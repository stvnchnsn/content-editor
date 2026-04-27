import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  BlockTypeSelect,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  InsertCodeBlock,
  ListsToggle,
  UndoRedo,
  Separator,
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import styles from './EditingView.module.css';

interface EditingViewProps {
  content: string;
  onChange: (content: string) => void;
  editorRef: React.RefObject<MDXEditorMethods | null>;
  darkMode?: boolean;
}

export function EditingView({ content, onChange, editorRef, darkMode }: EditingViewProps) {
  return (
    <div className={styles.editorWrapper}>
      <MDXEditor
        ref={editorRef}
        markdown={content}
        onChange={onChange}
        className={darkMode ? 'dark-theme' : undefined}
        contentEditableClassName={styles.editableContent}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              javascript: 'JavaScript',
              ts: 'TypeScript',
              typescript: 'TypeScript',
              tsx: 'TSX',
              jsx: 'JSX',
              css: 'CSS',
              html: 'HTML',
              json: 'JSON',
              python: 'Python',
              sql: 'SQL',
              bash: 'Bash',
              go: 'Go',
              rust: 'Rust',
              java: 'Java',
              cpp: 'C++',
              txt: 'Plain Text',
              '': 'Unspecified',
            },
          }),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <StrikeThroughSupSubToggles />
                <CodeToggle />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <InsertImage />
                <Separator />
                <InsertTable />
                <InsertThematicBreak />
                <InsertCodeBlock />
              </>
            ),
          }),
        ]}
      />
    </div>
  );
}
