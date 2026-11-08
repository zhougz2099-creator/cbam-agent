import type { View } from '../types';
import { formatHeaderDate } from '../lib/tasks';
import { SettingsIcon, SunMark } from './Icon';

interface AppHeaderProps {
  view: View;
  counts: Record<View, number>;
  overdueCount: number;
  now: Date;
  onViewChange: (view: View) => void;
  onOpenSettings: () => void;
}

const TITLES: Record<View, string> = {
  today: '今天',
  all: '全部',
  done: '已完成',
};

const TABS: { value: View; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'all', label: '全部' },
  { value: 'done', label: '已完成' },
];

export function AppHeader({
  view,
  counts,
  overdueCount,
  now,
  onViewChange,
  onOpenSettings,
}: AppHeaderProps) {
  let meta = '';
  if (view === 'today') {
    meta = `${formatHeaderDate(now)} · ${counts.today} 件待办`;
    if (overdueCount > 0) meta += ` · ${overdueCount} 件已逾期`;
  } else if (view === 'all') {
    meta = `全部 ${counts.all} 件未完成`;
  } else {
    meta = `已完成 ${counts.done} 件`;
  }

  return (
    <header className="app-header">
      <div className="brand-row">
        <div className="brand">
          <SunMark size={20} className="brand__mark" />
          <span className="brand__name">LightTodo</span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="设置"
          onClick={onOpenSettings}
        >
          <SettingsIcon size={21} />
        </button>
      </div>

      <div className="view-heading" aria-live="polite">
        <h1>{TITLES[view]}</h1>
        <p className="view-heading__meta">{meta}</p>
      </div>

      <nav className="tabs" role="tablist" aria-label="任务视图">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={view === tab.value}
            aria-controls="task-panel"
            aria-label={`${tab.label}，${counts[tab.value]} 件`}
            className={`tab${view === tab.value ? ' is-active' : ''}`}
            onClick={() => onViewChange(tab.value)}
          >
            {tab.label}
            <span className="tab__count">{counts[tab.value]}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
