import type { ReminderOption, Task } from '../types';

export const TITLE_MAX = 100;

export const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: 'none', label: '不提醒' },
  { value: 'ontime', label: '准时' },
  { value: '10m', label: '提前 10 分钟' },
  { value: '1h', label: '提前 1 小时' },
  { value: '1d', label: '提前 1 天' },
];

const REMINDER_OFFSETS: Record<ReminderOption, number> = {
  none: 0,
  ontime: 0,
  '10m': 10 * 60_000,
  '1h': 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** YYYY-MM-DD in the user's local timezone. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(now: Date, days: number): Date {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function hasTime(task: Pick<Task, 'dueTime'>): boolean {
  return task.dueTime !== null;
}

/**
 * The exact moment a task is due. A task without a time of day is due at the
 * very end of its day, which is how "今天 23:59" is defined in the PRD.
 */
export function dueMoment(task: Pick<Task, 'dueDate' | 'dueTime'>): Date | null {
  if (!task.dueDate) return null;
  const day = parseDateKey(task.dueDate);
  if (!task.dueTime) {
    day.setHours(23, 59, 59, 999);
    return day;
  }
  const [hours, minutes] = task.dueTime.split(':').map(Number);
  day.setHours(hours, minutes, 0, 0);
  return day;
}

export function isOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate || task.completedAt) return false;
  if (task.dueTime) {
    return (dueMoment(task)?.getTime() ?? 0) < now.getTime();
  }
  return task.dueDate < toDateKey(now);
}

/** 今天：截止日期 ≤ 今天 23:59 且未完成（含逾期）。 */
export function isTodayTask(task: Task, now: Date = new Date()): boolean {
  return !task.completedAt && task.dueDate !== null && task.dueDate <= toDateKey(now);
}

export function compareToday(a: Task, b: Task): number {
  const aTimed = hasTime(a);
  const bTimed = hasTime(b);
  if (aTimed && bTimed) {
    const diff = (dueMoment(a)?.getTime() ?? 0) - (dueMoment(b)?.getTime() ?? 0);
    if (diff !== 0) return diff;
    return b.createdAt.localeCompare(a.createdAt);
  }
  if (aTimed !== bTimed) return aTimed ? -1 : 1;
  const byDay = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  if (byDay !== 0) return byDay;
  return b.createdAt.localeCompare(a.createdAt);
}

export function sortToday(tasks: Task[], now: Date = new Date()): Task[] {
  return tasks.filter((task) => isTodayTask(task, now)).sort(compareToday);
}

export function sortAll(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => !task.completedAt)
    .sort((a, b) => {
      const aDated = a.dueDate !== null;
      const bDated = b.dueDate !== null;
      if (aDated !== bDated) return aDated ? -1 : 1;
      if (aDated && bDated) {
        const byDay = a.dueDate!.localeCompare(b.dueDate!);
        if (byDay !== 0) return byDay;
        const aTimed = hasTime(a);
        const bTimed = hasTime(b);
        if (aTimed !== bTimed) return aTimed ? -1 : 1;
        if (aTimed && bTimed) {
          const diff = (dueMoment(a)?.getTime() ?? 0) - (dueMoment(b)?.getTime() ?? 0);
          if (diff !== 0) return diff;
        }
        return b.createdAt.localeCompare(a.createdAt);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function sortDone(tasks: Task[]): Task[] {
  return tasks
    .filter((task) => task.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export function countTitleCharacters(title: string): number {
  return [...title.trim()].length;
}

export function validateTitle(title: string): string | null {
  const length = countTitleCharacters(title);
  if (length === 0) return '请输入任务标题';
  if (length > TITLE_MAX) return `标题最多 ${TITLE_MAX} 字，当前 ${length} 字`;
  return null;
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

export function formatHeaderDate(now: Date = new Date()): string {
  return `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;
}

export function formatDayLabel(dateKey: string, now: Date = new Date()): string {
  const target = parseDateKey(dateKey);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays === -1) return '昨天';
  if (target.getFullYear() === now.getFullYear()) {
    return `${target.getMonth() + 1}月${target.getDate()}日`;
  }
  return `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`;
}

export function formatDue(task: Pick<Task, 'dueDate' | 'dueTime'>, now: Date = new Date()): string {
  if (!task.dueDate) return '';
  const day = formatDayLabel(task.dueDate, now);
  return task.dueTime ? `${day} ${task.dueTime}` : day;
}

export function formatMoment(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = formatDayLabel(toDateKey(date), now);
  return `${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function reminderLabel(option: ReminderOption): string {
  return REMINDER_OPTIONS.find((item) => item.value === option)?.label ?? '不提醒';
}

/** When a reminder should fire, or null when the task has no reminder/time. */
export function reminderMoment(
  task: Pick<Task, 'dueDate' | 'dueTime' | 'reminder'>,
): Date | null {
  if (!task.dueDate || task.reminder === 'none') return null;
  const due = dueMoment(task);
  if (!due) return null;
  return new Date(due.getTime() - REMINDER_OFFSETS[task.reminder]);
}

export function isReminderPending(task: Task, now: Date = new Date()): boolean {
  if (task.completedAt || task.reminder === 'none') return false;
  const at = reminderMoment(task);
  return at !== null && at.getTime() > now.getTime();
}
