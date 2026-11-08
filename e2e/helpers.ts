import type { Page } from '@playwright/test';
import type { Task } from '../src/types';

export function localDay(offset: number, now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    title: '任务',
    dueDate: null,
    dueTime: null,
    reminder: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

interface Seed {
  tasks?: Task[];
  onboarded?: boolean;
}

/**
 * Clears storage, seeds tasks and reloads. The first navigation is only used
 * to obtain an origin for localStorage.
 */
export async function openApp(page: Page, seed: Seed = {}): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ tasks, onboarded }) => {
      localStorage.clear();
      if (tasks) localStorage.setItem('lighttodo.tasks.v1', JSON.stringify(tasks));
      if (onboarded !== false) localStorage.setItem('lighttodo.onboarded.v1', '1');
    },
    { tasks: seed.tasks, onboarded: seed.onboarded ?? true },
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}
