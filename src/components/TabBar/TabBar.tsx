import type { ViewMode } from '../../types';
import styles from './TabBar.module.css';

interface TabBarProps {
  activeTab: ViewMode;
  onTabChange: (tab: ViewMode) => void;
}

const tabs: { id: ViewMode; label: string }[] = [
  { id: 'raw', label: 'Raw' },
  { id: 'editing', label: 'Edit' },
  { id: 'preview', label: 'Preview' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
