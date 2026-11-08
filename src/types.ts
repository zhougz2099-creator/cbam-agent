export type ReminderOption = 'none' | 'ontime' | '10m' | '1h' | '1d';

export type View = 'today' | 'all' | 'done';

export interface Task {
  id: string;
  title: string;
  /** Local calendar day, YYYY-MM-DD. Null means no due date. */
  dueDate: string | null;
  /** Local time of day, HH:mm. Null means the task is due at the end of the day. */
  dueTime: string | null;
  reminder: ReminderOption;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskDraft {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  reminder: ReminderOption;
}

export interface AppSettings {
  remindersEnabled: boolean;
}

export type ToastTone = 'default' | 'danger';

export interface ToastState {
  id: number;
  message: string;
  duration: number;
  tone: ToastTone;
  action?: {
    label: string;
    run: () => void;
  };
}

export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied';
