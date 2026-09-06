import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards that every kind of world object is registered for re-skinning.
 *
 * Read at the source level because PlayScene imports Phaser as a value, which crashes under
 * Vitest/jsdom — the same constraint as tests/GameConfig.test.ts.
 *
 * This is worth pinning because the failure mode is quiet and specific: a mid-level visual-mode
 * switch re-skins everything *except* the one object nobody remembered to register, which then
 * sits there in the other mode's art. It has already happened twice — once to every platform in
 * the game, and once to the level key.
 */
const source = readFileSync(resolve(__dirname, '../src/game/scenes/PlayScene.ts'), 'utf8');

const registered = [
  ['platforms', /for \(const tile of staticGroup\.getChildren\(\)\) registerSprite\(tile\)/],
  ['moving platforms', /for \(const mp of this\.movingPlatforms\) registerSprite\(mp\.sprite\)/],
  ['falling platforms', /for \(const fp of this\.fallingPlatforms\) registerSprite\(fp\.sprite\)/],
  ['hazards', /for \(const hazard of this\.hazards\) registerSprite\(hazard\.sprite\)/],
  ['enemies', /for \(const enemy of this\.enemies\) registerSprite\(enemy\.sprite\)/],
  ['collectibles', /for \(const collectible of this\.collectibles\) registerSprite\(collectible\.sprite\)/],
  ['weapon pickups', /for \(const pickup of this\.weaponPickups\) registerSprite\(pickup\.sprite\)/],
  ['the exit door', /registerSprite\(this\.goalZone\)/],
  ['the level key', /registerSprite\(this\.levelKey\.sprite\)/],
] as const;

describe('visual-mode re-skinning coverage', () => {
  for (const [what, pattern] of registered) {
    it(`registers ${what}`, () => {
      expect(source).toMatch(pattern);
    });
  }

  it('re-applies the skin whenever the mode changes', () => {
    expect(source).toMatch(/gameEvents\.on\('visual-mode:changed'/);
    expect(source).toMatch(/this\.skinner\.applyMode\(mode\)/);
  });

  it('applies the current mode as soon as the level is built', () => {
    // A level entered while classic mode is already on must start skinned, not skin itself
    // only after the player happens to toggle.
    expect(source).toMatch(/this\.skinner\.applyMode\(getVisualMode\(\)\)/);
  });
});
