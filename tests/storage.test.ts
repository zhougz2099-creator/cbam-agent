import { describe, expect, it } from 'vitest';
import type { Task } from '../src/types';
import {
  createTask,
  insertTask,
  patchTask,
  removeTask,
  restoreTask,
  setCompletedAt,
} from '../src/lib/storage';

const NOW = new Date(2026, 10, 8, 14, 30, 0);

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
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

describe('task store helpers', () => {
  it('creates a normalized task with an id and timestamps', () => {
    const created = createTask(
      { title: '  买  牛奶 ', dueDate: '2026-11-08', dueTime: '18:00', reminder: '10m' },
      NOW,
    );
    expect(created.title).toBe('买 牛奶');
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe(NOW.toISOString());
    expect(created.completedAt).toBeNull();
    expect(created.reminder).toBe('10m');
  });

  it('drops the reminder when a task has no due date', () => {
    const created = createTask(
      { title: '随手记', dueDate: null, dueTime: null, reminder: '1h' },
      NOW,
    );
    expect(created.reminder).toBe('none');
    expect(created.dueTime).toBeNull();
  });

  it('inserts newest tasks first and removes by id', () => {
    const existing = task();
    const created = task({ id: 'task-2' });
    const inserted = insertTask([existing], created);
    expect(inserted.map((item) => item.id)).toEqual(['task-2', 'task-1']);
    expect(removeTask(inserted, 'task-2').map((item) => item.id)).toEqual(['task-1']);
  });

  it('restores a deleted task exactly once', () => {
    const deleted = task({ id: 'deleted' });
    const restored = restoreTask([task()], deleted);
    expect(restored.map((item) => item.id)).toEqual(['task-1', 'deleted']);
    expect(restoreTask(restored, deleted)).toHaveLength(2);
  });

  it('patches fields and trims the title', () => {
    const updated = patchTask(
      [task()],
      'task-1',
      { title: '  新标题 ', dueDate: '2026-11-09', dueTime: '09:00' },
      NOW,
    );
    expect(updated[0].title).toBe('新标题');
    expect(updated[0].dueDate).toBe('2026-11-09');
    expect(updated[0].updatedAt).toBe(NOW.toISOString());
  });

  it('marks a task complete and restores it', () => {
    const completed = setCompletedAt([task()], 'task-1', NOW.toISOString(), NOW);
    expect(completed[0].completedAt).toBe(NOW.toISOString());
    const restored = setCompletedAt(completed, 'task-1', null, NOW);
    expect(restored[0].completedAt).toBeNull();
  });
});
