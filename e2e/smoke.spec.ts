import { test, expect } from '@playwright/test';

test('full happy-path: menu -> play -> move -> jump -> pause -> resume -> complete level', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  // The redesigned menu sets the title as a stacked wordmark plus a separate
  // "RECHARGED" line, so match the wordmark rather than the old single string.
  await expect(page.getByText('Dangerous', { exact: false }).first()).toBeVisible();

  // Level cards are also role="button" with "Play <name>" labels, so target the
  // primary action by its data hook rather than by accessible name.
  await page.locator('[data-menu="play"]').click();
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
