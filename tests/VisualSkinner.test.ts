import { describe, it, expect, beforeEach } from 'vitest';
import { VisualSkinner, classicTextureKey, resolveTextureKey } from '../src/game/systems/VisualSkinner';

describe('resolveTextureKey', () => {
  const existing = new Set(['player_idle', 'classic__player_idle', 'gem']);
  const has = (key: string) => existing.has(key);

  it('uses the base texture in current mode', () => {
    expect(resolveTextureKey('player_idle', 'current', has)).toBe('player_idle');
  });

  it('uses the classic variant in classic mode when one has been registered', () => {
    expect(resolveTextureKey('player_idle', 'classic', has)).toBe('classic__player_idle');
  });

  it('falls back to the base texture when no classic variant exists yet', () => {
    // Lets classic art land incrementally: un-skinned objects keep their current look
    // instead of turning into missing-texture boxes.
    expect(resolveTextureKey('gem', 'classic', has)).toBe('gem');
  });

  it('never double-prefixes an already-classic key', () => {
    expect(resolveTextureKey('classic__player_idle', 'classic', has)).toBe('classic__player_idle');
  });

  it('exposes the naming convention Gemini registers art under', () => {
    expect(classicTextureKey('platform_tile')).toBe('classic__platform_tile');
  });
});

/** Minimal stand-in for a Phaser sprite: only what the skinner is allowed to touch. */
function fakeSprite(texture: string) {
  return {
    texture: { key: texture },
    setTexture(key: string) {
      this.texture.key = key;
      return this;
    },
  };
}

