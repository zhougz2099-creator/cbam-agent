import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../types';
import {
  formatDue,
  formatMoment,
  isOverdue,
  reminderLabel,
} from '../lib/tasks';
import { BellIcon, CalendarIcon, CheckIcon, TrashIcon } from './Icon';

const SWIPE_WIDTH = 92;

interface TaskItemProps {
  task: Task;
  index: number;
  now: Date;
  completing: boolean;
  onOpen: (id: string) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

interface DragState {
  startX: number;
  startY: number;
  base: number;
  swiping: boolean;
}

export function TaskItem({ task, index, now, completing, onOpen, onToggle, onDelete }: TaskItemProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const offsetRef = useRef(0);
  const suppressClick = useRef(false);

  const completed = task.completedAt !== null;
  const overdue = isOverdue(task, now);
  const due = task.dueDate ? formatDue(task, now) : '';
  const meta = completed
    ? `完成于 ${formatMoment(task.completedAt!, now)}`
    : task.dueDate
      ? overdue
        ? `已逾期 · ${due}`
        : due
      : '无截止日期';
  const reminder =
    !completed && task.dueDate && task.reminder !== 'none' ? reminderLabel(task.reminder) : '';

  function updateOffset(next: number) {
    offsetRef.current = next;
    setOffset(next);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (completing) return;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      base: offsetRef.current,
      swiping: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.swiping) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        setDragging(false);
        return;
      }
      state.swiping = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    suppressClick.current = true;
    const next = Math.max(-SWIPE_WIDTH, Math.min(0, state.base + dx));
    updateOffset(next);
  }

  function endDrag() {
    const state = drag.current;
    drag.current = null;
    setDragging(false);
    if (!state?.swiping) return;
    updateOffset(offsetRef.current <= -SWIPE_WIDTH / 2 ? -SWIPE_WIDTH : 0);
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function handleOpenClick() {
    if (suppressClick.current) return;
    if (offsetRef.current !== 0) {
      updateOffset(0);
      return;
    }
    onOpen(task.id);
  }

  function handleDelete() {
    onDelete(task);
    updateOffset(0);
  }

  const style = {
    '--swipe': `${offset}px`,
    '--i': index,
  } as CSSProperties;

  return (
    <li
      className={`task-item${completing ? ' is-completing' : ''}${completed ? ' is-completed' : ''}`}
      style={style}
    >
      <div className="task-item__actions">
        <button
          type="button"
          className="delete-action"
          aria-label={`删除任务：${task.title}`}
          onClick={handleDelete}
        >
          <TrashIcon />
          <span>删除</span>
        </button>
      </div>

      <div
        className={`task-item__surface${dragging ? ' is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <button
          type="button"
          className="check-button"
          role="checkbox"
          aria-checked={completed}
          aria-label={completed ? `标记为未完成：${task.title}` : `标记为完成：${task.title}`}
          onClick={() => onToggle(task)}
        >
          <CheckIcon size={14} className="check-button__icon" />
        </button>

        <button type="button" className="task-open" onClick={handleOpenClick}>
          <span className="task-title">{task.title}</span>
          <span
            className={`task-meta${overdue ? ' is-overdue' : ''}`}
          >
            {task.dueDate && !overdue && !completed && due ? (
              <CalendarIcon size={13} className="task-meta__icon" />
            ) : null}
            <span className="task-meta__text">{meta}</span>
            {reminder ? (
              <span className="task-meta__reminder">
                <BellIcon size={12} />
                {reminder}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </li>
  );
}
