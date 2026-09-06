import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PHYSICS } from '../src/game/core/constants';

/**
 * Guards the scale mode at the source level.
 *
 * GameConfig imports Phaser as a *value*, and evaluating the Phaser runtime under Vitest/jsdom
 * crashes probing a real 2D canvas context (the same constraint documented in
 * InputController.ts). Reading the source is therefore the only way to assert this in the unit
 * suite — and it is worth asserting, because the failure it prevents is silent: swapping to
 * RESIZE breaks nothing visible, it just quietly hands bigger screens an easier game.
 */
const source = readFileSync(resolve(__dirname, '../src/game/core/GameConfig.ts'), 'utf8');

describe('game scale configuration', () => {
  it('uses FIT so every player sees exactly the same amount of the world', () => {
    // RESIZE ties the camera's world view to the browser window: a 1920px-wide window shows
    // roughly twice as much level as a 1024px one, so that player sees hazards and enemies
    // sooner. Difficulty must not depend on hardware, and the level validator's reachability
    // guarantees are computed against this fixed camera.
    expect(source).toMatch(/mode:\s*Phaser\.Scale\.FIT/);
  });

  it('does not use RESIZE or ENVELOP', () => {
    // ENVELOP is rejected for the mirror-image reason: it crops, which can hide a hazard.
    expect(source).not.toMatch(/mode:\s*Phaser\.Scale\.RESIZE/);
    expect(source).not.toMatch(/mode:\s*Phaser\.Scale\.ENVELOP/);
  });

  it('renders at the fixed design resolution the levels were validated against', () => {
    expect(source).toMatch(/width:\s*SCREEN\.WIDTH/);
    expect(source).toMatch(/height:\s*SCREEN\.HEIGHT/);
  });

  it('caps the engine frame delta at the same bound the game logic uses', () => {
    // PlayScene clamps its own delta to PHYSICS.MAX_DELTA_MS, but that clamp never reaches
    // Arcade Physics, which steps on the loop's delta. Without an engine-level cap, a low
    // frame rate makes each physics step move the player further than separation can resolve:
    // measured at ~7fps the player lands on a platform and then sinks straight through it,
    // falls out of the world and loses a life having done nothing wrong.
    //
    // fps.min caps the delta at 1000/min, so this ties the engine bound to the declared one.
    const match = source.match(/min:\s*(\d+)/);
    expect(match, 'GameConfig must declare fps.min').not.toBeNull();
    const cappedDeltaMs = 1000 / Number(match![1]);
    expect(cappedDeltaMs).toBeLessThanOrEqual(PHYSICS.MAX_DELTA_MS);
  });
});