describe('VisualSkinner', () => {
  let registered: Set<string>;
  let skinner: VisualSkinner;

  beforeEach(() => {
    registered = new Set(['player_idle', 'classic__player_idle', 'platform_tile', 'classic__platform_tile', 'gem']);
    skinner = new VisualSkinner((key) => registered.has(key));
  });

  it('re-textures registered objects when the mode changes', () => {
    const player = fakeSprite('player_idle');
    skinner.register(player, 'player_idle');

    skinner.applyMode('classic');
    expect(player.texture.key).toBe('classic__player_idle');

    skinner.applyMode('current');
    expect(player.texture.key).toBe('player_idle');
  });

  it('leaves objects with no classic art untouched', () => {
    const gem = fakeSprite('gem');
    skinner.register(gem, 'gem');
    skinner.applyMode('classic');
    expect(gem.texture.key).toBe('gem');
  });

  it('re-skins every registered object, not just the first', () => {
    const player = fakeSprite('player_idle');
    const tile = fakeSprite('platform_tile');
    skinner.register(player, 'player_idle');
    skinner.register(tile, 'platform_tile');

    skinner.applyMode('classic');

    expect(player.texture.key).toBe('classic__player_idle');
    expect(tile.texture.key).toBe('classic__platform_tile');
  });

  it('tracks the base key, so switching back and forth is stable', () => {
    const tile = fakeSprite('platform_tile');
    skinner.register(tile, 'platform_tile');
    skinner.applyMode('classic');
    skinner.applyMode('current');
    skinner.applyMode('classic');
    expect(tile.texture.key).toBe('classic__platform_tile');
  });

  it('forgets everything on clear, so a restarted level does not re-skin dead sprites', () => {
    const tile = fakeSprite('platform_tile');
    skinner.register(tile, 'platform_tile');
    skinner.clear();
    skinner.applyMode('classic');
    expect(tile.texture.key).toBe('platform_tile');
  });

  it('does not re-apply a texture that is already correct', () => {
    // Phaser TileSprites throw if setTexture re-runs against a not-yet-sized canvas texture,
    // and redundant swaps are wasted work on every object, every switch.
    let setTextureCalls = 0;
    const tile = {
      texture: { key: 'platform_tile' },
      setTexture(key: string) {
        setTextureCalls += 1;
        this.texture.key = key;
        return this;
      },
    };
    skinner.register(tile, 'platform_tile');

    skinner.applyMode('current'); // already in current mode — nothing to do
    expect(setTextureCalls).toBe(0);

    skinner.applyMode('classic');
    expect(setTextureCalls).toBe(1);

    skinner.applyMode('classic'); // same mode again
    expect(setTextureCalls).toBe(1);
  });

  it('keeps skinning the rest of the world when one object refuses its texture', () => {
    // A broken or half-finished skin is a visual problem; it must never take gameplay down.
    const broken = {
      texture: { key: 'platform_tile' },
      setTexture() {
        throw new Error('bad texture source');
      },
    };
    const player = fakeSprite('player_idle');
    skinner.register(broken, 'platform_tile');
    skinner.register(player, 'player_idle');

    expect(() => skinner.applyMode('classic')).not.toThrow();
    expect(player.texture.key).toBe('classic__player_idle');
  });

  it('skins a TileSprite, whose own texture key is an internal generated fill texture', () => {
    // Phaser TileSprites render through a generated fill canvas, so `texture.key` is a UUID and
    // the real source key lives on `displayTexture`. Reading the wrong one silently left every
    // platform in the game un-skinned.
    const tile = {
      texture: { key: 'a4f1c2de-0000-4444-8888-1234567890ab' },
      displayTexture: { key: 'platform_tile' },
      setTexture(key: string) {
        this.displayTexture.key = key;
        return this;
      },
    };
    skinner.register(tile, skinner.baseKeyOf(tile)!);

    skinner.applyMode('classic');
    expect(tile.displayTexture.key).toBe('classic__platform_tile');

    skinner.applyMode('current');
    expect(tile.displayTexture.key).toBe('platform_tile');
  });

  it('reads the base key from displayTexture when present, else texture', () => {
    expect(skinner.baseKeyOf({ texture: { key: 'uuid' }, displayTexture: { key: 'platform_tile' }, setTexture: () => {} })).toBe('platform_tile');
    expect(skinner.baseKeyOf({ texture: { key: 'gem' }, setTexture: () => {} })).toBe('gem');
    expect(skinner.baseKeyOf({ setTexture: () => {} })).toBeNull();
  });

  it('resolves a key for callers that create textures themselves (e.g. the player animator)', () => {
    expect(skinner.keyFor('player_idle', 'classic')).toBe('classic__player_idle');
    expect(skinner.keyFor('gem', 'classic')).toBe('gem');
  });
});

describe('rekey (state-driven art changes)', () => {
  it('re-points an object at new base art and redraws it', () => {
    const registered = new Set(['goal_door', 'goal_door_locked', 'classic__goal_door', 'classic__goal_door_locked']);
    const skinner = new VisualSkinner((k) => registered.has(k));
    const door = {
      texture: { key: 'goal_door_locked' },
      setTexture(key: string) { this.texture.key = key; return this; },
    };
    skinner.register(door, 'goal_door_locked');

    skinner.rekey(door, 'goal_door', 'current');
    expect(door.texture.key).toBe('goal_door');
  });

  it('keeps the new art across a later mode switch', () => {
    // The bug this prevents: an unlocked door redrawn as locked after toggling themes, so the
    // art contradicts what the game will actually let the player do.
    const registered = new Set(['goal_door', 'goal_door_locked', 'classic__goal_door', 'classic__goal_door_locked']);
    const skinner = new VisualSkinner((k) => registered.has(k));
    const door = {
      texture: { key: 'goal_door_locked' },
      setTexture(key: string) { this.texture.key = key; return this; },
    };
    skinner.register(door, 'goal_door_locked');
    skinner.rekey(door, 'goal_door', 'current');

    skinner.applyMode('classic');
    expect(door.texture.key).toBe('classic__goal_door');

    skinner.applyMode('current');
    expect(door.texture.key).toBe('goal_door');
  });
});
