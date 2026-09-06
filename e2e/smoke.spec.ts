import { test, expect, type Page } from '@playwright/test';

/** The debug handle main.ts installs unconditionally, so it exists in the production build. */
function gameState(page: Page, expression: string) {
  return page.evaluate(
    (expr) =>
      // eslint-disable-next-line no-new-func
      new Function('game', `return ${expr};`)(
        (window as unknown as { __ddrDebugGame: unknown }).__ddrDebugGame,
      ),
    expression,
  );
}

test('full happy-path: menu -> play -> move -> jump -> pause -> resume -> corridor -> next level', async ({
  page,
}) => {
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

  // Every level starts gated on its key, and the HUD has to say so.
  await expect(page.locator('[data-hud="key"]')).toHaveAttribute('data-key-state', 'required');

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

  await page.evaluate(() =>
    (
      window as unknown as { __ddrTestHooks: { completeLevel: () => void } }
    ).__ddrTestHooks.completeLevel(),
  );

  // Clearing a level no longer opens a modal. The between-levels corridor plays — Dave walks
  // from the door he just came out of to the next level's door — and the next level then loads
  // on its own. The corridor is a cutscene, so the HUD gets out of the way while it runs.
  await expect
    .poll(() => gameState(page, "game.scene.getScene('LevelTransition').scene.isActive()"), {
      timeout: 10_000,
    })
    .toBe(true);
  await expect(page.locator('.hud')).toHaveClass(/hud--hidden/);

  // Skip it with a key press, the way a player replaying a level would.
  //
  // Deliberately not waiting for the corridor to play out. It always finishes — the failsafe is
  // proved to sit behind the end of the choreography in corridorLayout.test.ts — but it finishes
  // after a fixed amount of *scene* time, and headless Chromium's frame rate is unstable and
  // degrades as a run proceeds (measured: 44fps falling to 13fps). Phaser clamps delta, so a low
  // frame rate makes scene time lag wall time by an unbounded factor, and a wait long enough to
  // be safe today is a flaky deploy gate tomorrow. The skip needs exactly one frame, so it is
  // immune to that — and it covers a path real players use constantly.
  await page.keyboard.press('Space');

  await expect
    .poll(() => gameState(page, "game.scene.getScene('Play').level?.id"), { timeout: 15_000 })
    .toBe('level002');
  await expect(page.locator('.hud')).not.toHaveClass(/hud--hidden/);
  // The HUD must name the level that actually loaded, not the sentinel it was started with.
  await expect(page.locator('[data-hud="level-name"]')).toHaveText('Industrial Ruins');
  // A fresh level means a fresh gate.
  await expect(page.locator('[data-hud="key"]')).toHaveAttribute('data-key-state', 'required');

  expect(errors, `Console/page errors: ${errors.join('; ')}`).toEqual([]);
});
