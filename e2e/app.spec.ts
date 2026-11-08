import { expect, test } from '@playwright/test';
import { localDay, makeTask, openApp } from './helpers';

test.describe('onboarding', () => {
  test('explains local-only storage once', async ({ page }) => {
    await openApp(page, { onboarded: false });
    await expect(page.getByRole('heading', { name: '3 秒记下一件事' })).toBeVisible();
    await expect(page.getByText(/任务只保存在这台设备上/)).toBeVisible();
    await page.getByRole('button', { name: '开始使用' }).click();
    await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '3 秒记下一件事' })).toHaveCount(0);
  });
});

test.describe('task creation', () => {
  test('creates a dated task, shows a toast and persists it', async ({ page }) => {
    await openApp(page);
    await expect(page.getByText('今天还没有任务')).toBeVisible();

    await page.getByRole('button', { name: '添加任务' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: '添加任务' })).toBeDisabled();

    await dialog.getByLabel('标题').fill('提交周报');
    await dialog.getByRole('button', { name: '今天', exact: true }).click();
    await dialog.getByLabel('时间').fill('18:00');
    await dialog.getByLabel('提醒').selectOption('10m');
    await dialog.getByRole('button', { name: '添加任务' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('已添加');
    await expect(page.getByText('提交周报')).toBeVisible();
    await expect(page.getByText('今天 18:00')).toBeVisible();
    await expect(page.getByText('提前 10 分钟')).toBeVisible();

    await page.reload();
    await expect(page.getByText('提交周报')).toBeVisible();
  });

  test('undo removes the newly added task', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '添加任务' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('标题').fill('随手记一件事');
    await dialog.getByRole('button', { name: '添加任务' }).click();
    await expect(page.getByText('随手记一件事')).toBeVisible();
    await page.locator('.toast').getByRole('button', { name: '撤销' }).click();
    await expect(page.getByText('随手记一件事')).toHaveCount(0);
    await expect(page.getByText('还没有待办')).toBeVisible();
  });

  test('blocks empty or over-long titles with a red hint', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '添加任务' }).click();
    const dialog = page.getByRole('dialog');
    const submit = dialog.getByRole('button', { name: '添加任务' });
    const title = dialog.getByLabel('标题');

    await expect(submit).toBeDisabled();
    await title.fill('a'.repeat(101));
    await expect(dialog.getByText(/标题最多 100 字，当前 101 字/)).toBeVisible();
    await expect(dialog.getByText('101/100')).toBeVisible();
    await expect(submit).toBeDisabled();

    await title.fill('');
    await title.blur();
    await expect(dialog.getByText('请输入任务标题')).toBeVisible();
    await expect(submit).toBeDisabled();

    await title.fill('一件小事');
    await expect(submit).toBeEnabled();
  });

  test('switches to 全部 when an undated task would be invisible in 今天', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '添加任务' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('标题').fill('没有日期的任务');
    await dialog.getByRole('button', { name: '添加任务' }).click();
    await expect(page.getByRole('tab', { name: /全部/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('没有日期的任务')).toBeVisible();
  });
});

