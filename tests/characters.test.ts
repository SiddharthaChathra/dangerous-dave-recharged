import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacter,
  isCharacterId,
  isCharacterUnlocked,
  unlockedCharacters,
} from '../src/game/characters/roster';
import { resolvePlayerTextureKey } from '../src/game/characters/playerTexture';

describe('character roster', () => {
  it('starts everyone on Dave', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('dave');
    expect(getCharacter(undefined).id).toBe('dave');
    expect(getCharacter('nonsense').id).toBe('dave');
  });

  it('validates ids so a corrupt save cannot select a character that does not exist', () => {
    expect(isCharacterId('nova')).toBe(true);
    expect(isCharacterId('ghost')).toBe(false);
    expect(isCharacterId(undefined)).toBe(false);
  });

  it('gates the extra characters behind level completions', () => {
    const none = unlockedCharacters([]);
    expect(none.map((c) => c.id)).toEqual(['dave']);

    const some = unlockedCharacters(['level002', 'level003']);
    expect(some.map((c) => c.id)).toEqual(['dave', 'delta', 'nova']);
  });

  it('treats an unlock as permanent once the level is cleared', () => {
    const rex = CHARACTERS.find((c) => c.id === 'rex')!;
    expect(isCharacterUnlocked(rex, ['level004'])).toBe(true);
    expect(isCharacterUnlocked(rex, ['level001'])).toBe(false);
  });

  it('keeps every character mechanically identical', () => {
    // Characters are a skin. If a stat ever appears here, level difficulty stops being fixed
    // and the validated jump model no longer describes every playthrough.
    for (const character of CHARACTERS) {
      expect(Object.keys(character).sort()).toEqual(
        ['blurb', 'id', 'name', 'texturePrefix', 'unlockAfterLevelId', 'unlockedByDefault'].sort(),
      );
    }
  });
});

describe('resolvePlayerTextureKey', () => {
  const has = (keys: string[]) => (key: string) => keys.includes(key);

  it('uses the character\'s own art when it exists', () => {
    const exists = has(['char_nova_idle', 'player_idle']);
    expect(resolvePlayerTextureKey('idle', 'nova', 'current', exists)).toBe('char_nova_idle');
  });

  it('prefers the classic variant of the character in classic mode', () => {
    const exists = has(['classic__char_nova_run', 'char_nova_run', 'player_run']);
    expect(resolvePlayerTextureKey('run', 'nova', 'classic', exists)).toBe('classic__char_nova_run');
  });

  it('falls back to the character\'s modern art if it has no classic variant', () => {
    const exists = has(['char_nova_run', 'player_run', 'classic__player_run']);
    expect(resolvePlayerTextureKey('run', 'nova', 'classic', exists)).toBe('char_nova_run');
  });

  it('falls back to Dave when the character has no art at all', () => {
    // Lets the roster ship before the sprites do, instead of rendering missing-texture boxes.
    const exists = has(['player_jump', 'classic__player_jump']);
    expect(resolvePlayerTextureKey('jump', 'nova', 'current', exists)).toBe('player_jump');
    expect(resolvePlayerTextureKey('jump', 'nova', 'classic', exists)).toBe('classic__player_jump');
  });

  it('always returns something, even with no textures registered at all', () => {
    expect(resolvePlayerTextureKey('idle', 'nova', 'current', () => false)).toBe('player_idle');
  });
});
