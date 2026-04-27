import styles from './RawView.module.css';

interface RawViewProps {
  content: string;
  onChange: (content: string) => void;
}

export function RawView({ content, onChange }: RawViewProps) {
  return (
    <textarea
      className={styles.textarea}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Paste or type raw markdown here..."
      spellCheck={false}
    />
  );
}
