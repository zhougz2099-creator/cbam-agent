import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings, NotificationState, Task, TaskDraft, ToastState, View } from './types';
import {
  isOverdue,
  reminderMoment,
  sortAll,
  sortDone,
  sortToday,
  todayKey,
  formatDue,
} from './lib/tasks';
import {
  createTask,
  hasOnboarded,
  insertTask,
  loadPermissionBannerDismissed,
  loadSettings,
  loadTasks,
  markOnboarded,
  patchTask,
  removeTask,
  restoreTask,
  savePermissionBannerDismissed,
  saveSettings,
  saveTasks,
  setCompletedAt,
} from './lib/storage';
import { track } from './lib/analytics';
import { AppHeader } from './components/AppHeader';
import { EmptyState } from './components/EmptyState';
import { TaskList } from './components/TaskList';
import { Toast } from './components/Toast';
import { TaskSheet } from './components/TaskSheet';
import { SettingsPage } from './components/SettingsPage';
import { Onboarding } from './components/Onboarding';
import { ReminderBar } from './components/ReminderBar';
import { PermissionBanner } from './components/PermissionBanner';
import { PlusIcon } from './components/Icon';

const COMPLETE_ANIMATION_MS = 900;
const REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function readNotificationState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationState;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [view, setView] = useState<View>('today');
  const [now, setNow] = useState(() => new Date());
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(() => !hasOnboarded());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [reminderAlert, setReminderAlert] = useState<Task | null>(null);
  const [notification, setNotification] = useState<NotificationState>(readNotificationState);
  const [permissionBannerDismissed, setPermissionBannerDismissed] = useState(
    loadPermissionBannerDismissed,
  );

  const toastCounter = useRef(0);
  const openTracked = useRef(false);
  const completionTimers = useRef<Record<string, number>>({});
  const fireReminderRef = useRef<(task: Task) => void>(() => {});

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (openTracked.current) return;
    openTracked.current = true;
    track('app_open');
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      Object.values(completionTimers.current).forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  useEffect(() => {
    function refresh() {
      setNow(new Date());
      setNotification(readNotificationState());
    }
    window.addEventListener('focus', refresh);
    window.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const overlayOpen = creating || editingId !== null || settingsOpen || onboarding;

  useEffect(() => {
    if (!overlayOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [overlayOpen]);

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = useCallback(
    (message: string, action?: ToastState['action'], duration = 5000) => {
      toastCounter.current += 1;
      setToast({
        id: toastCounter.current,
        message,
        action,
        duration,
        tone: 'default',
      });
    },
    [],
  );

  const editingTask = editingId ? tasks.find((task) => task.id === editingId) ?? null : null;

  const todayTasks = sortToday(tasks, now);
  const allTasks = sortAll(tasks);
  const doneTasks = sortDone(tasks);
  const visibleTasks = view === 'today' ? todayTasks : view === 'all' ? allTasks : doneTasks;
  const counts: Record<View, number> = {
    today: todayTasks.length,
    all: allTasks.length,
    done: doneTasks.length,
  };
  const overdueCount = todayTasks.filter((task) => isOverdue(task, now)).length;
  const showPermissionBanner = notification === 'denied' && !permissionBannerDismissed;

  function openTask(id: string) {
    setReminderAlert(null);
    setEditingId(id);
  }

  function handleToggle(task: Task) {
    if (task.completedAt) {
      setTasks((current) => setCompletedAt(current, task.id, null));
      showToast('已恢复为待办');
      return;
    }
    if (completing[task.id]) return;

    setCompleting((current) => ({ ...current, [task.id]: true }));
    completionTimers.current[task.id] = window.setTimeout(() => {
      delete completionTimers.current[task.id];
      setTasks((current) => setCompletedAt(current, task.id, new Date().toISOString()));
      setCompleting((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      setNow(new Date());
      showToast('已完成', {
        label: '撤销',
        run: () => setTasks((current) => setCompletedAt(current, task.id, null)),
      });
      track('task_complete', { source: 'list' });
    }, COMPLETE_ANIMATION_MS);
  }

  function handleDelete(task: Task) {
    const timer = completionTimers.current[task.id];
    if (timer) {
      window.clearTimeout(timer);
      delete completionTimers.current[task.id];
      setCompleting((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
    setTasks((current) => removeTask(current, task.id));
    setEditingId(null);
    setCreating(false);
    showToast('已删除', {
      label: '撤销',
      run: () => setTasks((current) => restoreTask(current, task)),
    });
  }

  function handleCreate(draft: TaskDraft) {
    const task = createTask(draft, new Date());
    setTasks((current) => insertTask(current, task));
    setCreating(false);
    showToast('已添加', {
      label: '撤销',
      run: () => setTasks((current) => removeTask(current, task.id)),
    });
    track('task_create', {
      source: 'fab',
      has_due_date: task.dueDate !== null,
    });

    if (view === 'done') {
      setView(task.dueDate && task.dueDate <= todayKey() ? 'today' : 'all');
    } else if (view === 'today' && !(task.dueDate && task.dueDate <= todayKey())) {
      setView('all');
    }
  }

  function handleUpdate(id: string, draft: TaskDraft) {
    setTasks((current) =>
      patchTask(current, id, {
        title: draft.title,
        dueDate: draft.dueDate,
        dueTime: draft.dueDate ? draft.dueTime : null,
        reminder: draft.dueDate ? draft.reminder : 'none',
      }),
    );
  }

  async function requestPermission() {
    if (!('Notification' in window)) {
      setNotification('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotification(result);
    } catch {
      setNotification(readNotificationState());
    }
  }

  fireReminderRef.current = (task: Task) => {
    if (completing[task.id]) return;
    setReminderAlert(task);
    setNow(new Date());
    if (notification === 'granted' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const body = task.dueDate ? `截止 ${formatDue(task)}` : task.title;
        const browserNotification = new Notification('LightTodo · 提醒', {
          body,
          tag: task.id,
          icon: '/favicon.svg',
        });
        browserNotification.onclick = () => {
          window.focus();
          openTask(task.id);
          track('reminder_open', { source: 'notification' });
          browserNotification.close();
        };
      } catch {
        // In-app reminder still shows.
      }
    }
  };

  useEffect(() => {
    if (!settings.remindersEnabled) return;
    const timers: number[] = [];
    const nowMs = Date.now();
    for (const task of tasks) {
      if (task.completedAt || task.reminder === 'none' || !task.dueDate) continue;
      const at = reminderMoment(task);
      if (!at) continue;
      const delay = at.getTime() - nowMs;
      if (delay <= 0 || delay > REMINDER_WINDOW_MS) continue;
      timers.push(
        window.setTimeout(() => {
          fireReminderRef.current(task);
        }, delay),
      );
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [tasks, settings.remindersEnabled]);

  function dismissPermissionBanner() {
    setPermissionBannerDismissed(true);
    savePermissionBannerDismissed(true);
  }

  function startOnboarding() {
    setOnboarding(false);
    markOnboarded();
  }

  return (
    <div className="app-frame">
      <AppHeader
        view={view}
        counts={counts}
        overdueCount={overdueCount}
        now={now}
        onViewChange={setView}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main id="task-panel" role="tabpanel" aria-labelledby={`tab-${view}`} tabIndex={-1}>
        {showPermissionBanner ? (
          <PermissionBanner
            onOpenSettings={() => setSettingsOpen(true)}
            onDismiss={dismissPermissionBanner}
          />
        ) : null}

        {visibleTasks.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          <TaskList
            tasks={visibleTasks}
            now={now}
            completing={completing}
            onOpen={openTask}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      </main>

      <button
        type="button"
        className="fab"
        aria-label="添加任务"
        onClick={() => setCreating(true)}
      >
        <PlusIcon size={27} />
      </button>

      {reminderAlert ? (
        <ReminderBar
          task={reminderAlert}
          onOpen={(task) => {
            track('reminder_open', { source: 'in_app' });
            openTask(task.id);
          }}
          onDismiss={() => setReminderAlert(null)}
        />
      ) : null}

      {toast ? <Toast toast={toast} onDismiss={dismissToast} /> : null}

      {creating ? (
        <TaskSheet
          key="create"
          mode="create"
          task={null}
          now={now}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editingTask ? (
        <TaskSheet
          key={editingTask.id}
          mode="edit"
          task={editingTask}
          now={now}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingId(null)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsPage
          settings={settings}
          notification={notification}
          onChangeSettings={setSettings}
          onRequestPermission={requestPermission}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {onboarding ? <Onboarding onStart={startOnboarding} /> : null}
    </div>
  );
}
