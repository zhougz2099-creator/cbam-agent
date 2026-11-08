import { expect, test } from '@playwright/test';
import { makeTask, openApp } from './helpers';

/**
 * Product screenshots for the PR. Run explicitly:
 *   CAPTURE_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts --project=mobile
 */
test.describe('product screenshots', () => {
  test.skip(process.env.CAPTURE_SCREENSHOTS !== '1', 'set CAPTURE_SCREENSHOTS=1 to capture');

  test('captures the reviewed screens', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 8, 8, 0, 0) });
    await page.clock.resume();
    const now = new Date(2026, 10, 8, 8, 0, 0);
    const iso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
    const tasks = [
      makeTask({
        id: 's1',
        title: '提交本周工作周报',
        dueDate: '2026-11-08',
        dueTime: '18:00',
        reminder: '10m',
        createdAt: iso(180),
      }),
      makeTask({
        id: 's2',
        title: '给物业打电话确认门禁卡',
        dueDate: '2026-11-07',
        dueTime: '09:00',
        createdAt: iso(1600),
      }),
      makeTask({
        id: 's3',
        title: '读《设计中的设计》第 3 章',
        dueDate: '2026-11-08',
        dueTime: '21:30',
        reminder: 'ontime',
        createdAt: iso(1200),
      }),
      makeTask({
        id: 's4',
        title: '买牛奶和咖啡豆',
        dueDate: '2026-11-08',
        createdAt: iso(600),
      }),
      makeTask({
        id: 's5',
        title: '预约下周的体检',
        dueDate: '2026-11-09',
        dueTime: '10:00',
        reminder: '1d',
        createdAt: iso(3000),
      }),
      makeTask({ id: 's6', title: '整理桌面和下载文件夹', createdAt: iso(200) }),
      makeTask({
        id: 's7',
        title: '回复产品评审的邮件',
        dueDate: '2026-11-07',
        dueTime: '15:00',
        createdAt: iso(4000),
        completedAt: iso(30),
      }),
      makeTask({
        id: 's8',
        title: '把发票拍照归档',
        dueDate: '2026-11-06',
        createdAt: iso(5000),
        completedAt: iso(1500),
      }),
    ];

    await openApp(page, { tasks });
    await expect(page.getByText('提交本周工作周报')).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'docs/screenshots/after-today.png' });

    await page.getByRole('tab', { name: /全部/ }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'docs/screenshots/after-all.png' });

    await page.getByRole('button', { name: '添加任务' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('标题').fill('预约周五的牙医');
    await createDialog.getByRole('button', { name: '明天', exact: true }).click();
    await createDialog.getByLabel('时间').fill('15:00');
    await createDialog.getByLabel('提醒').selectOption('1h');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/screenshots/after-create.png' });
    await createDialog.getByRole('button', { name: '关闭' }).click();

    await page.locator('.task-open', { hasText: '提交本周工作周报' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/screenshots/after-detail.png' });
    await page.getByRole('button', { name: '关闭' }).click();

    const surface = page.locator('.task-item__surface').first();
    const box = await surface.boundingBox();
    if (!box) throw new Error('task row not found');
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 140, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/screenshots/after-swipe.png' });
    await page.reload();
    await expect(page.getByText('提交本周工作周报')).toBeVisible();

    await page.getByRole('checkbox', { name: /买牛奶和咖啡豆/ }).click();
    await page.waitForTimeout(1100);
    await page.screenshot({ path: 'docs/screenshots/after-complete-toast.png' });
    await page.locator('.toast').getByRole('button', { name: '撤销' }).click();

    await page.getByRole('button', { name: '设置' }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'docs/screenshots/after-settings.png' });
    await page.getByRole('button', { name: '返回' }).click();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: 'docs/screenshots/after-desktop.png' });
  });
});
