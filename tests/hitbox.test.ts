import { describe, it, expect } from 'vitest';
import { computeHitboxGeometry, type HitboxConfig } from '../src/utils/hitbox';

const CONFIG: HitboxConfig = {
  textureWidth: 72,
  textureHeight: 96,
  hitboxWidth: 20,
  hitboxHeight: 30,
  feetOffsetY: 16,
};

/**
 * Reproduces how Arcade Physics places a body: the body's world rect is derived from the
 * sprite's centre origin, its display size, and the (scaled) offset. Asserting on this is what
 * proves the hitbox is genuinely scale-independent, rather than just that we passed numbers in.
 */
function worldHitbox(spriteX: number, spriteY: number, scaleX: number, scaleY: number) {
  const g = computeHitboxGeometry(scaleX, scaleY, CONFIG);
  const left = spriteX - 0.5 * CONFIG.textureWidth * scaleX + g.offsetX * scaleX;
  const top = spriteY - 0.5 * CONFIG.textureHeight * scaleY + g.offsetY * scaleY;
  return {
    left: Number(left.toFixed(6)),
    top: Number(top.toFixed(6)),
    width: Number((g.sizeWidth * scaleX).toFixed(6)),
    height: Number((g.sizeHeight * scaleY).toFixed(6)),
  };
}

describe('computeHitboxGeometry', () => {
  it('produces the intended hitbox at the base scale', () => {
    const box = worldHitbox(100, 200, 0.333, 0.333);
    expect(box.width).toBeCloseTo(20, 5);
    expect(box.height).toBeCloseTo(30, 5);
  });

  it('keeps the hitbox identical while a squash-and-stretch animation scales the sprite', () => {
    // This is the whole point: cosmetic tweens (and a theme that disables them) must not be
    // able to change collision. Same sprite position, three very different render scales.
    const base = worldHitbox(100, 200, 0.333, 0.333);
    const squashed = worldHitbox(100, 200, 0.333 * 1.3, 0.333 * 0.7);
    const stretched = worldHitbox(100, 200, 0.333 * 0.8, 0.333 * 1.3);

    expect(squashed).toEqual(base);
    expect(stretched).toEqual(base);
  });

  it('keeps the feet planted at the same point regardless of scale', () => {
    // If the bottom edge drifted, the player would appear to sink into or hover above ground
    // as the animation played.
    const bottom = (s: number) => {
      const b = worldHitbox(100, 200, s, s);
      return Number((b.top + b.height).toFixed(6));
    };
    expect(bottom(0.333 * 1.25)).toBe(bottom(0.333));
    expect(bottom(0.333 * 0.75)).toBe(bottom(0.333));
  });

  it('stays horizontally centred on the sprite at any scale', () => {
    const centre = (s: number) => {
      const b = worldHitbox(100, 200, s, s);
      return Number((b.left + b.width / 2).toFixed(6));
    };
    expect(centre(0.5)).toBe(100);
    expect(centre(0.2)).toBe(100);
  });

  it('treats a zero or missing scale as the identity, rather than dividing by zero', () => {
    const g = computeHitboxGeometry(0, 0, CONFIG);
    expect(Number.isFinite(g.sizeWidth)).toBe(true);
    expect(Number.isFinite(g.offsetY)).toBe(true);
  });
});
