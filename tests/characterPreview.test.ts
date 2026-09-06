import { describe, it, expect, beforeEach } from 'vitest';
import { registerPreviewTextureSource, getCharacterPreviewImage } from '../src/game/characters/preview';

function fakeTextures(keys: Record<string, HTMLCanvasElement | string>) {
  return {
    exists: (key: string) => key in keys,
    get: (key: string) => (key in keys ? { getSourceImage: () => keys[key] } : undefined),
  };
}

const canvasFor = () => document.createElement('canvas');

describe('getCharacterPreviewImage', () => {
  beforeEach(() => {
    registerPreviewTextureSource(fakeTextures({}));
  });

  it('returns the character\'s own art when it exists', () => {
    const art = canvasFor();
    registerPreviewTextureSource(fakeTextures({ char_nova_idle: art, player_idle: canvasFor() }));
    expect(getCharacterPreviewImage('nova', 'idle', 'current')).toBe(art);
  });

  it('follows the same fallback the in-game player uses, so the preview never lies', () => {
    const dave = canvasFor();
    registerPreviewTextureSource(fakeTextures({ player_idle: dave }));
    expect(getCharacterPreviewImage('nova', 'idle', 'current')).toBe(dave);
  });

  it('honours the visual mode', () => {
    const classic = canvasFor();
    registerPreviewTextureSource(
      fakeTextures({ classic__char_rex_run: classic, char_rex_run: canvasFor(), player_run: canvasFor() }),
    );
    expect(getCharacterPreviewImage('rex', 'run', 'classic')).toBe(classic);
  });

  it('returns null before the game has booted, rather than throwing', () => {
    // UI may mount before Phaser finishes starting; a preview must degrade, not crash.
    registerPreviewTextureSource(fakeTextures({}));
    expect(getCharacterPreviewImage('dave', 'idle', 'current')).toBeNull();
  });

  it('rejects a non-drawable source instead of handing it to canvas', () => {
    registerPreviewTextureSource(fakeTextures({ player_idle: 'not-an-image' }));
    expect(getCharacterPreviewImage('dave', 'idle', 'current')).toBeNull();
  });
});
