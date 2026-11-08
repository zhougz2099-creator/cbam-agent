import { describe, expect, it } from 'vitest';
import type { Task } from '../src/types';
import {
  addDays,
  countTitleCharacters,
  dueMoment,
  formatDayLabel,
  formatDue,
  formatMoment,
  isOverdue,
  isReminderPending,
  isTodayTask,
  normalizeTitle,
  reminderMoment,
  sortAll,
  sortDone,
  sortToday,
  toDateKey,
  todayKey,
  validateTitle,
} from '../src/lib/tasks';

const NOW = new Date(2026, 10, 8, 14, 30, 0); // 2026-11-08 14:30 local

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    title: '任务',
    dueDate: null,
    dueTime: null,
    reminder: 'none',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('title validation', () => {
  it('requires 1 to 100 characters', () => {
    expect(validateTitle('')).toBe('请输入任务标题');
    expect(validateTitle('   ')).toBe('请输入任务标题');
    expect(validateTitle('买牛奶')).toBeNull();
    expect(validateTitle('a'.repeat(100))).toBeNull();
    expect(validateTitle('a'.repeat(101))).toContain('最多 100 字');
  });

  it('counts unicode characters instead of UTF-16 units', () => {
    expect(countTitleCharacters(' 你好 ')).toBe(2);
    expect(validateTitle('🎯'.repeat(100))).toBeNull();
  });

  it('normalizes whitespace', () => {
    expect(normalizeTitle('  提交   周报  ')).toBe('提交 周报');
  });
});

describe('dates and overdue state', () => {
  it('formats today and tomorrow', () => {
    expect(todayKey(NOW)).toBe('2026-11-08');
    expect(toDateKey(addDays(NOW, 1))).toBe('2026-11-09');
    expect(formatDayLabel('2026-11-08', NOW)).toBe('今天');
    expect(formatDayLabel('2026-11-09', NOW)).toBe('明天');
    expect(formatDayLabel('2026-11-07', NOW)).toBe('昨天');
    expect(formatDayLabel('2026-10-03', NOW)).toBe('10月3日');
  });

  it('uses end of day for date-only tasks', () => {
    const due = dueMoment({ dueDate: '2026-11-08', dueTime: null })!;
    expect(due.getHours()).toBe(23);
    expect(due.getMinutes()).toBe(59);
  });

  it('marks past timed tasks and past days overdue, but not today end-of-day', () => {
    expect(isOverdue(task({ dueDate: '2026-11-08', dueTime: null }), NOW)).toBe(false);
    expect(isOverdue(task({ dueDate: '2026-11-08', dueTime: '09:00' }), NOW)).toBe(true);
    expect(isOverdue(task({ dueDate: '2026-11-08', dueTime: '18:00' }), NOW)).toBe(false);
    expect(isOverdue(task({ dueDate: '2026-11-07', dueTime: null }), NOW)).toBe(true);
    expect(
      isOverdue(
        task({ dueDate: '2026-11-07', dueTime: '09:00', completedAt: NOW.toISOString() }),
        NOW,
      ),
    ).toBe(false);
  });

  it('formats the due label for the task row', () => {
    expect(formatDue(task({ dueDate: '2026-11-08', dueTime: '18:00' }), NOW)).toBe('今天 18:00');
    expect(formatDue(task({ dueDate: '2026-11-09', dueTime: null }), NOW)).toBe('明天');
  });

  it('formats completed timestamps', () => {
    expect(formatMoment('2026-11-08T06:05:00.000Z', NOW)).toMatch(/今天|11月8日/);
  });
});

describe('today view', () => {
  it('includes everything due by today and excludes later or undated tasks', () => {
    const overdue = task({ dueDate: '2026-11-07', dueTime: '09:00' });
    const today = task({ dueDate: '2026-11-08', dueTime: '18:00' });
    const later = task({ dueDate: '2026-11-09', dueTime: '09:00' });
    const undated = task({ dueDate: null });
    const completed = task({ dueDate: '2026-11-08', completedAt: NOW.toISOString() });

    expect(isTodayTask(overdue, NOW)).toBe(true);
    expect(isTodayTask(today, NOW)).toBe(true);
    expect(isTodayTask(later, NOW)).toBe(false);
    expect(isTodayTask(undated, NOW)).toBe(false);
    expect(isTodayTask(completed, NOW)).toBe(false);
  });

  it('sorts by time ascending and puts date-only tasks last', () => {
    const late = task({ id: 'late', dueDate: '2026-11-08', dueTime: '21:00' });
    const early = task({ id: 'early', dueDate: '2026-11-08', dueTime: '08:00' });
    const yesterday = task({ id: 'yesterday', dueDate: '2026-11-07', dueTime: '23:00' });
    const allDay = task({ id: 'allDay', dueDate: '2026-11-08', dueTime: null });
    const result = sortToday([allDay, late, early, yesterday], NOW).map((item) => item.id);
    expect(result).toEqual(['yesterday', 'early', 'late', 'allDay']);
  });
});

describe('all view', () => {
  it('puts dated tasks first by date, then undated by newest created', () => {
    const later = task({ id: 'later', dueDate: '2026-11-10', dueTime: null });
    const earlier = task({ id: 'earlier', dueDate: '2026-11-09', dueTime: null });
    const olderUndated = task({
      id: 'olderUndated',
      dueDate: null,
      createdAt: '2026-11-02T00:00:00.000Z',
    });
    const newerUndated = task({
      id: 'newerUndated',
      dueDate: null,
      createdAt: '2026-11-06T00:00:00.000Z',
    });
    const done = task({ id: 'done', dueDate: '2026-11-08', completedAt: NOW.toISOString() });

    const result = sortAll([later, earlier, olderUndated, newerUndated, done]).map((item) => item.id);
    expect(result).toEqual(['earlier', 'later', 'newerUndated', 'olderUndated']);
  });
});

describe('done view', () => {
  it('sorts completed tasks by completion time descending', () => {
    const old = task({ id: 'old', completedAt: '2026-11-01T00:00:00.000Z' });
    const recent = task({ id: 'recent', completedAt: '2026-11-08T00:00:00.000Z' });
    const open = task({ id: 'open' });
    expect(sortDone([old, recent, open]).map((item) => item.id)).toEqual(['recent', 'old']);
  });
});

describe('reminders', () => {
  it('computes the reminder moment from the due moment', () => {
    const due = task({ dueDate: '2026-11-08', dueTime: '18:00', reminder: '10m' });
    expect(reminderMoment(due)?.toISOString()).toBe(
      new Date(2026, 10, 8, 17, 50).toISOString(),
    );
    expect(reminderMoment(task({ dueDate: '2026-11-08', reminder: '1d' }))?.getTime()).toBe(
      new Date(2026, 10, 7, 23, 59, 59, 999).getTime(),
    );
    expect(reminderMoment(task({ dueDate: null, reminder: 'ontime' }))).toBeNull();
    expect(reminderMoment(task({ dueDate: '2026-11-08', reminder: 'none' }))).toBeNull();
  });

  it('does not schedule reminders for completed tasks', () => {
    expect(
      isReminderPending(
        task({
          dueDate: '2026-11-08',
          dueTime: '18:00',
          reminder: '10m',
          completedAt: NOW.toISOString(),
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isReminderPending(task({ dueDate: '2026-11-08', dueTime: '18:00', reminder: '10m' }), NOW),
    ).toBe(true);
  });
});
