import { describe, it, expect } from 'vitest';
import { walkerPalette } from '../src/game/systems/walkerPalette';
import { CHARACTERS } from '../src/game/characters/roster';

describe('corridor walker palette', () => {
  it('has colours for every character on the roster, in both modes', () => {
    // The corridor draws the character the player actually chose. A character with no palette
    // would walk the corridor as an untinted grey mannequin.
    for (const character of CHARACTERS) {
      for (const mode of ['classic', 'current'] as const) {
        const palette = walkerPalette(character.id, mode);
        expect(Object.values(palette).every((c) => typeof c === 'number'), character.id).toBe(true);
      }
    }
  });

  it('falls back to Dave for an unknown character', () => {
    expect(walkerPalette('nobody', 'classic')).toEqual(walkerPalette('dave', 'classic'));
  });

  it('gives each mode its own look', () => {
    expect(walkerPalette('dave', 'classic')).not.toEqual(walkerPalette('dave', 'current'));
  });
});