test.describe('completion', () => {
  test('animates, moves to 已完成 and can be undone', async ({ page }) => {
    const title = '整理桌面';
    await openApp(page, {
      tasks: [makeTask({ id: 'a', title, dueDate: localDay(0) })],
    });

    await page.getByRole('checkbox', { name: `标记为完成：${title}` }).click();
    await expect(page.locator('.toast')).toContainText('已完成', { timeout: 3000 });
    await expect(page.getByText(title)).toHaveCount(0);

    await page.getByRole('tab', { name: /已完成/ }).click();
    await expect(page.getByText(title)).toBeVisible();

    await page.locator('.toast').getByRole('button', { name: '撤销' }).click();
    await page.getByRole('tab', { name: /今天/ }).click();
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByRole('checkbox', { name: `标记为完成：${title}` })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});

test.describe('deletion', () => {
  test('deletes from the detail sheet and restores it within five seconds', async ({ page }) => {
    const title = '买牛奶';
    await openApp(page, { tasks: [makeTask({ id: 'b', title, dueDate: localDay(0) })] });
    await page.locator('.task-open', { hasText: title }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '删除任务', exact: true }).click();
    await expect(page.getByText('今天还没有任务')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('已删除');
    await page.locator('.toast').getByRole('button', { name: '撤销' }).click();
    await expect(page.getByText(title)).toBeVisible();
  });

  test('reveals delete by swiping left and deletes', async ({ page }) => {
    const title = '倒垃圾';
    await openApp(page, { tasks: [makeTask({ id: 'c', title, dueDate: localDay(0) })] });
    const surface = page.locator('.task-item__surface');
    const box = await surface.boundingBox();
    if (!box) throw new Error('task row not found');

    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 150, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect
      .poll(async () => surface.evaluate((node) => getComputedStyle(node).transform))
      .toContain('-92');
    await page.getByRole('button', { name: `删除任务：${title}` }).click();
    await expect(page.getByText('今天还没有任务')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('已删除');
  });
});

test.describe('editing', () => {
  test('auto-saves title changes', async ({ page }) => {
    await openApp(page, {
      tasks: [
        makeTask({
          id: 'd',
          title: '旧标题',
          dueDate: localDay(0),
          dueTime: '18:00',
        }),
      ],
    });
    await page.locator('.task-open', { hasText: '旧标题' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('标题').fill('新的标题');
    await expect(dialog.getByText('已保存')).toBeVisible({ timeout: 2000 });
    await page.getByRole('button', { name: '关闭' }).click();
    await page.reload();
    await expect(page.getByText('新的标题')).toBeVisible();
    await expect(page.getByText('旧标题')).toHaveCount(0);
  });
});

test.describe('views', () => {
  test('filters and sorts 今天 / 全部 / 已完成', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 8, 14, 30, 0) });
    await page.clock.resume();
    await openApp(page, {
      tasks: [
        makeTask({ id: 'overdue', title: '逾期任务', dueDate: '2026-11-07', dueTime: '09:00' }),
        makeTask({ id: 'today', title: '今天傍晚', dueDate: '2026-11-08', dueTime: '18:00' }),
        makeTask({ id: 'allday', title: '今天无时间', dueDate: '2026-11-08' }),
        makeTask({ id: 'tomorrow', title: '明天的事', dueDate: '2026-11-09', dueTime: '10:00' }),
        makeTask({ id: 'undated', title: '没有日期' }),
        makeTask({
          id: 'done',
          title: '已经完成',
          dueDate: '2026-11-08',
          completedAt: '2026-11-08T06:00:00.000Z',
        }),
      ],
    });

    const titles = page.locator('.task-title');
    await expect(titles).toHaveText(['逾期任务', '今天傍晚', '今天无时间']);
    await expect(page.getByText('1 件已逾期')).toBeVisible();

    await page.getByRole('tab', { name: /全部/ }).click();
    await expect(titles).toHaveText(['逾期任务', '今天傍晚', '今天无时间', '明天的事', '没有日期']);

    await page.getByRole('tab', { name: /已完成/ }).click();
    await expect(titles).toHaveText(['已经完成']);
  });

  test('shows a fitting empty state for each view', async ({ page }) => {
    await openApp(page);
    await expect(page.getByText('今天还没有任务')).toBeVisible();
    await page.getByRole('tab', { name: /全部/ }).click();
    await expect(page.getByText('还没有待办')).toBeVisible();
    await page.getByRole('tab', { name: /已完成/ }).click();
    await expect(page.getByText('还没有完成的任务')).toBeVisible();
  });
});

test.describe('settings', () => {
  test('toggles reminders, explains notification permission and shows privacy', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: '设置' }).click();
    const toggle = page.getByRole('switch', { name: '提醒总开关' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.reload();
    await page.getByRole('button', { name: '设置' }).click();
    await expect(page.getByRole('switch', { name: '提醒总开关' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await expect(page.locator('.setting-row__title', { hasText: '通知权限' })).toBeVisible();
    await page.getByText('隐私政策').click();
    await expect(page.getByText('本应用不收集、不上传任何个人信息。')).toBeVisible();
    await page.getByRole('button', { name: '返回' }).click();
    await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible();
  });

  test('shows a dismissible banner when notification permission is denied', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
    });
    await openApp(page);
    await expect(page.getByText('通知权限未开启，到点提醒可能收不到。')).toBeVisible();
    await page.getByRole('button', { name: '关闭通知引导' }).click();
    await expect(page.getByText('通知权限未开启，到点提醒可能收不到。')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('通知权限未开启，到点提醒可能收不到。')).toHaveCount(0);
  });
});

test.describe('reminders', () => {
  test('fires an in-app reminder at the chosen offset', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 8, 9, 0, 0) });
    await openApp(page, {
      tasks: [
        makeTask({
          id: 'r',
          title: '喝水',
          dueDate: '2026-11-08',
          dueTime: '09:11',
          reminder: '10m',
        }),
      ],
    });
    await expect(page.locator('.reminder-bar')).toHaveCount(0);
    await page.clock.fastForward('02:00');
    await expect(page.locator('.reminder-bar')).toContainText('喝水');
    await page.getByRole('button', { name: '查看' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('标题')).toHaveValue('喝水');
  });

  test('fires reminders more than a week away', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 8, 9, 0, 0) });
    await openApp(page, {
      tasks: [
        makeTask({
          id: 'far',
          title: '续签护照',
          dueDate: '2026-11-17',
          dueTime: '09:00',
          reminder: 'ontime',
        }),
      ],
    });
    await page.clock.fastForward(9 * 24 * 60 * 60 * 1000 + 60_000);
    await expect(page.locator('.reminder-bar')).toContainText('续签护照');
  });

  test('catches up a missed reminder once after reopening', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 8, 9, 55, 0) });
    await openApp(page, {
      tasks: [
        makeTask({
          id: 'missed',
          title: '交水电费',
          dueDate: '2026-11-08',
          dueTime: '10:00',
          reminder: '10m',
        }),
      ],
    });
    await expect(page.locator('.reminder-bar')).toContainText('交水电费');
    await page.reload();
    await expect(page.locator('.reminder-bar')).toHaveCount(0);
  });
});


test.describe('offline', () => {
  test('remains usable after a first visit with no second online load', async ({ page, context }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lighttodo.onboarded.v1', '1');
      localStorage.setItem('lighttodo.tasks.v1', '[]');
    });
    await page.goto('/');
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => true),
    );
    await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: '今天', exact: true })).toBeVisible();
    await expect(page.getByText('今天还没有任务')).toBeVisible();
    await context.setOffline(false);
  });
});
