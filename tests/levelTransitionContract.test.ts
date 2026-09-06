import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the corridor's escape hatches at the source level.
 *
 * LevelTransitionScene extends Phaser.Scene, and evaluating the Phaser runtime under
 * Vitest/jsdom crashes probing a real 2D canvas context — the same constraint that forces
 * tests/GameConfig.test.ts to read source. It is worth asserting anyway, because the failure
 * these prevent is the worst one this scene has: the player stuck in a cutscene, mid-campaign,
 * with no way out and no error in the console.
 *
 * These are the three invariants THEME_INTEGRATION.md asks visual work to preserve.
 */
const source = readFileSync(
  resolve(__dirname, '../src/game/scenes/LevelTransitionScene.ts'),
  'utf8',
);

describe('level transition contract', () => {
  it('can be skipped with any key', () => {
    expect(source).toMatch(/this\.input\.keyboard\?\.once\(\s*'keydown'\s*,\s*\(\)\s*=>\s*this\.finish\(\)/);
  });

  it('can be skipped with a pointer', () => {
    // Touch and mouse players have no keyboard to press.
    expect(source).toMatch(/this\.input\.once\(\s*'pointerdown'\s*,\s*\(\)\s*=>\s*this\.finish\(\)/);
  });

  it('keeps a failsafe that ends the scene even if a beat never fires', () => {
    expect(source).toMatch(/this\.failsafe\s*=\s*this\.time\.delayedCall\(\s*beats\.failsafeMs\s*,\s*\(\)\s*=>\s*this\.finish\(\)/);
  });

  it('finishes exactly once, however it got there', () => {
    // Six paths reach finish(); without this guard, a skip during the closing tween would
    // emit transition:finished twice and advance the player two levels.
    expect(source).toMatch(/private finish\(\): void \{\s*\n\s*if \(this\.finished\) return;\s*\n\s*this\.finished = true;/);
  });

  it('always announces that it finished', () => {
    // main.ts advances the campaign on this event. A finish() that returns without emitting
    // leaves the game sitting on a dead scene forever.
    expect(source).toMatch(/gameEvents\.emit\('transition:finished'/);
  });

  it('cancels the failsafe when it finishes', () => {
    expect(source).toMatch(/this\.failsafe\?\.remove\(/);
  });

  it('takes its beats from the shared timeline rather than private constants', () => {
    // The failsafe-is-after-the-end guarantee is proved in corridorLayout.test.ts. That proof
    // is worthless if the scene quietly reintroduces its own numbers.
    expect(source).toMatch(/corridorTimeline\(this\.layout\.walkDistance\)/);
    expect(source).not.toMatch(/const (LEFT_DOOR_OPEN_MS|STEP_OUT_MS|ENTER_MS)\s*=/);
  });
});

describe('level transition composition', () => {
  it('builds two doors, not one', () => {
    // The scene exists to show a passage between two places.
    expect(source).toMatch(/this\.layout\.leftDoorX,/);
    expect(source).toMatch(/this\.layout\.rightDoorX,/);
  });

  it('labels the doors from campaign position rather than hardcoding them', () => {
    expect(source).toMatch(/LEVEL \$\{data\.levelNumber\}/);
    expect(source).toMatch(/LEVEL \$\{data\.levelNumber \+ 1\}/);
  });

  it('walks the character with the articulated rig', () => {
    // A tween straight onto a sprite's x would be the sliding-on-ice look this replaced.
    expect(source).toMatch(/new CorridorWalker\(/);
    expect(source).toMatch(/walker\.setWalking\(true\)/);
  });

  it('drives the gait from the distance actually covered each frame', () => {
    // This is what keeps the feet planted through the walk tween's easing.
    expect(source).toMatch(/Math\.abs\(x - this\.lastWalkerX\) \/ \(delta \/ 1000\)/);
  });
});
