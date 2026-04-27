import type { EditorType } from '../../types';
import styles from './EditorTypeSwitcher.module.css';

interface EditorTypeSwitcherProps {
  activeType: EditorType;
  onTypeChange: (type: EditorType) => void;
}

const editors: { id: EditorType; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'csv', label: 'CSV' },
];

export function EditorTypeSwitcher({ activeType, onTypeChange }: EditorTypeSwitcherProps) {
  return (
    <div className={styles.switcher}>
      {editors.map((editor) => (
        <button
          key={editor.id}
          className={`${styles.btn} ${activeType === editor.id ? styles.active : ''}`}
          onClick={() => onTypeChange(editor.id)}
        >
          {editor.label}
        </button>
      ))}
    </div>
  );
}
