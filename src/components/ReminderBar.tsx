import type { Task } from '../types';
import { formatDue } from '../lib/tasks';
import { BellIcon, CloseIcon } from './Icon';

interface ReminderBarProps {
  task: Task;
  onOpen: (task: Task) => void;
  onDismiss: () => void;
}

export function ReminderBar({ task, onOpen, onDismiss }: ReminderBarProps) {
  return (
    <div className="reminder-bar" role="alert">
      <span className="reminder-bar__icon">
        <BellIcon size={18} />
      </span>
      <div className="reminder-bar__body">
        <p className="reminder-bar__eyebrow">提醒</p>
        <p className="reminder-bar__title">{task.title}</p>
        {task.dueDate ? (
          <p className="reminder-bar__meta">截止 {formatDue(task)}</p>
        ) : null}
      </div>
      <button type="button" className="reminder-bar__open" onClick={() => onOpen(task)}>
        查看
      </button>
      <button
        type="button"
        className="icon-button icon-button--inverse"
        aria-label="关闭提醒"
        onClick={onDismiss}
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}
