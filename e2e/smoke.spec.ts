import { test, expect } from '@playwright/test';

test('full happy-path: menu -> play -> move -> jump -> pause -> resume -> complete level', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.getByText('Dangerous Dave: Recharged')).toBeVisible();

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('[data-hud="score"]')).toBeVisible();

  // Exercise movement/jump via real keyboard events against the canvas.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(200);

  await page.getByLabel('Pause game').click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeHidden();

  await page.evaluate(() => (window as unknown as { __ddrTestHooks: { completeLevel: () => void } }).__ddrTestHooks.completeLevel());
  await expect(page.getByText(/Level Complete/i)).toBeVisible();

  expect(errors, `Console/page errors: ${errors.join('; ')}`).toEqual([]);
});
