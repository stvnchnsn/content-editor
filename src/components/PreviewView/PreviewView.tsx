import { useMemo, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { extractHeadings } from '../../utils/markdownToc';
import styles from './PreviewView.module.css';

interface PreviewViewProps {
  content: string;
}

export function PreviewView({ content }: PreviewViewProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  const headingComponents = useMemo(() => {
    let index = 0;
    const makeHeading =
      (Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
      ({ children }: { children?: ReactNode }) => {
        const entry = headings[index++];
        const id = entry?.id ?? undefined;
        return <Tag id={id}>{children}</Tag>;
      };

    return {
      h1: makeHeading('h1'),
      h2: makeHeading('h2'),
      h3: makeHeading('h3'),
      h4: makeHeading('h4'),
      h5: makeHeading('h5'),
      h6: makeHeading('h6'),
    };
  }, [headings]);

  const handleTocClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.layout}>
      {headings.length > 0 && (
        <nav className={styles.toc} aria-label="Table of contents">
          <div className={styles.tocTitle}>Contents</div>
          <ul className={styles.tocList}>
            {headings.map((entry) => (
              <li
                key={entry.id}
                className={styles.tocItem}
                style={{ paddingLeft: `${(entry.level - 1) * 12}px` }}
              >
                <button
                  type="button"
                  className={styles.tocLink}
                  onClick={() => handleTocClick(entry.id)}
                >
                  {entry.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className={styles.preview}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            ...headingComponents,
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              if (match) {
                return (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={match[1]}
                    PreTag="div"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
