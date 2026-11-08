import type { AppSettings, ReminderOption, Task, TaskDraft } from '../types';
import { makeId, normalizeTitle, reminderMoment, validateTitle } from './tasks';

export const TASKS_KEY = 'lighttodo.tasks.v1';
export const SETTINGS_KEY = 'lighttodo.settings.v1';
export const ONBOARDED_KEY = 'lighttodo.onboarded.v1';
export const PERMISSION_BANNER_KEY = 'lighttodo.permissionBannerDismissed.v1';

const REMINDERS: ReminderOption[] = ['none', 'ontime', '10m', '1h', '1d'];

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / quota exhaustion: the session still works in memory.
  }
}

export function loadTasks(): Task[] {
  const raw = readStorage(TASKS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTask).map((task) => ({
      ...task,
      title: normalizeTitle(task.title),
    }));
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  writeStorage(TASKS_KEY, JSON.stringify(tasks));
}

export function loadSettings(): AppSettings {
  const raw = readStorage(SETTINGS_KEY);
  if (!raw) return { remindersEnabled: true };
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { remindersEnabled: parsed.remindersEnabled !== false };
  } catch {
    return { remindersEnabled: true };
  }
}

export function saveSettings(settings: AppSettings): void {
  writeStorage(SETTINGS_KEY, JSON.stringify(settings));
}

export function hasOnboarded(): boolean {
  return readStorage(ONBOARDED_KEY) === '1';
}

export function markOnboarded(): void {
  writeStorage(ONBOARDED_KEY, '1');
}

export function loadPermissionBannerDismissed(): boolean {
  return readStorage(PERMISSION_BANNER_KEY) === '1';
}

export function savePermissionBannerDismissed(dismissed: boolean): void {
  if (dismissed) writeStorage(PERMISSION_BANNER_KEY, '1');
  else {
    try {
      window.localStorage.removeItem(PERMISSION_BANNER_KEY);
    } catch {
      // ignore
    }
  }
}

export function createTask(draft: TaskDraft, now: Date = new Date()): Task {
  const timestamp = now.toISOString();
  return {
    id: makeId(),
    title: normalizeTitle(draft.title),
    dueDate: draft.dueDate,
    dueTime: draft.dueDate ? draft.dueTime : null,
    reminder: draft.dueDate ? draft.reminder : 'none',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
}

export function insertTask(tasks: Task[], task: Task): Task[] {
  return [task, ...tasks];
}

export function patchTask(
  tasks: Task[],
  id: string,
  patch: Partial<Omit<Task, 'id' | 'createdAt'>>,
  now: Date = new Date(),
): Task[] {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          ...patch,
          title: patch.title !== undefined ? normalizeTitle(patch.title) : task.title,
          updatedAt: now.toISOString(),
        }
      : task,
  );
}

export function removeTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function restoreTask(tasks: Task[], task: Task): Task[] {
  if (tasks.some((item) => item.id === task.id)) return tasks;
  return [...tasks, task];
}

export function setCompletedAt(
  tasks: Task[],
  id: string,
  completedAt: string | null,
  now: Date = new Date(),
): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, completedAt, updatedAt: now.toISOString() } : task,
  );
}

export function findTask(tasks: Task[], id: string | null): Task | null {
  if (!id) return null;
  return tasks.find((task) => task.id === id) ?? null;
}

export function timeUntilReminder(task: Task, now: Date = new Date()): number | null {
  const at = reminderMoment(task);
  if (!at) return null;
  return at.getTime() - now.getTime();
}

export function isValidDraft(draft: TaskDraft): boolean {
  return validateTitle(draft.title) === null;
}

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    validateTitle(task.title) === null &&
    (task.dueDate === null || typeof task.dueDate === 'string') &&
    (task.dueTime === null || typeof task.dueTime === 'string') &&
    typeof task.reminder === 'string' &&
    REMINDERS.includes(task.reminder as ReminderOption) &&
    typeof task.createdAt === 'string' &&
    typeof task.updatedAt === 'string' &&
    (task.completedAt === null || typeof task.completedAt === 'string')
  );
}
