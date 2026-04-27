import { useState, useMemo } from 'react';
import styles from './JsonTreeView.module.css';

interface JsonTreeViewProps {
  content: string;
  maxValueLength: number;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max) + '...';
}

interface TreeNodeProps {
  keyName: string | null;
  value: unknown;
  maxLen: number;
  depth: number;
  isLast: boolean;
}

function TreeNode({ keyName, value, maxLen, depth, isLast }: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (value === null) {
    return (
      <div className={styles.node} style={{ paddingLeft: depth * 20 }}>
        {keyName !== null && <span className={styles.key}>{keyName}: </span>}
        <span className={styles.null}>null</span>
        {!isLast && <span className={styles.comma}>,</span>}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className={styles.node} style={{ paddingLeft: depth * 20 }}>
        {keyName !== null && <span className={styles.key}>{keyName}: </span>}
        <span className={styles.boolean}>{String(value)}</span>
        {!isLast && <span className={styles.comma}>,</span>}
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className={styles.node} style={{ paddingLeft: depth * 20 }}>
        {keyName !== null && <span className={styles.key}>{keyName}: </span>}
        <span className={styles.number}>{String(value)}</span>
        {!isLast && <span className={styles.comma}>,</span>}
      </div>
    );
  }

  if (typeof value === 'string') {
    const display = truncate(value, maxLen);
    const isTruncated = display !== value;
    return (
      <div className={styles.node} style={{ paddingLeft: depth * 20 }}>
        {keyName !== null && <span className={styles.key}>{keyName}: </span>}
        <span className={styles.string} title={isTruncated ? value : undefined}>
          "{display}"
        </span>
        {isTruncated && <span className={styles.truncated}> ({value.length} chars)</span>}
        {!isLast && <span className={styles.comma}>,</span>}
      </div>
    );
  }

  if (Array.isArray(value)) {
    const len = value.length;
    return (
      <div>
        <div
          className={`${styles.node} ${styles.collapsible}`}
          style={{ paddingLeft: depth * 20 }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className={styles.toggle}>{collapsed ? '\u25B6' : '\u25BC'}</span>
          {keyName !== null && <span className={styles.key}>{keyName}: </span>}
          {collapsed ? (
            <span className={styles.bracket}>[...] <span className={styles.count}>({len} items)</span></span>
          ) : (
            <span className={styles.bracket}>[</span>
          )}
        </div>
        {!collapsed && (
          <>
            {value.map((item, i) => (
              <TreeNode
                key={i}
                keyName={null}
                value={item}
                maxLen={maxLen}
                depth={depth + 1}
                isLast={i === len - 1}
              />
            ))}
            <div className={styles.node} style={{ paddingLeft: depth * 20 }}>
              <span className={styles.bracket}>]</span>
              {!isLast && <span className={styles.comma}>,</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const len = entries.length;
    return (
      <div>
        <div
          className={`${styles.node} ${styles.collapsible}`}
          style={{ paddingLeft: depth * 20 }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className={styles.toggle}>{collapsed ? '\u25B6' : '\u25BC'}</span>
          {keyName !== null && <span className={styles.key}>{keyName}: </span>}
          {collapsed ? (
            <span className={styles.bracket}>{'{'} ... {'}'} <span className={styles.count}>({len} keys)</span></span>
          ) : (
            <span className={styles.bracket}>{'{'}</span>
          )}
        </div>
        {!collapsed && (
          <>
            {entries.map(([k, v], i) => (
              <TreeNode
                key={k}
                keyName={k}
                value={v}
                maxLen={maxLen}
                depth={depth + 1}
                isLast={i === len - 1}
              />
            ))}
            <div className={styles.node} style={{ paddingLeft: depth * 20 }}>
              <span className={styles.bracket}>{'}'}</span>
              {!isLast && <span className={styles.comma}>,</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

export function JsonTreeView({ content, maxValueLength }: JsonTreeViewProps) {
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, data: JSON.parse(content) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [content]);

  if (!content.trim()) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No JSON content to display</div>
      </div>
    );
  }

  if (!parsed.ok) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Invalid JSON: {parsed.error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TreeNode keyName={null} value={parsed.data} maxLen={maxValueLength} depth={0} isLast />
    </div>
  );
}
